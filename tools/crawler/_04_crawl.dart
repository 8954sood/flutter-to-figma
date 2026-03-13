/// =======================================================
/// 3. Render 트리 크롤러 (Schema v2)
/// =======================================================

/// SliverPadding에서 패딩을 추출하여 containerLayout에 저장
void _extractSliverPadding(RenderObject sliver, Map<String, dynamic> cl) {
  if (sliver is RenderSliverPadding) {
    final EdgeInsets? resolved = sliver.resolvedPadding;
    if (resolved != null && !cl.containsKey('padding')) {
      cl['padding'] = {
        'top': resolved.top,
        'right': resolved.right,
        'bottom': resolved.bottom,
        'left': resolved.left,
      };
    }
  }
  sliver.visitChildren((child) {
    if (child is! RenderBox) {
      _extractSliverPadding(child, cl);
    }
  });
}

List<Map<String, dynamic>> _crawlThroughSliver(RenderObject sliver) {
  // SliverGrid → ROW 단위로 그룹핑하여 COLUMN > ROW * n 구조 생성
  if (sliver is RenderSliverGrid) {
    final List<Map<String, dynamic>> gridChildren = [];
    sliver.visitChildren((child) {
      if (child is RenderBox) {
        final res = _crawl(child);
        if (res != null) gridChildren.add(res);
      }
    });
    if (gridChildren.isEmpty) return [];

    // crossAxisCount + spacing 추출 (gridDelegate에서)
    int crossAxisCount = 2; // 기본값
    double crossAxisSpacing = 0.0;
    double mainAxisSpacing = 0.0;
    try {
      final delegate = (sliver as dynamic).gridDelegate;
      if (delegate is SliverGridDelegateWithFixedCrossAxisCount) {
        crossAxisCount = delegate.crossAxisCount;
        crossAxisSpacing = delegate.crossAxisSpacing;
        mainAxisSpacing = delegate.mainAxisSpacing;
      }
    } catch (_) {}

    // 자식을 ROW 단위로 그룹핑
    final List<Map<String, dynamic>> rows = [];
    for (int i = 0; i < gridChildren.length; i += crossAxisCount) {
      final end = (i + crossAxisCount).clamp(0, gridChildren.length);
      final rowChildren = gridChildren.sublist(i, end);
      // 각 자식에 flexGrow 설정
      for (final rc in rowChildren) {
        final cl = rc['childLayout'] as Map<String, dynamic>? ?? {};
        cl['flexGrow'] = 1;
        cl['sizingH'] = 'FILL';
        cl['sizingV'] = 'HUG';
        rc['childLayout'] = cl;
      }
      // ROW 래퍼 생성
      final firstRect = rowChildren.first['rect'] as Map<String, dynamic>;
      rows.add({
        'type': 'Frame',
        'layoutMode': 'ROW',
        'rect': {
          'x': firstRect['x'],
          'y': firstRect['y'],
          'w': sliver.constraints.crossAxisExtent,
          'h': (firstRect['h'] as num).toDouble(),
        },
        'visual': <String, dynamic>{},
        'containerLayout': {
          'mainAxisAlignment': 'start',
          'crossAxisAlignment': 'start',
          'mainAxisSize': 'max',
          'itemSpacing': crossAxisSpacing,
        },
        'children': rowChildren,
      });
    }
    // 행 간격은 부모 COLUMN의 itemSpacing으로 처리됨 (mainAxisSpacing)
    // rows에 mainAxisSpacing 정보를 첨부하여 상위에서 사용
    if (rows.isNotEmpty && mainAxisSpacing > 0) {
      // _crawlThroughSliver 결과는 바로 COLUMN children이 되므로
      // 상위 _crawl에서 itemSpacing 계산 시 gap이 반영됨
    }
    return rows;
  }

  final List<Map<String, dynamic>> results = [];
  sliver.visitChildren((child) {
    if (child is RenderBox) {
      final res = _crawl(child);
      if (res != null) results.add(res);
    } else {
      results.addAll(_crawlThroughSliver(child));
    }
  });
  return results;
}

/// FittedBox 스케일 보정: Text fontSize + 자식 rect w/h 재귀 스케일
void _applyFittedBoxScale(Map<String, dynamic> node, double scale) {
  // Text → fontSize/letterSpacing 스케일
  if (node['type'] == 'Text') {
    final visual = node['visual'] as Map<String, dynamic>? ?? {};
    final origSize = visual['fontSize'];
    if (origSize is num) {
      visual['fontSize'] = (origSize * scale * 10).floorToDouble() / 10.0;
    }
    final origSpacing = visual['letterSpacing'];
    if (origSpacing is num && origSpacing != 0) {
      visual['letterSpacing'] = (origSpacing * scale * 100).round() / 100.0;
    }
    node['visual'] = visual;
  }

  // 자식 노드의 rect w/h 스케일 (아이콘 등 비텍스트 자식 포함)
  final children = node['children'] as List?;
  if (children != null) {
    for (final child in children) {
      if (child is Map<String, dynamic>) {
        final rect = child['rect'] as Map<String, dynamic>?;
        if (rect != null) {
          if (rect['w'] is num) rect['w'] = (rect['w'] as num) * scale;
          if (rect['h'] is num) rect['h'] = (rect['h'] as num) * scale;
        }
        _applyFittedBoxScale(child, scale);
      }
    }
  }
}

/// 메인 크롤 함수: RenderObject → 새 스키마 노드
Map<String, dynamic>? _crawl(RenderObject? node) {
  if (node == null) return null;

  // Sliver 노드: 통과하여 내부 RenderBox 수집
  if (node is! RenderBox) {
    final sliverChildren = _crawlThroughSliver(node);
    if (sliverChildren.isEmpty) return null;
    if (sliverChildren.length == 1) return sliverChildren.first;
    return {
      'type': 'Frame',
      'layoutMode': 'COLUMN',
      'rect': sliverChildren.first['rect'],
      'visual': <String, dynamic>{},
      'containerLayout': <String, dynamic>{},
      'children': sliverChildren,
    };
  }

  if (!node.hasSize) return null;
  if (node.size.width == 0 && node.size.height == 0) return null;
  if (node is RenderOffstage && node.offstage) return null;

  // Checkbox / Switch 등: 이미지로 캡처된 경우
  // PNG는 사방 8px 여유 포함, wrapper Frame은 실제 크기 + center/center 정렬
  if (_customPaintCaptures.contains(node)) {
    final b64 = _imageDataByNode[node];
    if (b64 != null) {
      Offset cpOffset;
      try {
        cpOffset = node.localToGlobal(Offset.zero);
      } catch (_) {
        try {
          cpOffset = (node.parentData as BoxParentData).offset;
        } catch (_) {
          cpOffset = Offset.zero;
        }
      }
      const double pad = 4.0;
      return {
        'type': 'Frame',
        'layoutMode': 'NONE',
        'clipsContent': false,
        'rect': {
          'x': cpOffset.dx,
          'y': cpOffset.dy,
          'w': node.size.width,
          'h': node.size.height,
        },
        'visual': <String, dynamic>{},
        'containerLayout': {
          'mainAxisAlignment': 'center',
          'crossAxisAlignment': 'center',
        },
        'children': <Map<String, dynamic>>[
          {
            'type': 'Image',
            'layoutMode': 'NONE',
            'rect': {
              'x': -pad,
              'y': -pad,
              'w': node.size.width + pad * 2,
              'h': node.size.height + pad * 2,
            },
            'visual': {'imageBase64': b64, 'imageFit': 'fill'},
            'children': <Map<String, dynamic>>[],
          },
        ],
      };
    }
  }

  Offset offset;
  try {
    offset = node.localToGlobal(Offset.zero);
  } catch (_) {
    return null;
  }

  // 기본값
  String type = 'Frame';
  String layoutMode = 'NONE';
  final Map<String, dynamic> visual = {};
  final Map<String, dynamic> containerLayout = {};
  bool hasVisual = false;
  bool isLayoutNode = false;
  bool isSizedBox = false;
  bool isCustomMultiChild = false;

  // RotatedBox: element tree에서 미리 등록한 노드를 직접 감지 (runtimeType 의존 제거)
  if (_rotatedBoxNodes.contains(node)) {
    final rotation = _rotationByRenderObject[node];
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        // rotation 0° → 단순 pass-through
        if (rotation == null || rotation.abs() <= 0.001) {
          childResult['rect'] = {
            'x': offset.dx,
            'y': offset.dy,
            'w': node.size.width,
            'h': node.size.height,
          };
          return childResult;
        }
        // rotation 있음 → wrapper Frame 생성
        // Figma에서 rotation은 순수 시각 변환이므로,
        // 자식은 원래(회전 전) 크기를 유지하고 wrapper가 layout 크기를 담당
        final childVisual =
            childResult['visual'] as Map<String, dynamic>? ?? {};
        childVisual['rotation'] = rotation;
        childResult['visual'] = childVisual;
        // 자식은 원래 크기 유지 (singleChild.size), wrapper 내부에 센터링
        childResult['rect'] = {
          'x': 0.0,
          'y': 0.0,
          'w': singleChild!.size.width,
          'h': singleChild!.size.height,
        };
        final cl = childResult['childLayout'] as Map<String, dynamic>? ?? {};
        cl['fixedWidth'] = true;
        cl['fixedHeight'] = true;
        cl['fixedSize'] = true;
        childResult['childLayout'] = cl;
        return {
          'type': 'Frame',
          'layoutMode': 'NONE',
          'clipsContent': false,
          'rect': {
            'x': offset.dx,
            'y': offset.dy,
            'w': node.size.width,
            'h': node.size.height,
          },
          'visual': <String, dynamic>{},
          'containerLayout': {
            'mainAxisAlignment': 'center',
            'crossAxisAlignment': 'center',
          },
          'children': <Map<String, dynamic>>[childResult],
        };
      }
    }
    // 자식 없으면 빈 Frame으로 fall through
  }

  final String runtimeTypeStr = node.runtimeType.toString();
  final bool isSvgBoxTarget = _svgBoxTargets.contains(node);

  String? backgroundImagePath;
  String? backgroundImageFit;

  // ---------------------------------------------------
  // [0] SvgPicture placeholder
  // ---------------------------------------------------
  if (isSvgBoxTarget) {
    hasVisual = true;
    visual['backgroundColor'] = '#ffdddddd';
    visual['isSvgBox'] = true;
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

    if (fontFamily != null && fontFamily.contains('MaterialIcons')) {
      type = 'Frame';
      hasVisual = true;
      final Color color = style?.color ?? const Color(0xFF000000);
      visual['backgroundColor'] = _colorToHex(color);
      visual['isIconBox'] = true;
      // pre-captured 아이콘 이미지 lookup
      final b64 = _imageDataByNode[node];
      if (b64 != null) {
        visual['iconImageBase64'] = b64;
      }
    } else {
      type = 'Text';
      hasVisual = true;
      try {
        visual['content'] = node.text.toPlainText();
        visual['textAlign'] = node.textAlign.toString().split('.').last;

        // RichText children: 개별 TextSpan 스타일을 textSpans 배열로 내보내기
        if (inlineSpan is TextSpan) {
          final spanChildren = inlineSpan.children;
          if (spanChildren != null && spanChildren.isNotEmpty) {
            final spans = <Map<String, dynamic>>[];
            int charOffset = 0;
            for (final child in spanChildren) {
              if (child is TextSpan) {
                final spanText = child.text ?? '';
                if (spanText.isNotEmpty) {
                  final spanMap = <String, dynamic>{
                    'start': charOffset,
                    'end': charOffset + spanText.length,
                  };
                  final s = child.style;
                  if (s != null) {
                    if (s.fontSize != null) spanMap['fontSize'] = s.fontSize;
                    if (s.fontWeight != null)
                      spanMap['fontWeight'] = s.fontWeight.toString();
                    if (s.color != null)
                      spanMap['color'] = _colorToHex(s.color);
                    if (s.fontFamily != null)
                      spanMap['fontFamily'] = s.fontFamily;
                    if (s.letterSpacing != null)
                      spanMap['letterSpacing'] = s.letterSpacing;
                    if (s.height != null)
                      spanMap['lineHeightMultiplier'] = s.height;
                  }
                  spans.add(spanMap);
                  charOffset += spanText.length;
                }
              }
            }
            if (spans.isNotEmpty) {
              visual['textSpans'] = spans;
            }
            // 최상위 style이 없으면 첫 번째 자식 style을 fallback
            if (style == null ||
                (style.fontSize == null && style.fontWeight == null)) {
              final first = spanChildren.first;
              if (first is TextSpan && first.style != null) {
                style = first.style;
              }
            }
          }
        }

        if (style != null) {
          visual['fontFamily'] = style.fontFamily;
          visual['fontSize'] = style.fontSize;
          visual['fontWeight'] = style.fontWeight.toString();
          visual['color'] = _colorToHex(style.color);
          visual['letterSpacing'] = style.letterSpacing;
          if (style.height != null) {
            visual['lineHeightMultiplier'] = style.height;
          }
        }
      } catch (_) {}

      // ShaderMask gradient → 텍스트에 gradient fill 적용
      final smGradient = _shaderMaskGradients[node];
      if (smGradient != null) {
        visual['gradient'] = smGradient;
      }
    }
  }
  // ---------------------------------------------------
  // [1.5] Editable Text (TextField 입력 텍스트)
  // ---------------------------------------------------
  else if (node is RenderEditable) {
    type = 'Text';
    hasVisual = true;
    try {
      final text = node.text;
      final plainText = text?.toPlainText() ?? '';
      if (plainText.isNotEmpty) {
        visual['content'] = plainText;
        visual['textAlign'] = node.textAlign.toString().split('.').last;
        TextStyle? style;
        if (text is TextSpan) {
          style = text.style;
        }
        if (style != null) {
          visual['fontFamily'] = style.fontFamily;
          visual['fontSize'] = style.fontSize;
          visual['fontWeight'] = style.fontWeight.toString();
          visual['color'] = _colorToHex(style.color);
          visual['letterSpacing'] = style.letterSpacing;
          if (style.height != null) {
            visual['lineHeightMultiplier'] = style.height;
          }
        }
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [2] Image
  // ---------------------------------------------------
  else if (node is RenderImage) {
    type = 'Image';
    hasVisual = true;
    try {
      visual['imagePath'] = node.debugImageLabel;
      visual['imageFit'] = 'cover';
      // pre-captured 이미지 데이터 lookup
      final b64 = _imageDataByNode[node];
      if (b64 != null) {
        visual['imageBase64'] = b64;
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [2.5] Padding (RenderPadding) — 자식에 병합
  // ---------------------------------------------------
  else if (node is RenderPadding) {
    final EdgeInsetsGeometry resolvedPadding = node.padding;
    EdgeInsets insets;
    if (resolvedPadding is EdgeInsets) {
      insets = resolvedPadding;
    } else {
      insets = resolvedPadding.resolve(TextDirection.ltr);
    }

    final paddingMap = {
      'top': insets.top,
      'right': insets.right,
      'bottom': insets.bottom,
      'left': insets.left,
    };

    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });

    // Padding + RenderFlex → padding을 Flex containerLayout에 병합
    if (childCount == 1 && singleChild is RenderFlex) {
      final flexResult = _crawl(singleChild);
      if (flexResult != null) {
        final cl = flexResult['containerLayout'] as Map<String, dynamic>? ?? {};
        cl['padding'] = paddingMap;
        flexResult['containerLayout'] = cl;
        flexResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return flexResult;
      }
    }

    // Padding + RenderStack → padding을 Stack containerLayout에 병합
    if (childCount == 1 && singleChild is RenderStack) {
      final stackResult = _crawl(singleChild);
      if (stackResult != null) {
        final cl =
            stackResult['containerLayout'] as Map<String, dynamic>? ?? {};
        cl['padding'] = paddingMap;
        stackResult['containerLayout'] = cl;
        stackResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return stackResult;
      }
    }

    // Padding + RenderDecoratedBox → margin 패턴 (Container(margin:...))
    // 투명 wrapper Frame(auto-layout + padding)으로 margin 표현
    // → 자식 요소 크기는 유지, wrapper의 padding이 margin 역할
    if (childCount == 1 && singleChild is RenderDecoratedBox) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        return <String, dynamic>{
          'type': 'Frame',
          'layoutMode': 'COLUMN',
          'rect': {
            'x': offset.dx,
            'y': offset.dy,
            'w': node.size.width,
            'h': node.size.height,
          },
          'visual': <String, dynamic>{},
          'containerLayout': <String, dynamic>{
            'padding': paddingMap,
            'mainAxisAlignment': 'start',
            'crossAxisAlignment': 'stretch',
            'mainAxisSize': 'min',
            'itemSpacing': 0.0,
          },
          'children': [childResult],
        };
      }
    }

    // 기타: Frame(COLUMN) + padding
    // RenderPadding은 tight constraints를 자식에게 전달 → stretch가 올바른 매핑
    type = 'Frame';
    layoutMode = 'COLUMN';
    isLayoutNode = true;
    containerLayout['padding'] = paddingMap;
    containerLayout['mainAxisAlignment'] = 'start';
    containerLayout['crossAxisAlignment'] = 'stretch';
    containerLayout['mainAxisSize'] = 'min';
    containerLayout['itemSpacing'] = 0.0;
  }
  // ---------------------------------------------------
  // [3] RenderStack (신규)
  // ---------------------------------------------------
  else if (node is RenderStack) {
    type = 'Frame';
    layoutMode = 'STACK';
    isLayoutNode = true;
    // Stack의 clipBehavior 추출 (기본값: Clip.hardEdge)
    try {
      final clip = node.clipBehavior;
      if (clip != Clip.none) {
        visual['clipsContent'] = true;
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [3.5] RenderPositionedBox (Align / Center / Container.alignment)
  // ---------------------------------------------------
  else if (node is RenderPositionedBox) {
    type = 'Frame';
    isLayoutNode = true;
    layoutMode = 'COLUMN';

    final alignment = node.alignment;
    Alignment resolved;
    if (alignment is Alignment) {
      resolved = alignment;
    } else {
      resolved = alignment.resolve(TextDirection.ltr);
    }

    // alignment.y → mainAxisAlignment (COLUMN = vertical)
    String mainAlign;
    if (resolved.y <= -0.5) {
      mainAlign = 'start';
    } else if (resolved.y >= 0.5) {
      mainAlign = 'end';
    } else {
      mainAlign = 'center';
    }

    // alignment.x → crossAxisAlignment (COLUMN = horizontal)
    String crossAlign;
    if (resolved.x <= -0.5) {
      crossAlign = 'start';
    } else if (resolved.x >= 0.5) {
      crossAlign = 'end';
    } else {
      crossAlign = 'center';
    }

    containerLayout['mainAxisAlignment'] = mainAlign;
    containerLayout['crossAxisAlignment'] = crossAlign;
    containerLayout['mainAxisSize'] = 'max';
  }
  // ---------------------------------------------------
  // [4] RenderConstrainedBox (SizedBox)
  // ---------------------------------------------------
  else if (node is RenderConstrainedBox) {
    isSizedBox = true;
    // 자식 확인
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });

    if (childCount == 1 && singleChild != null) {
      // 자식 있으면 투과 — 크기 정보만 childLayout에서 처리
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        // rect를 SizedBox 기준으로 업데이트
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        // Tight constraints → fixedSize / fixedWidth / fixedHeight 마킹
        // 렌더 크기 ≈ 제약 크기일 때만 (Expanded 안 SizedBox 제외)
        final ac = node.additionalConstraints;
        final cl = childResult['childLayout'] as Map<String, dynamic>? ?? {};
        bool marked = false;
        if (ac.hasTightWidth && ac.maxWidth.isFinite) {
          if ((node.size.width - ac.maxWidth).abs() < 1.0) {
            cl['fixedWidth'] = true;
            marked = true;
          }
        }
        if (ac.hasTightHeight && ac.maxHeight.isFinite) {
          if ((node.size.height - ac.maxHeight).abs() < 1.0) {
            cl['fixedHeight'] = true;
            marked = true;
          }
        }
        if (cl['fixedWidth'] == true && cl['fixedHeight'] == true) {
          cl['fixedSize'] = true;
        }
        if (marked) {
          childResult['childLayout'] = cl;
        }
        return childResult;
      }
    }

    // 자식 없으면 Spacer 역할 (빈 Frame)
    type = 'Frame';
    layoutMode = 'NONE';
  }
  // ---------------------------------------------------
  // [4.5] RenderAspectRatio (AspectRatio)
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('RenderAspectRatio')) {
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        final cl = childResult['childLayout'] as Map<String, dynamic>? ?? {};
        cl['fixedWidth'] = true;
        cl['fixedHeight'] = true;
        cl['fixedSize'] = true;
        childResult['childLayout'] = cl;
        return childResult;
      }
    }
    // 자식 없으면 빈 Frame
    type = 'Frame';
    layoutMode = 'NONE';
  }
  // ---------------------------------------------------
  // [5] Flex (Row / Column)
  // ---------------------------------------------------
  else if (node is RenderFlex) {
    type = 'Frame';
    isLayoutNode = true;
    layoutMode = node.direction == Axis.horizontal ? 'ROW' : 'COLUMN';

    final mainAlign = node.mainAxisAlignment.toString().split('.').last;
    final crossAlign = node.crossAxisAlignment.toString().split('.').last;
    final mainSize = node.mainAxisSize == MainAxisSize.min ? 'min' : 'max';

    containerLayout['mainAxisAlignment'] = mainAlign;
    containerLayout['crossAxisAlignment'] = crossAlign;
    containerLayout['mainAxisSize'] = mainSize;
  }
  // ---------------------------------------------------
  // [5.5] RenderWrap
  // ---------------------------------------------------
  else if (node is RenderWrap) {
    type = 'Frame';
    isLayoutNode = true;
    layoutMode = 'WRAP';
    containerLayout['itemSpacing'] = node.spacing;
    containerLayout['runSpacing'] = node.runSpacing;
    containerLayout['mainAxisAlignment'] = node.alignment
        .toString()
        .split('.')
        .last;
    containerLayout['crossAxisAlignment'] = node.crossAxisAlignment
        .toString()
        .split('.')
        .last;
    // Wrap은 constraints.maxWidth로 줄바꿈 → Figma에서도 이 너비가 필요
    // node.size.width는 자식 바운딩 박스만 반영하므로 constraints.maxWidth 사용
    final maxW = node.constraints.maxWidth;
    if (maxW.isFinite && maxW > node.size.width) {
      containerLayout['_wrapMaxWidth'] = maxW;
    }
  }
  // ---------------------------------------------------
  // [6] DecoratedBox
  // ---------------------------------------------------
  else if (node is RenderDecoratedBox) {
    type = 'Frame';
    try {
      final decoration = node.decoration;
      if (decoration is BoxDecoration) {
        if (decoration.color != null) {
          visual['backgroundColor'] = _colorToHex(decoration.color);
          hasVisual = true;
        }
        if (decoration.gradient != null) {
          final grad = _extractGradient(decoration.gradient);
          if (grad != null) {
            visual['gradient'] = grad;
            hasVisual = true;
          }
        }
        if (decoration.image != null) {
          final DecorationImage decorationImage = decoration.image!;
          final ImageProvider provider = decorationImage.image;
          if (provider is AssetImage) {
            backgroundImagePath = provider.assetName;
            backgroundImageFit = decorationImage.fit?.toString();
            hasVisual = true;
          }
        }
        if (decoration.border != null) {
          final border = decoration.border;
          if (border is Border) {
            final top = border.top,
                right = border.right,
                bottom = border.bottom,
                left = border.left;
            final sides = [top, right, bottom, left];
            BorderSide? bestSide;
            for (final s in sides) {
              if (bestSide == null || s.width > bestSide.width) bestSide = s;
            }
            if (bestSide != null && bestSide.width > 0) {
              final borderMap = <String, dynamic>{
                'color': _colorToHex(bestSide.color),
                'width': bestSide.width,
              };
              final uniform = sides.every(
                (s) => s.width == top.width && s.color == top.color,
              );
              if (!uniform) {
                borderMap['topWidth'] = top.width;
                borderMap['rightWidth'] = right.width;
                borderMap['bottomWidth'] = bottom.width;
                borderMap['leftWidth'] = left.width;
              }
              visual['border'] = borderMap;
              hasVisual = true;
            }
          } else {
            visual['border'] = {'color': '#ff000000', 'width': 1.0};
            hasVisual = true;
          }
        }
        // BoxShape.circle → borderRadius = shortestSide / 2
        if (decoration.shape == BoxShape.circle) {
          visual['borderRadius'] = node.size.shortestSide / 2;
        } else if (decoration.borderRadius is BorderRadius) {
          final brVal = _extractBorderRadius(
            decoration.borderRadius as BorderRadius,
          );
          if (brVal != null) visual['borderRadius'] = brVal;
        } else {
          final br = _parseBorderRadius(decoration.borderRadius);
          if (br != null) visual['borderRadius'] = br;
        }
        if (decoration.boxShadow != null && decoration.boxShadow!.isNotEmpty) {
          final s = decoration.boxShadow!.first;
          visual['shadow'] = {
            'color': _colorToHex(s.color),
            'offsetX': s.offset.dx,
            'offsetY': s.offset.dy,
            'blurRadius': s.blurRadius,
            'spreadRadius': s.spreadRadius,
          };
          hasVisual = true;
        }
      }
      // ShapeDecoration (Material 버튼: OutlinedButton, ElevatedButton 등)
      else if (decoration is ShapeDecoration) {
        if (decoration.color != null) {
          visual['backgroundColor'] = _colorToHex(decoration.color);
          hasVisual = true;
        }
        final shape = decoration.shape;
        if (shape is RoundedRectangleBorder) {
          final side = shape.side;
          if (side.width > 0 && side.style == BorderStyle.solid) {
            visual['border'] = {
              'color': _colorToHex(side.color),
              'width': side.width,
            };
            hasVisual = true;
          }
          if (shape.borderRadius is BorderRadius) {
            final brVal = _extractBorderRadius(
              shape.borderRadius as BorderRadius,
            );
            if (brVal != null) visual['borderRadius'] = brVal;
          } else {
            final br = _parseBorderRadius(shape.borderRadius);
            if (br != null) visual['borderRadius'] = br;
          }
        } else if (shape is StadiumBorder) {
          final side = shape.side;
          if (side.width > 0 && side.style == BorderStyle.solid) {
            visual['border'] = {
              'color': _colorToHex(side.color),
              'width': side.width,
            };
            hasVisual = true;
          }
          // StadiumBorder → borderRadius = height / 2
          visual['borderRadius'] = node.size.height / 2;
        } else if (shape is CircleBorder) {
          final side = shape.side;
          if (side.width > 0 && side.style == BorderStyle.solid) {
            visual['border'] = {
              'color': _colorToHex(side.color),
              'width': side.width,
            };
            hasVisual = true;
          }
          visual['borderRadius'] = node.size.shortestSide / 2;
        }
        if (decoration.shadows != null && decoration.shadows!.isNotEmpty) {
          final s = decoration.shadows!.first;
          visual['shadow'] = {
            'color': _colorToHex(s.color),
            'offsetX': s.offset.dx,
            'offsetY': s.offset.dy,
            'blurRadius': s.blurRadius,
            'spreadRadius': s.spreadRadius,
          };
          hasVisual = true;
        }
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [7] PhysicalModel
  // ---------------------------------------------------
  else if (node is RenderPhysicalModel) {
    type = 'Frame';
    hasVisual = true;
    visual['backgroundColor'] = _colorToHex(node.color);
    if (node.elevation > 0) {
      visual['shadow'] = {'elevation': node.elevation};
    }
    if (node.clipBehavior != Clip.none) {
      visual['clipsContent'] = true;
    }
    try {
      dynamic d = node;
      if (d.borderRadius != null) {
        final br = _parseBorderRadius(d.borderRadius);
        if (br != null) visual['borderRadius'] = br;
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [8] PhysicalShape
  // ---------------------------------------------------
  else if (node is RenderPhysicalShape) {
    type = 'Frame';
    hasVisual = true;
    visual['backgroundColor'] = _colorToHex(node.color);
    if (node.elevation > 0) {
      visual['shadow'] = {'elevation': node.elevation};
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
          visual['borderRadius'] = double.tryParse(m.group(1)!) ?? 0.0;
        }
        // shape.side → border (OutlinedButton 등 Material 버튼의 보더)
        try {
          final side = shape.side;
          if (side != null &&
              side.width > 0 &&
              side.style == BorderStyle.solid) {
            visual['border'] = {
              'color': _colorToHex(side.color),
              'width': side.width,
            };
          }
        } catch (_) {}
      }
    } catch (_) {}
  }
  // ---------------------------------------------------
  // [8.3] RenderOpacity
  // ---------------------------------------------------
  else if (node is RenderOpacity) {
    // Opacity 값을 자식에 전파
    final double opacityValue = node.opacity;
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        final childVisual =
            childResult['visual'] as Map<String, dynamic>? ?? {};
        childVisual['opacity'] = opacityValue;
        childResult['visual'] = childVisual;
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return childResult;
      }
    }
    type = 'Frame';
    layoutMode = 'NONE';
    visual['opacity'] = opacityValue;
  }
  // ---------------------------------------------------
  // [8.5] RenderClipRRect
  // ---------------------------------------------------
  else if (node is RenderClipRRect) {
    // per-corner radius 추출
    dynamic brValue;
    try {
      final brr = node.borderRadius;
      if (brr is BorderRadius) {
        brValue = _extractBorderRadius(brr);
      }
    } catch (_) {}
    brValue ??= _parseBorderRadius(node.borderRadius);

    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        if (brValue != null) {
          final childVisual =
              childResult['visual'] as Map<String, dynamic>? ?? {};
          if (!childVisual.containsKey('borderRadius')) {
            childVisual['borderRadius'] = brValue;
            childResult['visual'] = childVisual;
          }
        }
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return childResult;
      }
    }
    type = 'Frame';
    layoutMode = 'NONE';
    if (brValue != null) visual['borderRadius'] = brValue;
  }
  // ---------------------------------------------------
  // [8.52] RenderClipOval
  // ---------------------------------------------------
  else if (node is RenderClipOval) {
    // 원형 클리핑: borderRadius = min(width, height) / 2
    final double ovalRadius = math.min(node.size.width, node.size.height) / 2;

    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        final childVisual =
            childResult['visual'] as Map<String, dynamic>? ?? {};
        if (!childVisual.containsKey('borderRadius')) {
          childVisual['borderRadius'] = ovalRadius;
          childResult['visual'] = childVisual;
        }
        childVisual['clipsContent'] = true;
        childResult['visual'] = childVisual;
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return childResult;
      }
    }
    type = 'Frame';
    layoutMode = 'NONE';
    visual['borderRadius'] = ovalRadius;
    visual['clipsContent'] = true;
  }
  // ---------------------------------------------------
  // [8.55] RenderBackdropFilter → backgroundBlur
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('RenderBackdropFilter')) {
    type = 'Frame';
    layoutMode = 'NONE';
    // blur sigma를 visual에 추가 (element tree 매핑 우선, 실패 시 직접 추출)
    double? blurSigma = _blurInfoByRenderObject[node];
    if (blurSigma == null || blurSigma <= 0) {
      // fallback: RenderBackdropFilter.filter에서 직접 추출
      try {
        final filterObj = (node as dynamic).filter;
        final filterStr = filterObj.toString();
        // "sigmaX: 10.0" 형식
        var m = RegExp(r'sigmaX:\s*([\d.]+)').firstMatch(filterStr);
        // "blur(10.0, 10.0, ...)" 형식 (parameter name 없는 경우)
        m ??= RegExp(r'blur\(([\d.]+)').firstMatch(filterStr);
        if (m != null) {
          blurSigma = double.tryParse(m.group(1)!) ?? 0;
        }
      } catch (e) {
        debugPrint('[BackdropFilter] filter extraction failed: $e');
      }
    }
    if (blurSigma != null && blurSigma > 0) {
      visual['backgroundBlur'] = blurSigma;
      hasVisual = true;
    }
  }
  // ---------------------------------------------------
  // [8.57] RenderTransform → rotation 추출
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('RenderTransform')) {
    type = 'Frame';
    layoutMode = 'NONE';
    // 방법 1 (확실): widget tree에서 미리 캡처한 rotation 사용
    final precomputed = _rotationByRenderObject[node];
    if (precomputed != null && precomputed.abs() > 0.001) {
      visual['rotation'] = precomputed;
    } else {
      // 방법 2 (fallback): RenderObject에서 직접 추출 시도
      try {
        Matrix4? transform;
        try {
          transform = (node as dynamic).transform as Matrix4?;
        } catch (_) {}
        transform ??= (() {
          try {
            final parent = node.parent;
            if (parent is RenderObject) return node.getTransformTo(parent);
          } catch (_) {}
          return null;
        })();
        if (transform != null) {
          final sinVal = transform.entry(1, 0);
          final cosVal = transform.entry(0, 0);
          final radians = math.atan2(sinVal, cosVal);
          if (radians.abs() > 0.001) {
            visual['rotation'] = radians * 180.0 / math.pi;
          }
        }
      } catch (e) {
        debugPrint('[RenderTransform] rotation extraction failed: $e');
      }
    }
    // 단일 자식이면 패스스루
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        // rotation을 자식에 전파
        if (visual.containsKey('rotation')) {
          final childVisual =
              childResult['visual'] as Map<String, dynamic>? ?? {};
          childVisual['rotation'] = visual['rotation'];
          childResult['visual'] = childVisual;
        }
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        return childResult;
      }
    }
  }
  // ---------------------------------------------------
  // [8.6] RenderClipPath
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('RenderClipPath')) {
    final clipPoints = _clipPathPoints[node];

    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final childResult = _crawl(singleChild);
      if (childResult != null) {
        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': node.size.width,
          'h': node.size.height,
        };
        if (clipPoints != null && clipPoints.isNotEmpty) {
          childResult['clipPath'] = clipPoints;
        }
        return childResult;
      }
    }
    type = 'Frame';
    layoutMode = 'NONE';
    if (clipPoints != null && clipPoints.isNotEmpty) {
      visual['clipPath'] = clipPoints;
    }
  }
  // [8.65] RenderRotatedBox — element tree 기반 early-return으로 이동 (위쪽 _rotatedBoxNodes 블록)
  // ---------------------------------------------------
  // [8.7] RenderFittedBox
  // ---------------------------------------------------
  else if (node is RenderFittedBox) {
    final String? boxFit = _boxFitByRenderObject[node];
    RenderBox? singleChild;
    int childCount = 0;
    node.visitChildren((child) {
      childCount++;
      if (child is RenderBox) singleChild = child;
    });
    if (childCount == 1 && singleChild != null) {
      final sc = singleChild!;
      final childResult = _crawl(sc);
      if (childResult != null) {
        final double parentW = node.size.width;
        final double parentH = node.size.height;
        final double childW = sc.size.width;
        final double childH = sc.size.height;

        double scaleX = childW > 0 ? parentW / childW : 1.0;
        double scaleY = childH > 0 ? parentH / childH : 1.0;
        final String fitKey = (boxFit ?? 'contain').toLowerCase();
        double scale;
        if (fitKey == 'cover') {
          scale = math.max(scaleX, scaleY);
        } else if (fitKey == 'fitwidth') {
          scale = scaleX;
        } else if (fitKey == 'fitheight') {
          scale = scaleY;
        } else if (fitKey == 'none') {
          scale = 1.0;
        } else {
          // contain, scaleDown, fill → 모두 min(scaleX, scaleY) 사용
          // fill은 비균일 스케일이지만 fontSize는 균일만 가능하므로 contain으로 근사
          scale = math.min(scaleX, scaleY);
          if (fitKey == 'scaledown' && scale > 1.0) scale = 1.0;
        }

        // 자식 트리 전체 스케일 보정 (Text fontSize + 자식 rect w/h)
        if (scale != 1.0) {
          _applyFittedBoxScale(childResult, scale);
        }
        // FittedBox 자식은 정확한 크기가 보장되므로 fixedSize 마킹
        final cl = childResult['childLayout'] as Map<String, dynamic>? ?? {};
        cl['fixedSize'] = true;
        cl['fixedWidth'] = true;
        cl['fixedHeight'] = true;
        childResult['childLayout'] = cl;

        // FittedBox alignment (기본 center)
        if (childResult['type'] == 'Frame') {
          // Frame 자식 → containerLayout으로 중앙 정렬
          final containerLayout =
              childResult['containerLayout'] as Map<String, dynamic>? ?? {};
          containerLayout['mainAxisAlignment'] = 'center';
          containerLayout['crossAxisAlignment'] = 'center';
          childResult['containerLayout'] = containerLayout;
        } else if (childResult['type'] == 'Text') {
          // Text 자식 → visual에 중앙 정렬 플래그
          final childVisual =
              childResult['visual'] as Map<String, dynamic>? ?? {};
          childVisual['textAlignVertical'] = 'center';
          childResult['visual'] = childVisual;
        }

        childResult['rect'] = {
          'x': offset.dx,
          'y': offset.dy,
          'w': parentW,
          'h': parentH,
        };
        return childResult;
      }
    }
    type = 'Frame';
    layoutMode = 'NONE';
  }
  // ---------------------------------------------------
  // [9] Picture / CustomPaint
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('Picture') ||
      runtimeTypeStr.contains('CustomPaint')) {
    type = 'Frame';
    hasVisual = false;
  }
  // ---------------------------------------------------
  // [9.5] CustomMultiChildLayout (NavigationToolbar, Scaffold 등)
  // ---------------------------------------------------
  else if (runtimeTypeStr.contains('CustomMultiChildLayoutBox')) {
    type = 'Frame';
    isLayoutNode = true;
    isCustomMultiChild = true;

    // 자식 좌표를 보고 방향 추론
    double minX = double.infinity, maxX = -double.infinity;
    double minY = double.infinity, maxY = -double.infinity;
    int peekCount = 0;
    node.visitChildren((child) {
      if (child is RenderBox && child.hasSize) {
        try {
          final o = child.localToGlobal(Offset.zero);
          if (o.dx < minX) minX = o.dx;
          if (o.dx > maxX) maxX = o.dx;
          if (o.dy < minY) minY = o.dy;
          if (o.dy > maxY) maxY = o.dy;
          peekCount++;
        } catch (_) {}
      }
    });

    if (peekCount >= 2) {
      final xRange = maxX - minX;
      final yRange = maxY - minY;
      layoutMode = xRange > yRange ? 'ROW' : 'COLUMN';
    } else {
      layoutMode = 'ROW';
    }

    if (layoutMode == 'ROW') {
      containerLayout['mainAxisAlignment'] = 'spaceBetween';
      containerLayout['crossAxisAlignment'] = 'center';
      containerLayout['mainAxisSize'] = 'max';
    } else {
      containerLayout['mainAxisAlignment'] = 'start';
      containerLayout['crossAxisAlignment'] = 'stretch';
      containerLayout['mainAxisSize'] = 'max';
    }
  }

  // ---------------------------------------------------
  // [10] DesignInfo overlay (TextField, Divider, Container)
  // ---------------------------------------------------
  final designInfo = _designInfoByRenderObject[node];
  if (designInfo != null) {
    if (designInfo.backgroundColor != null) {
      visual['backgroundColor'] = _colorToHex(designInfo.backgroundColor);
      hasVisual = true;
    }
    if (designInfo.borderColor != null) {
      final borderMap = <String, dynamic>{
        'color': _colorToHex(designInfo.borderColor),
        'width': designInfo.borderWidth ?? 1.0,
      };
      if (designInfo.borderTopWidth != null) {
        borderMap['topWidth'] = designInfo.borderTopWidth;
        borderMap['rightWidth'] = designInfo.borderRightWidth;
        borderMap['bottomWidth'] = designInfo.borderBottomWidth;
        borderMap['leftWidth'] = designInfo.borderLeftWidth;
      }
      visual['border'] = borderMap;
      hasVisual = true;
    }
    if (designInfo.borderRadius != null) {
      visual['borderRadius'] = designInfo.borderRadius;
    }
    if (designInfo.elevation != null && designInfo.elevation! > 0) {
      visual['shadow'] = {'elevation': designInfo.elevation};
    }
    if (designInfo.clipsContent) visual['clipsContent'] = true;
    if (designInfo.isTextField) visual['isTextField'] = true;
    if (designInfo.isDivider) visual['isDivider'] = true;
  }

  // ---------------------------------------------------
  // [10.5] TextField 구조 재편 플래그
  // ---------------------------------------------------
  final bool isTextFieldNode = visual['isTextField'] == true;

  // ---------------------------------------------------
  // [11] 자식 순회
  // ---------------------------------------------------
  final List<Map<String, dynamic>> children = [];
  final bool _skipChildren = (type == 'Text');
  final bool isFlex = node is RenderFlex;
  final bool isStack = node is RenderStack;
  final bool isWrap = node is RenderWrap;
  final List<double> _gaps = [];
  final List<double> _childMainAxisPositions = [];
  double? _lastChildEnd; // gap 계산용: 이전 non-null 자식의 끝 좌표

  try {
    if (!_skipChildren)
      node.visitChildren((child) {
        if (child is RenderBox) {
          final c = _crawl(child);
          if (c != null) {
            // Flex 자식: childLayout 설정
            if (isFlex) {
              final flexNode = node as RenderFlex;
              final isHorizontal = flexNode.direction == Axis.horizontal;
              final childLayout =
                  c['childLayout'] as Map<String, dynamic>? ?? {};

              final parentData = child.parentData;
              if (parentData is FlexParentData) {
                final flex = parentData.flex ?? 0;
                final isTight = parentData.fit == FlexFit.tight;

                if (flex > 0 && isTight) {
                  // Expanded
                  childLayout['flexGrow'] = flex;
                  if (isHorizontal) {
                    childLayout['sizingH'] = 'FILL';
                    childLayout['sizingV'] = 'HUG';
                  } else {
                    childLayout['sizingH'] = 'HUG';
                    childLayout['sizingV'] = 'FILL';
                  }
                } else if (flex > 0) {
                  // Flexible (loose)
                  childLayout['flexGrow'] = flex;
                  childLayout['sizingH'] = 'HUG';
                  childLayout['sizingV'] = 'HUG';
                } else {
                  // 일반 자식
                  childLayout['flexGrow'] = 0;
                  childLayout['sizingH'] = 'HUG';
                  childLayout['sizingV'] = 'HUG';
                }
              } else {
                childLayout['flexGrow'] = 0;
                childLayout['sizingH'] = 'HUG';
                childLayout['sizingV'] = 'HUG';
              }

              // crossAxisAlignment == stretch → cross축 FILL
              if (flexNode.crossAxisAlignment == CrossAxisAlignment.stretch) {
                if (isHorizontal) {
                  childLayout['sizingV'] = 'FILL';
                  childLayout['alignSelf'] = 'STRETCH';
                } else {
                  childLayout['sizingH'] = 'FILL';
                  childLayout['alignSelf'] = 'STRETCH';
                }
              }

              c['childLayout'] = childLayout;

              // itemSpacing 계산용 좌표 수집 + gap 즉시 계산
              try {
                final childOffset = child.localToGlobal(Offset.zero);
                final pos = isHorizontal ? childOffset.dx : childOffset.dy;
                final size = isHorizontal
                    ? child.size.width
                    : child.size.height;
                _childMainAxisPositions.add(pos);
                if (_lastChildEnd != null) {
                  final gap = pos - _lastChildEnd!;
                  if (gap > 0) _gaps.add(gap.roundToDouble());
                }
                _lastChildEnd = pos + size;
              } catch (_) {}
            }

            // Stack 자식: positioned 정보 추출
            if (isStack) {
              final childLayout =
                  c['childLayout'] as Map<String, dynamic>? ?? {};
              final parentData = child.parentData;
              if (parentData is StackParentData) {
                final pos = <String, dynamic>{};
                if (parentData.top != null) pos['top'] = parentData.top;
                if (parentData.left != null) pos['left'] = parentData.left;
                if (parentData.right != null) pos['right'] = parentData.right;
                if (parentData.bottom != null)
                  pos['bottom'] = parentData.bottom;
                if (pos.isNotEmpty) {
                  childLayout['positioned'] = pos;
                }
              }
              childLayout['sizingH'] = 'FIXED';
              childLayout['sizingV'] = 'FIXED';
              c['childLayout'] = childLayout;
            }

            // Wrap 자식: HUG 사이징 (자연 크기 유지)
            if (isWrap) {
              final childLayout =
                  c['childLayout'] as Map<String, dynamic>? ?? {};
              childLayout['sizingH'] = 'HUG';
              childLayout['sizingV'] = 'HUG';
              c['childLayout'] = childLayout;
            }

            children.add(c);
          }
        } else {
          // SliverPadding 감지 → padding + layout 설정
          _extractSliverPadding(child, containerLayout);
          if (containerLayout.containsKey('padding') && layoutMode == 'NONE') {
            layoutMode = 'COLUMN';
            isLayoutNode = true;
            containerLayout['crossAxisAlignment'] = 'stretch';
            containerLayout['mainAxisAlignment'] = 'start';
          }
          children.addAll(_crawlThroughSliver(child));
        }
      });
  } catch (_) {}

  // CustomMultiChildLayout: 자식을 위치 기준으로 정렬
  if (isCustomMultiChild && children.length >= 2) {
    if (layoutMode == 'COLUMN') {
      children.sort((a, b) {
        final ay = (a['rect'] as Map<String, dynamic>?)?['y'] as double? ?? 0.0;
        final by = (b['rect'] as Map<String, dynamic>?)?['y'] as double? ?? 0.0;
        return ay.compareTo(by);
      });
    } else {
      children.sort((a, b) {
        final ax = (a['rect'] as Map<String, dynamic>?)?['x'] as double? ?? 0.0;
        final bx = (b['rect'] as Map<String, dynamic>?)?['x'] as double? ?? 0.0;
        return ax.compareTo(bx);
      });
    }
  }

  // ---------------------------------------------------
  // [10.5] TextField 구조 재편: bg를 입력 영역에만, 패딩 적용
  // ---------------------------------------------------
  if (isTextFieldNode && children.isNotEmpty) {
    // hint/text 중복 제거:
    // RenderEditable(실텍스트)이 먼저, RenderParagraph(hint)가 뒤에 옴.
    // 실텍스트가 비어있지 않으면 hint(두 번째) 제거.
    // 실텍스트가 비어있으면 실텍스트 제거하고 hint만 남김.
    final textKids = children.where((c) => c['type'] == 'Text').toList();
    if (textKids.length >= 2) {
      final first = textKids.first; // 실텍스트 (RenderEditable)
      final second = textKids.last; // hint (RenderParagraph)
      final firstContent =
          ((first['visual'] as Map?)?['content'] as String?) ?? '';
      if (firstContent.isNotEmpty) {
        // 실텍스트 있음 → hint 제거
        children.remove(second);
      } else {
        // 실텍스트 비어있음 → 실텍스트 제거, hint만 남김
        children.remove(first);
      }
    } else if (textKids.length == 1) {
      final v = textKids.first['visual'] as Map<String, dynamic>? ?? {};
      if (((v['content'] as String?) ?? '').isEmpty) {
        children.remove(textKids.first);
      }
    }

    // decoration box 찾기: 콘텐츠 없는 Frame, 부모와 비슷한 너비
    int decoIdx = -1;
    for (int i = children.length - 1; i >= 0; i--) {
      final c = children[i];
      if (c['type'] == 'Frame' && !_hasContentRecursive(c)) {
        final cr = c['rect'] as Map<String, dynamic>?;
        if (cr != null) {
          final cw = (cr['w'] as num?)?.toDouble() ?? 0;
          if (cw >= node.size.width * 0.9) {
            decoIdx = i;
            break;
          }
        }
      }
    }

    if (decoIdx >= 0) {
      final decoBox = children[decoIdx];
      final decoRect = decoBox['rect'] as Map<String, dynamic>;
      final decoY = (decoRect['y'] as num).toDouble();
      final decoH = (decoRect['h'] as num).toDouble();
      final decoW = (decoRect['w'] as num).toDouble();
      final decoBottom = decoY + decoH;

      // 자식을 입력 영역 안 vs 아래(에러/헬퍼)로 분리
      final List<Map<String, dynamic>> inputChildren = [];
      final List<Map<String, dynamic>> belowChildren = [];
      for (int i = 0; i < children.length; i++) {
        if (i == decoIdx) continue;
        final c = children[i];
        final cy = ((c['rect'] as Map?)?['y'] as num?)?.toDouble() ?? 0;
        if (cy >= decoBottom - 1) {
          belowChildren.add(c);
        } else {
          inputChildren.add(c);
        }
      }

      // contentPadding 계산 (첫 번째 콘텐츠 자식 좌표 기반)
      Map<String, dynamic>? paddingMap;
      for (final ic in inputChildren) {
        final icRect = ic['rect'] as Map<String, dynamic>?;
        if (icRect != null) {
          final icX = (icRect['x'] as num?)?.toDouble() ?? 0;
          final icY = (icRect['y'] as num?)?.toDouble() ?? 0;
          final icW = (icRect['w'] as num?)?.toDouble() ?? 0;
          final icH = (icRect['h'] as num?)?.toDouble() ?? 0;
          final padLeft = icX - (decoRect['x'] as num).toDouble();
          final padTop = icY - decoY;
          final padRight = decoW - padLeft - icW;
          final padBottom = decoH - padTop - icH;
          if (padLeft >= 0 && padTop >= 0) {
            paddingMap = {
              'top': padTop > 0 ? padTop : 0.0,
              'right': padRight > 0 ? padRight : 0.0,
              'bottom': padBottom > 0 ? padBottom : 0.0,
              'left': padLeft > 0 ? padLeft : 0.0,
            };
            break;
          }
        }
      }

      if (belowChildren.isNotEmpty) {
        // 에러/헬퍼 텍스트 있음 → 구조 재편
        // bg/border를 decoBox로 이동
        decoBox['visual'] = Map<String, dynamic>.from(visual);
        decoBox['children'] = inputChildren;
        decoBox['layoutMode'] = 'COLUMN';
        decoBox['containerLayout'] = <String, dynamic>{
          'mainAxisAlignment': 'center',
          'crossAxisAlignment': 'start',
          'mainAxisSize': 'min',
        };
        if (paddingMap != null) {
          (decoBox['containerLayout'] as Map<String, dynamic>)['padding'] =
              paddingMap;
        }

        // 외부 → 투명 COLUMN
        visual.clear();
        hasVisual = false;
        layoutMode = 'COLUMN';
        isLayoutNode = true;
        containerLayout['mainAxisAlignment'] = 'start';
        containerLayout['crossAxisAlignment'] = 'stretch';
        containerLayout['mainAxisSize'] = 'min';
        containerLayout['itemSpacing'] = 4.0;

        children.clear();
        children.add(decoBox);
        children.addAll(belowChildren);
      } else {
        // 에러 없음 → 현재 노드에 패딩 + 레이아웃 적용
        layoutMode = 'COLUMN';
        isLayoutNode = true;
        containerLayout['mainAxisAlignment'] = 'center';
        containerLayout['crossAxisAlignment'] = 'start';
        containerLayout['mainAxisSize'] = 'min';
        if (paddingMap != null) {
          containerLayout['padding'] = paddingMap;
        }
        children.removeAt(decoIdx);
      }
    }
  }

  // Flex: itemSpacing 계산 (첫 번째 순회에서 수집한 _gaps 사용)
  if (isFlex && _gaps.isNotEmpty) {
    // 모두 같으면 그 값, 다르면 가장 빈번한 값
    final allSame = _gaps.every((g) => g == _gaps.first);
    if (allSame) {
      containerLayout['itemSpacing'] = _gaps.first;
    } else {
      final freq = <double, int>{};
      for (final g in _gaps) freq[g] = (freq[g] ?? 0) + 1;
      double bestGap = _gaps.first;
      int bestCount = 0;
      freq.forEach((g, count) {
        if (count > bestCount) {
          bestGap = g;
          bestCount = count;
        }
      });
      containerLayout['itemSpacing'] = bestGap;
    }
  }

  // 배경 이미지를 synthetic Image child로 추가
  if (backgroundImagePath != null) {
    final bgChild = <String, dynamic>{
      'type': 'Image',
      'layoutMode': 'NONE',
      'rect': {
        'x': offset.dx,
        'y': offset.dy,
        'w': node.size.width,
        'h': node.size.height,
      },
      'visual': <String, dynamic>{
        'imagePath': backgroundImagePath,
        'imageFit': backgroundImageFit ?? 'cover',
      },
      'children': <Map<String, dynamic>>[],
    };
    children.insert(0, bgChild);
  }

  // ---------------------------------------------------
  // Smart Flattening (조건 강화)
  // ---------------------------------------------------
  final bool hasPadding = containerLayout.containsKey('padding');
  if (type == 'Frame' &&
      !hasVisual &&
      !_hasVisualProps(visual) &&
      !isLayoutNode &&
      !isSizedBox &&
      layoutMode == 'NONE' &&
      !hasPadding &&
      children.length == 1) {
    // widgetName 전파 (Smart Flattening에서 소실 방지)
    if (_widgetNameByRenderObject.containsKey(node) &&
        children.first is Map<String, dynamic> &&
        !children.first.containsKey('widgetName')) {
      children.first['widgetName'] = _widgetNameByRenderObject[node];
    }
    return children.first;
  }
  if (children.isEmpty &&
      !hasVisual &&
      !_hasVisualProps(visual) &&
      (node.size.width < 1 && node.size.height < 1)) {
    return null;
  }

  // ---------------------------------------------------
  // Visual Merge + Flatten: NONE 래퍼(DecoratedBox 등)의 visual을
  // 자식 Frame에 병합하여 auto-layout 체인 유지
  // ---------------------------------------------------
  if (type == 'Frame' &&
      layoutMode == 'NONE' &&
      !isLayoutNode &&
      children.length == 1 &&
      children.first['type'] == 'Frame') {
    final child = children.first;
    final childRect = child['rect'] as Map<String, dynamic>?;
    final childW = (childRect?['w'] as num?)?.toDouble() ?? 0;
    final childH = (childRect?['h'] as num?)?.toDouble() ?? 0;

    // 자식이 부모보다 유의미하게 작으면 → merge하지 않고 센터링 컨테이너로 전환
    if ((node.size.width - childW).abs() > 4 ||
        (node.size.height - childH).abs() > 4) {
      layoutMode = 'COLUMN';
      isLayoutNode = true;
      containerLayout['mainAxisAlignment'] = 'center';
      containerLayout['crossAxisAlignment'] = 'center';
      containerLayout['mainAxisSize'] = 'max';
      // fall through → 일반 노드로 반환
    } else {
      // 같은 크기 → 기존 visual merge
      final childVisual = child['visual'] as Map<String, dynamic>;

      // outer visual → child에 병합 (child 기존 값 우선)
      visual.forEach((key, value) {
        if (value != null && !childVisual.containsKey(key)) {
          childVisual[key] = value;
        }
      });

      // outer rect 유지 (바운딩 박스)
      child['rect'] = {
        'x': offset.dx,
        'y': offset.dy,
        'w': node.size.width,
        'h': node.size.height,
      };
      // widgetName 전파 (merge 시 소실 방지)
      if (_widgetNameByRenderObject.containsKey(node) &&
          !child.containsKey('widgetName')) {
        child['widgetName'] = _widgetNameByRenderObject[node];
      }
      return child;
    }
  }

  // ---------------------------------------------------
  // 최종 노드 반환 (새 스키마)
  // ---------------------------------------------------
  final result = <String, dynamic>{
    'type': type,
    'layoutMode': layoutMode,
    'rect': {
      'x': offset.dx,
      'y': offset.dy,
      'w': node.size.width,
      'h': node.size.height,
    },
    'visual': visual,
    'children': children,
  };
  if (containerLayout.isNotEmpty) result['containerLayout'] = containerLayout;
  if (_widgetNameByRenderObject.containsKey(node)) {
    result['widgetName'] = _widgetNameByRenderObject[node];
  }

  // clipsContent 전파: 부모가 clipsContent + borderRadius 이면,
  // 동일 borderRadius를 가진 직계 자식에도 clipsContent 전파
  // (Card → Material 구조: RenderPhysicalModel → RenderDecoratedBox 중복 방지)
  if (visual['clipsContent'] == true && visual['borderRadius'] != null) {
    final parentBr = visual['borderRadius'];
    for (final child in children) {
      if (child is Map<String, dynamic>) {
        final cv = child['visual'] as Map<String, dynamic>?;
        if (cv != null &&
            cv['borderRadius'] != null &&
            cv['borderRadius'].toString() == parentBr.toString() &&
            cv['clipsContent'] != true) {
          cv['clipsContent'] = true;
        }
      }
    }
  }

  // childLayout은 부모가 설정 (위에서 이미 설정됨)
  return result;
}

