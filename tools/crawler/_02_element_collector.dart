/// =======================================================
/// 1. Element 트리 순회해서 위젯 레벨 디자인 정보 수집
/// =======================================================

void _collectDesignInfoFromElements(Element element) {
  final widget = element.widget;

  if (widget is InputDecorator) {
    final InputDecoration deco = widget.decoration;
    Color? bg;
    Color? borderColor;
    double? borderWidth;
    dynamic radius;
    double? borderTopW, borderRightW, borderBottomW, borderLeftW;

    if (deco.filled == true) {
      bg = deco.fillColor;
    }

    // 포커스 상태에 따라 적절한 border 선택
    final bool isFocused = widget.isFocused;
    InputBorder? border;
    if (isFocused) {
      border = deco.focusedBorder ?? deco.border;
    } else {
      border = deco.enabledBorder ?? deco.border;
    }

    // Flutter 테마에서 resolved border color 추출 시도
    Color? themePrimaryColor;
    if (border != null &&
        border.borderSide == const BorderSide() &&
        isFocused) {
      // border가 기본 BorderSide → 테마 primary color 사용
      try {
        final themeData = Theme.of(element);
        themePrimaryColor = themeData.colorScheme.primary;
      } catch (_) {}
    }

    bool isOutlined = false;
    if (border is OutlineInputBorder) {
      isOutlined = true;
      final side = border.borderSide;
      borderColor = themePrimaryColor ?? side.color;
      borderWidth = isFocused ? math.max(side.width, 2.0) : side.width;
      final br = border.borderRadius;
      if (br is BorderRadius) {
        radius = _extractBorderRadius(br);
      }
    } else if (border is UnderlineInputBorder) {
      final side = border.borderSide;
      borderColor = themePrimaryColor ?? side.color;
      borderWidth = isFocused ? math.max(side.width, 2.0) : side.width;
      // 하단 border만 적용
      borderTopW = 0;
      borderRightW = 0;
      borderBottomW = borderWidth;
      borderLeftW = 0;
      final br = border.borderRadius;
      if (br is BorderRadius) {
        radius = _extractBorderRadius(br);
      }
    }

    // outlined + labelText → 부모 배경색 탐색 (floating label notch용)
    String? parentBgColor;
    if (isOutlined && deco.labelText != null) {
      Element? ancestor = element;
      for (int depth = 0; depth < 20 && ancestor != null; depth++) {
        Element? parent;
        ancestor.visitAncestorElements((el) {
          parent = el;
          return false;
        });
        ancestor = parent;
        if (ancestor == null) break;
        final w = ancestor.widget;
        if (w is Scaffold && w.backgroundColor != null) {
          parentBgColor = _colorToHex(w.backgroundColor);
          break;
        }
        if (w is Container && w.color != null) {
          parentBgColor = _colorToHex(w.color);
          break;
        }
        if (w is ColoredBox) {
          parentBgColor = _colorToHex(w.color);
          break;
        }
        if (w is Material && w.color != null) {
          parentBgColor = _colorToHex(w.color);
          break;
        }
      }
      parentBgColor ??= '#ffffffff';
    }

    final ro = element.renderObject;
    if (ro != null) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: bg,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderRadius: radius,
        borderTopWidth: borderTopW,
        borderRightWidth: borderRightW,
        borderBottomWidth: borderBottomW,
        borderLeftWidth: borderLeftW,
        isTextField: true,
        isOutlinedTextField: isOutlined,
        parentBgColor: parentBgColor,
      );
    }
  }

  if (widget is Divider) {
    final ro = element.renderObject;
    if (ro != null && widget.color != null) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: widget.color,
        isDivider: true,
      );
    }
  }

  if (widget is Container) {
    final deco = widget.decoration;
    Color? bg;
    Color? borderColor;
    double? borderWidth;
    dynamic radius;
    double? borderTopW, borderRightW, borderBottomW, borderLeftW;

    // Container(color: ...) → decoration 없이 color만 설정된 경우
    if (deco == null && widget.color != null) {
      bg = widget.color;
    }

    if (deco is BoxDecoration) {
      bg = deco.color;
      final border = deco.border;
      if (border is Border) {
        final sides = [border.top, border.right, border.bottom, border.left];
        BorderSide? best;
        for (final s in sides) {
          if (best == null || s.width > best.width) best = s;
        }
        if (best != null && best.width > 0) {
          borderColor = best.color;
          borderWidth = best.width;
        }
        final uniform = sides.every(
          (s) => s.width == sides[0].width && s.color == sides[0].color,
        );
        if (!uniform) {
          borderTopW = border.top.width;
          borderRightW = border.right.width;
          borderBottomW = border.bottom.width;
          borderLeftW = border.left.width;
        }
      }
      final br = deco.borderRadius;
      if (br is BorderRadius) {
        radius = _extractBorderRadius(br);
      }
    }

    final ro = element.renderObject;
    if (ro != null && (bg != null || borderColor != null || radius != null)) {
      _designInfoByRenderObject[ro] = DesignInfo(
        backgroundColor: bg,
        borderColor: borderColor,
        borderWidth: borderWidth,
        borderRadius: radius,
        borderTopWidth: borderTopW,
        borderRightWidth: borderRightW,
        borderBottomWidth: borderBottomW,
        borderLeftWidth: borderLeftW,
      );
    }
  }

  if (widget is ColoredBox) {
    final ro = element.renderObject;
    if (ro != null) {
      _designInfoByRenderObject[ro] = DesignInfo(backgroundColor: widget.color);
    }
  }

  if (widget.runtimeType.toString().contains('SvgPicture')) {
    final ro = element.renderObject;
    if (ro != null) {
      _svgBoxTargets.add(ro);
    }
  }

  // Material 위젯 (OutlinedButton, ElevatedButton 등의 보더)
  // _ShapeBorderPaint(CustomPaint)로 그려지는 보더는 render tree에서 추출 불가
  // → element tree에서 Material.shape.side를 직접 추출
  if (widget is Material && widget.shape != null) {
    final shape = widget.shape;
    if (shape is OutlinedBorder) {
      final side = shape.side;
      if (side.width > 0 && side.style == BorderStyle.solid) {
        dynamic radius;
        if (shape is RoundedRectangleBorder) {
          final br = shape.borderRadius;
          if (br is BorderRadius) {
            radius = _extractBorderRadius(br);
          }
        }
        final ro = element.renderObject;
        if (ro != null) {
          // 기존 DesignInfo가 있으면 덮어쓰지 않고, 없을 때만 등록
          if (!_designInfoByRenderObject.containsKey(ro)) {
            _designInfoByRenderObject[ro] = DesignInfo(
              borderColor: side.color,
              borderWidth: side.width,
              borderRadius: radius,
            );
          }
        }
      }
    }
  }

  // 전용 위젯 이름 태깅
  final widgetTypeName = widget.runtimeType.toString();
  const namedWidgets = {
    'NavigationToolbar',
    'BottomNavigationBar',
    'Scaffold',
    'AppBar',
    'ListTile',
    'CheckboxListTile',
    'RadioListTile',
  };
  if (namedWidgets.contains(widgetTypeName)) {
    final ro = element.renderObject;
    if (ro != null) {
      _widgetNameByRenderObject[ro] = widgetTypeName;
    }
  }

  // Chip 계열: ComponentElement → renderObject는 하위 첫 RenderObject 반환
  if (widgetTypeName == 'Chip' || widgetTypeName == 'RawChip') {
    final ro = element.renderObject;
    if (ro != null && !_widgetNameByRenderObject.containsKey(ro)) {
      _widgetNameByRenderObject[ro] = 'Chip';
    }
  }

  // Checkbox / Switch → renderObject와 하위 자식 모두 캡처 대상 등록
  const captureWidgets = {
    'Checkbox',
    'Switch',
    'CupertinoSwitch',
    'Slider',
    'Radio',
    'RangeSlider',
    'CircularProgressIndicator',
    'LinearProgressIndicator',
    'ChoiceChip',
    'FilterChip',
    'InputChip',
    'ActionChip',
  };
  if (captureWidgets.contains(widgetTypeName)) {
    final ro = element.renderObject;
    if (ro != null) {
      _markCaptureRecursive(ro);
    }
  }

  // ShaderMask → render tree 순회로 감지 (async phase에서 처리)

  // CustomPaint with painter → painter를 직접 빈 캔버스에 paint (투명 배경)
  // child가 없는 leaf CustomPaint만 캡처 (순수 장식용)
  // Flutter 내부 CustomPaint(child 있음: ink effect, indicator 등)는 스킵 → 자연 분해
  if (widgetTypeName == 'CustomPaint') {
    final cp = widget as CustomPaint;
    if (cp.painter != null && cp.child == null) {
      final ro = element.renderObject;
      if (ro != null) {
        _customPainterByRO[ro] = cp.painter!;
        _markCaptureRecursive(ro);
      }
    }
  }

  // Card → shape, color, elevation, clipBehavior 추출
  if (widget is Card) {
    final ro = element.renderObject;
    if (ro != null) {
      Color? bg = widget.color;
      double? elevation = widget.elevation;
      dynamic radius;
      bool clips = false;

      final shape = widget.shape;
      if (shape is RoundedRectangleBorder) {
        final br = shape.borderRadius;
        if (br is BorderRadius) {
          radius = _extractBorderRadius(br);
        }
      }

      if (widget.clipBehavior != Clip.none) {
        clips = true;
      }

      if (bg != null || radius != null || elevation != null || clips) {
        _designInfoByRenderObject[ro] = DesignInfo(
          backgroundColor: bg,
          borderRadius: radius,
          elevation: elevation,
          clipsContent: clips,
        );
      }
    }
  }

  // FittedBox → boxFit 추출
  if (widget is FittedBox) {
    final ro = element.renderObject;
    if (ro != null) {
      _boxFitByRenderObject[ro] = widget.fit.toString().split('.').last;
    }
  }

  // ClipPath → clipper 등록 (async phase에서 Path 샘플링)
  if (widget is ClipPath) {
    final ro = element.renderObject;
    if (ro != null && widget.clipper != null) {
      _clipperByRenderObject[ro] = widget.clipper!;
    }
  }

  // BackdropFilter → blur sigma 추출
  if (widget is BackdropFilter) {
    try {
      final filter = widget.filter;
      final filterStr = filter.toString();
      // ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0, ...)
      final sigmaMatch = RegExp(r'sigmaX:\s*([\d.]+)').firstMatch(filterStr);
      if (sigmaMatch != null) {
        final sigma = double.tryParse(sigmaMatch.group(1)!) ?? 0;
        if (sigma > 0) {
          final ro = element.renderObject;
          if (ro != null) {
            _blurInfoByRenderObject[ro] = sigma;
          }
        }
      }
    } catch (_) {}
  }

  // Transform.rotate → angle 추출
  if (widget is Transform) {
    try {
      final ro = element.renderObject;
      if (ro != null) {
        // Transform widget의 transform Matrix4에서 rotation 추출
        final t = widget.transform;
        final sinVal = t.entry(1, 0);
        final cosVal = t.entry(0, 0);
        final radians = math.atan2(sinVal, cosVal);
        if (radians.abs() > 0.001) {
          final degrees = radians * 180.0 / math.pi;
          _rotationByRenderObject[ro] = degrees;
          debugPrint(
            '[Transform] captured rotation=${degrees.toStringAsFixed(2)}° for $ro',
          );
        }
      }
    } catch (e) {
      debugPrint('[Transform] angle extraction failed: $e');
    }
  }

  // RotatedBox → quarterTurns 추출 + 노드 등록
  if (widgetTypeName == 'RotatedBox') {
    try {
      final ro = element.renderObject;
      if (ro != null) {
        _rotatedBoxNodes.add(ro);
        final qt = (widget as dynamic).quarterTurns as int;
        final degrees = (qt % 4) * 90.0;
        if (degrees.abs() > 0.001) {
          _rotationByRenderObject[ro] = degrees;
          debugPrint(
            '[RotatedBox] captured rotation=${degrees.toStringAsFixed(0)}° for $ro',
          );
        }
      }
    } catch (e) {
      debugPrint('[RotatedBox] quarterTurns extraction failed: $e');
    }
  }

  element.visitChildren(_collectDesignInfoFromElements);
}
