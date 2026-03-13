/// =======================================================
/// 5. 외부 진입점
/// =======================================================

String figmaExtractorEntryPoint() {
  try {
    debugPrint('[FigmaCrawler] ===== START (v2) =====');
    _designInfoByRenderObject.clear();
    _svgBoxTargets.clear();
    _widgetNameByRenderObject.clear();
    _customPaintCaptures.clear();
    _blurInfoByRenderObject.clear();
    _rotationByRenderObject.clear();
    _shaderMaskWidgets.clear();
    _customPainterByRO.clear();
    _clipperByRenderObject.clear();
    _boxFitByRenderObject.clear();
    _rotatedBoxNodes.clear();
    // _shaderMaskGradients, _clipPathPoints는 async phase에서 채워지므로 여기서 clear하지 않음

    final rootElement = WidgetsBinding.instance.renderViewElement;
    if (rootElement != null) {
      try {
        rootElement.visitChildren(_collectDesignInfoFromElements);
      } catch (e, st) {
        debugPrint('[FigmaCrawler] Step 1 ERROR: $e\n$st');
      }
    }

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

    final data = <String, dynamic>{
      'type': 'Frame',
      'name': 'Flutter Screen',
      'layoutMode': 'COLUMN',
      'rect': {
        'x': 0.0,
        'y': 0.0,
        'w': screenSize.width,
        'h': screenSize.height,
      },
      'visual': {'backgroundColor': '#ffffffff'},
      'containerLayout': {
        'mainAxisAlignment': 'start',
        'crossAxisAlignment': 'stretch',
        'mainAxisSize': 'max',
        'itemSpacing': 0.0,
        'padding': {'top': 0.0, 'right': 0.0, 'bottom': 0.0, 'left': 0.0},
      },
      'children': rootChildren,
    };

    _keepLastScaffold(data);

    final result = jsonEncode(data);
    debugPrint('[FigmaCrawler] ===== DONE (${result.length} chars) =====');
    return result;
  } catch (e, st) {
    debugPrint('[FigmaCrawler] FATAL ERROR: $e\n$st');
    return jsonEncode({'error': e.toString(), 'stackTrace': st.toString()});
  }
}

/// =======================================================
/// 5.5. 스크롤 위치 수집
/// =======================================================

List<ScrollPosition> _collectScrollPositions(Element? rootElement) {
  final List<ScrollPosition> positions = [];
  if (rootElement == null) return positions;
  void visit(Element element) {
    final widget = element.widget;
    if (widget is Scrollable) {
      try {
        final scrollable =
            (element as StatefulElement).state as ScrollableState;
        positions.add(scrollable.position);
      } catch (_) {}
    }
    element.visitChildren(visit);
  }

  rootElement.visitChildren(visit);
  return positions;
}

