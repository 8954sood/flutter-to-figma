// resources/figma_exporter_inject.dart

import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_svg/flutter_svg.dart' show SvgPicture;

/// =======================================================
/// 0. 유틸 & 전역 상태
/// =======================================================

String? _colorToHex(Color? color) {
  if (color == null) return null;
  return '#${color.value.toRadixString(16).padLeft(8, '0')}';
}

class DesignInfo {
  final Color? backgroundColor;
  final Color? borderColor;
  final double? borderWidth;
  final double? borderRadius;
  final double? elevation;
  final bool isTextField;
  final bool isDivider;

  DesignInfo({
    this.backgroundColor,
    this.borderColor,
    this.borderWidth,
    this.borderRadius,
    this.elevation,
    this.isTextField = false,
    this.isDivider = false,
  });
}

/// RenderObject 기준 디자인 정보 (TextField, Divider, Container 등)
final Map<RenderObject, DesignInfo> _designInfoByRenderObject = {};

/// SvgPicture → “컬러 박스”로 만들 대상 RenderObject 집합
final Set<RenderObject> _svgBoxTargets = {};

/// =======================================================
/// 1. Element 트리 순회해서 위젯 레벨 디자인 정보 수집
/// =======================================================

void _collectDesignInfoFromElements(Element element) {
  final widget = element.widget;

  // 1) TextField 내부 InputDecorator (OutlineInputBorder, fillColor 등)
  if (widget is InputDecorator) {
    final InputDecoration deco = widget.decoration;
    Color? bg;
    Color? borderColor;
    double? borderWidth;
    double? radius;

    if (deco.filled == true) {
      bg = deco.fillColor;
    }

    final InputBorder? border =
        deco.enabledBorder ?? deco.focusedBorder ?? deco.border;

    if (border is OutlineInputBorder) {
      final side = border.borderSide;
      borderColor = side.color;
      borderWidth = side.width;

      final br = border.borderRadius;
      if (br is BorderRadius) {
        radius = br.topLeft.x;
      }
    }

    final ro = element.renderObject;
    if (ro != null && (bg != null || borderColor != null || radius != null)) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: bg,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderRadius: radius,
        isTextField: true,
      );
    }
  }

  // 2) Divider (색상)
  if (widget is Divider) {
    final ro = element.renderObject;
    if (ro != null && widget.color != null) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: widget.color,
        isDivider: true,
      );
    }
  }

  // 3) Container (BoxDecoration)
  if (widget is Container) {
    final deco = widget.decoration;
    Color? bg;
    Color? borderColor;
    double? borderWidth;
    double? radius;

    if (deco is BoxDecoration) {
      bg = deco.color;
      final border = deco.border;
      if (border is Border) {
        final side = border.top;
        borderColor = side.color;
        borderWidth = side.width;
      }
      final br = deco.borderRadius;
      if (br is BorderRadius) {
        radius = br.topLeft.x;
      }
    }

    final ro = element.renderObject;
    if (ro != null && (bg != null || borderColor != null)) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: bg,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderRadius: radius,
      );
    }
  }

  // 4) SvgPicture.asset → 위치에 컬러 박스를 만들 대상 표시
  if (widget is SvgPicture) {
    final ro = element.renderObject;
    if (ro != null) {
      _svgBoxTargets.add(ro);
    }
  }

  element.visitChildren(_collectDesignInfoFromElements);
}

/// =======================================================
/// 2. Render 트리 크롤러
/// =======================================================

Map<String, dynamic>? _crawl(RenderObject? node) {
  // 화면에 보이지 않거나 크기가 없는 노드 제외
  if (node == null || node is! RenderBox || !node.hasSize) return null;
  if (node.size.width == 0 && node.size.height == 0) return null;

  // ✨ 숨겨진 화면(Offstage) 필터링
  if (node is RenderOffstage && node.offstage) {
    return null;
  }

  // A. 화면 절대 좌표 계산
  Offset offset;
  try {
    offset = node.localToGlobal(Offset.zero);
  } catch (_) {
    return null;
  }

  // B. 타입 및 속성 분석
  String type = 'Frame'; // 기본값
  final Map<String, dynamic> props = {};
  bool hasVisualProperty = false; // 눈에 보이는 요소(색상, 글자, 그림)가 있는지 여부
  bool isLayoutNode = false; // Row, Column 등 구조적인 역할을 하는지 여부

  final String runtimeTypeStr = node.runtimeType.toString();
  final bool isSvgBoxTarget = _svgBoxTargets.contains(node);

  // 배경 이미지용 임시 변수 (BoxDecoration.image → synthetic Image child)
  String? backgroundImagePath;
  String? backgroundImageFit;

  // ---------------------------------------------------
  // [0] SvgPicture 위치용 컬러 박스
  // ---------------------------------------------------
  if (isSvgBoxTarget) {
    type = 'Frame';
    hasVisualProperty = true;
    props['backgroundColor'] = '#ffdddddd'; // SVG placeholder 색
    props['isSvgBox'] = true;
  }

  // ---------------------------------------------------
  // [1] Text / Icon
  // ---------------------------------------------------
  else if (node is RenderParagraph) {
    TextStyle? style;
    InlineSpan inlineSpan = node.text;
    if (inlineSpan is TextSpan) {
      style = inlineSpan.style;
    }

    final String? fontFamily = style?.fontFamily;

    // 1-A) MaterialIcons → 텍스트 대신 컬러 박스 처리
    if (fontFamily != null && fontFamily.contains('MaterialIcons')) {
      type = 'Frame';
      hasVisualProperty = true;

      final Color color = style?.color ?? const Color(0xFF000000);
      props['backgroundColor'] = _colorToHex(color);
      props['isIconBox'] = true;
      props['iconFontFamily'] = fontFamily;
      props['iconGlyph'] = node.text.toPlainText();
    }
    // 1-B) 일반 텍스트
    else {
      type = 'Text';
      hasVisualProperty = true;
      try {
        props['content'] = node.text.toPlainText();
        props['textAlign'] = node.textAlign.toString();

        if (style != null) {
          props['fontFamily'] = style.fontFamily;
          props['fontSize'] = style.fontSize;
          props['fontWeight'] = style.fontWeight.toString();
          props['color'] = _colorToHex(style.color);
          props['letterSpacing'] = style.letterSpacing;
        }
      } catch (_) {}
    }
  }

  // ---------------------------------------------------
  // [2] Image (PNG 등)
  // ---------------------------------------------------
  else if (node is RenderImage) {
    type = 'Image';
    hasVisualProperty = true;

    try {
      props['imagePath'] = node.debugImageLabel; // 디버그에서만 유효
      props['fit'] = 'cover';
    } catch (_) {}
  }

  // ---------------------------------------------------
  // [3] Flex (Row / Column)
  // ---------------------------------------------------
  else if (node is RenderFlex) {
    type = 'Frame';
    isLayoutNode = true;

    props['layoutMode'] =
        node.direction == Axis.horizontal ? 'HORIZONTAL' : 'VERTICAL';
    props['mainAxisAlignment'] = node.mainAxisAlignment.toString();
    props['crossAxisAlignment'] = node.crossAxisAlignment.toString();
  }

  // ---------------------------------------------------
  // [4] DecoratedBox (Container, 일부 Divider + 배경 이미지)
  // ---------------------------------------------------
  else if (node is RenderDecoratedBox) {
    type = 'Frame';

    try {
      final decoration = node.decoration;
      if (decoration is BoxDecoration) {
        // 배경색
        if (decoration.color != null) {
          props['backgroundColor'] = _colorToHex(decoration.color);
          hasVisualProperty = true;
        }

        // ✅ 배경 이미지 (DecorationImage → synthetic Image child)
        if (decoration.image != null) {
          final DecorationImage decorationImage = decoration.image!;
          final ImageProvider provider = decorationImage.image;
          if (provider is AssetImage) {
            backgroundImagePath = provider.assetName; // 예: assets/images/main_island_big.png
            backgroundImageFit = decorationImage.fit?.toString();
            hasVisualProperty = true; // 시각적 요소 있으니 flatten 금지
          }
        }

        // 테두리
        if (decoration.border != null) {
          final border = decoration.border;
          if (border is Border) {
            final sides = [
              border.top,
              border.right,
              border.bottom,
              border.left,
            ];
            BorderSide? bestSide;
            for (final side in sides) {
              if (side.width > 0) {
                bestSide = side;
                break;
              }
            }
            if (bestSide != null) {
              props['hasBorder'] = true;
              props['borderWidth'] = bestSide.width;
              props['borderColor'] = _colorToHex(bestSide.color);
              hasVisualProperty = true;
            }
          } else {
            props['hasBorder'] = true;
            hasVisualProperty = true;
          }
        }

        if (decoration.borderRadius != null) {
          props['borderRadius'] = decoration.borderRadius.toString();
        }

        if (decoration.boxShadow != null &&
            decoration.boxShadow!.isNotEmpty) {
          props['hasShadow'] = true;
          hasVisualProperty = true;
        }
      }
    } catch (_) {}
  }

  // ---------------------------------------------------
  // [5] PhysicalModel (Material/Card, 버튼 등)
  // ---------------------------------------------------
  else if (node is RenderPhysicalModel) {
    type = 'Frame';
    hasVisualProperty = true;

    props['backgroundColor'] = _colorToHex(node.color);
    if (node.elevation > 0) {
      props['hasShadow'] = true;
      props['elevation'] = node.elevation;
    }

    try {
      dynamic d = node;
      if (d.borderRadius != null) {
        props['borderRadius'] = d.borderRadius.toString();
      }
    } catch (_) {}
  }

  // ---------------------------------------------------
  // [6] PhysicalShape (일부 ElevatedButton 등)
  // ---------------------------------------------------
  else if (node is RenderPhysicalShape) {
    type = 'Frame';
    hasVisualProperty = true;

    props['backgroundColor'] = _colorToHex(node.color);
    if (node.elevation > 0) {
      props['hasShadow'] = true;
      props['elevation'] = node.elevation;
    }

    try {
      final diagnostics = node.toDiagnosticsNode();
      final properties = diagnostics.getProperties();
      final clipperProp = properties.firstWhere(
        (p) => p.name == 'clipper',
        orElse: () => DiagnosticsProperty('dummy', null),
      );

      if (clipperProp.value != null) {
        dynamic clipper = clipperProp.value;
        dynamic shape = clipper.shape;
        final shapeStr = shape.toString();

        final reg = RegExp(r'circular\(([\d\.]+)\)');
        final m = reg.firstMatch(shapeStr);
        if (m != null) {
          props['borderRadius'] = m.group(1);
        } else {
          props['isCustomShape'] = true;
        }
      } else {
        props['isCustomShape'] = true;
      }
    } catch (_) {
      props['isCustomShape'] = true;
    }
  }

  // ---------------------------------------------------
  // [7] Picture / CustomPaint (기타 벡터 후보)
  //     (SvgPicture 는 [0]에서 이미 박스로 처리)
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('Picture') ||
      runtimeTypeStr.contains('CustomPaint')) {
    type = 'Frame';
    props['isVectorCandidate'] = true;
    // 시각적 속성은 여기서 강하게 넣지 않고, 구조 플래그만 남김
    hasVisualProperty = false;
  }

  // ---------------------------------------------------
  // [8] 위젯 기반 DesignInfo 덮어쓰기 (TextField, Divider, Container 등)
  // ---------------------------------------------------
  final designInfo = _designInfoByRenderObject[node];
  if (designInfo != null) {
    if (designInfo.backgroundColor != null) {
      props['backgroundColor'] = _colorToHex(designInfo.backgroundColor);
      hasVisualProperty = true;
    }
    if (designInfo.borderColor != null) {
      props['borderColor'] = _colorToHex(designInfo.borderColor);
      props['hasBorder'] = true;
      if (designInfo.borderWidth != null) {
        props['borderWidth'] = designInfo.borderWidth;
      }
      hasVisualProperty = true;
    }
    if (designInfo.borderRadius != null) {
      props['borderRadius'] = designInfo.borderRadius.toString();
    }
    if (designInfo.elevation != null) {
      props['elevation'] = designInfo.elevation;
      if (designInfo.elevation! > 0) {
        props['hasShadow'] = true;
      }
    }
    if (designInfo.isTextField) {
      props['isTextField'] = true;
    }
    if (designInfo.isDivider) {
      props['isDivider'] = true;
    }
  }

  // ---------------------------------------------------
  // [9] 자식 순회
  // ---------------------------------------------------
  final List<Map<String, dynamic>> children = [];
  try {
    node.visitChildren((child) {
      final c = _crawl(child);
      if (c != null) children.add(c);
    });
  } catch (_) {}

  // ---------------------------------------------------
  // [9.5] 배경 이미지를 synthetic Image child로 추가
  // ---------------------------------------------------
  if (backgroundImagePath != null) {
    final bgChild = <String, dynamic>{
      'type': 'Image',
      'rect': {
        'x': offset.dx,
        'y': offset.dy,
        'w': node.size.width,
        'h': node.size.height,
      },
      'properties': <String, dynamic>{
        'imagePath': backgroundImagePath,
        'fit': backgroundImageFit ?? 'BoxFit.cover',
        'isBackgroundImage': true,
      },
      'children': <Map<String, dynamic>>[],
    };

    // 항상 가장 뒤쪽 레이어가 되도록 앞에 삽입 (index 0)
    children.insert(0, bgChild);
  }

  // ============================================================
  // 🔥 [Smart Flattening] 불필요한 껍데기 제거
  // ============================================================
  if (type == 'Frame' &&
      !hasVisualProperty &&
      !isLayoutNode &&
      children.length == 1) {
    return children.first;
  }

  if (children.isEmpty &&
      !hasVisualProperty &&
      (node.size.width < 1 && node.size.height < 1)) {
    return null;
  }

  // ---------------------------------------------------
  // [11] 최종 노드 반환
  // ---------------------------------------------------
  return {
    'type': type,
    'rect': {
      'x': offset.dx,
      'y': offset.dy,
      'w': node.size.width,
      'h': node.size.height,
    },
    'properties': props,
    'children': children,
  };
}

/// =======================================================
/// 2.5. 겹친 화면 제거 함수 (후처리 필터링)
/// =======================================================
/// 화면 전체를 덮는 풀스크린 프레임이 여러 개 겹쳐 있으면, 맨 마지막(가장 위에 그려진) 것만 남김
List<Map<String, dynamic>> _filterOverlappingScreens(
    List<Map<String, dynamic>> items, ui.Size screenSize) {
  if (items.isEmpty) return items;

  // 화면 크기와 거의 일치하는(80% 이상) "풀스크린 프레임"들만 따로 모음
  List<int> fullScreenIndices = [];

  for (int i = 0; i < items.length; i++) {
    final item = items[i];
    final rect = item['rect'];
    if (rect != null) {
      double w = (rect['w'] as num?)?.toDouble() ?? 0.0;
      double h = (rect['h'] as num?)?.toDouble() ?? 0.0;

      if (w >= screenSize.width * 0.8 &&
          h >= screenSize.height * 0.8) {
        fullScreenIndices.add(i);
      }
    }
  }

  // 풀스크린 요소가 2개 이상이라면? (화면이 겹쳐있다는 뜻)
  if (fullScreenIndices.length > 1) {
    // 맨 마지막(가장 위에 그려진) 풀스크린 요소의 인덱스
    int topMostIndex = fullScreenIndices.last;

    List<Map<String, dynamic>> result = [];
    for (int i = 0; i < items.length; i++) {
      // 풀스크린인데 맨 위의 것이 아니라면 -> 버림 (이전 화면임)
      if (fullScreenIndices.contains(i) && i != topMostIndex) {
        continue;
      }
      result.add(items[i]);
    }
    return result;
  } else {
    // 겹친 게 없으면 그대로 반환
    return items;
  }
}

/// =======================================================
/// 3. 외부 진입점
/// =======================================================

String figmaExtractorEntryPoint() {
  try {
    _designInfoByRenderObject.clear();
    _svgBoxTargets.clear();

    // 1) Element 트리에서 위젯 레벨 디자인 정보 수집
    final rootElement = WidgetsBinding.instance.renderViewElement;
    if (rootElement != null) {
      rootElement.visitChildren(_collectDesignInfoFromElements);
    }

    // 2) Render 트리 크롤링
    final root = RendererBinding.instance.renderView;
    final List<Map<String, dynamic>> rootChildren = [];
    root.visitChildren((child) {
      final res = _crawl(child);
      if (res != null) rootChildren.add(res);
    });

    double maxWidth = 0.0;
    double maxHeight = 0.0;
    try {
      maxWidth = root.size.width;
      maxHeight = root.size.height;
    } catch (_) {}

    final ui.Size screenSize = ui.Size(
      maxWidth > 0 ? maxWidth : 390.0,
      maxHeight > 0 ? maxHeight : 844.0,
    );

    // ✨ 겹친 화면 필터링 (Ghost Screens 제거)
    final filteredChildren =
        _filterOverlappingScreens(rootChildren, screenSize);

    final data = {
      'type': 'Frame',
      'name': 'Flutter Screen',
      'rect': {
        'x': 0.0,
        'y': 0.0,
        'w': screenSize.width,
        'h': screenSize.height,
      },
      // 루트 배경: 흰색 기본값
      'properties': {
        'backgroundColor': '#ffffffff',
      },
      'children': filteredChildren,
    };

    return jsonEncode(data);
  } catch (e, st) {
    return jsonEncode({
      'error': e.toString(),
      'stackTrace': st.toString(),
    });
  }
}
