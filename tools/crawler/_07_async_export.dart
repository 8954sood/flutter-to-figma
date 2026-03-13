/// =======================================================
/// 6. Async export (이미지 pre-capture 포함)
/// =======================================================

Future<String> _figmaExportWithImagesAsync() async {
  _imageDataByNode.clear();
  _customPaintCaptures.clear();
  _blurInfoByRenderObject.clear();
  _rotationByRenderObject.clear();
  _shaderMaskWidgets.clear();
  _shaderMaskGradients.clear();
  _customPainterByRO.clear();
  _clipperByRenderObject.clear();
  _clipPathPoints.clear();
  _boxFitByRenderObject.clear();
  _rotatedBoxNodes.clear();

  // Phase 0: Element tree 순회 → _customPaintCaptures 등록 (pre-capture에 필요)
  final rootElement = WidgetsBinding.instance.renderViewElement;
  if (rootElement != null) {
    try {
      rootElement.visitChildren(_collectDesignInfoFromElements);
    } catch (_) {}
  }

  final root = RendererBinding.instance.renderView;

  // Phase 0.2: ClipPath path 샘플링
  _clipPathPoints.clear();
  for (final entry in _clipperByRenderObject.entries) {
    final ro = entry.key;
    final clipper = entry.value;
    if (ro is RenderBox && ro.hasSize) {
      try {
        final path = clipper.getClip(ro.size);
        final points = <Map<String, double>>[];
        for (final metric in path.computeMetrics()) {
          const step = 2.0;
          for (double d = 0; d <= metric.length; d += step) {
            final tangent = metric.getTangentForOffset(d);
            if (tangent != null) {
              points.add({'x': tangent.position.dx, 'y': tangent.position.dy});
            }
          }
          final last = metric.getTangentForOffset(metric.length);
          if (last != null) {
            points.add({'x': last.position.dx, 'y': last.position.dy});
          }
        }
        if (points.isNotEmpty) {
          _clipPathPoints[ro] = points;
          debugPrint('[ClipPath] sampled ${points.length} points for $ro');
        }
      } catch (e) {
        debugPrint('[ClipPath] path sampling failed: $e');
      }
    }
  }

  // Phase 0.3: ShaderMask gradient 추출 (render tree에서 캡처 후 픽셀 샘플링)
  await _extractShaderMaskGradients(root);

  // Phase 0.5: 스크롤 뷰 pre-scroll → viewport 밖 위젯도 paint 강제
  final scrollPositions = _collectScrollPositions(rootElement);
  final Map<ScrollPosition, double> originalOffsets = {};
  for (final pos in scrollPositions) {
    originalOffsets[pos] = pos.pixels;
  }
  for (final pos in scrollPositions) {
    if (pos.maxScrollExtent <= 0) continue;
    final viewportDim = pos.viewportDimension;
    double current = 0;
    while (current < pos.maxScrollExtent) {
      current = (current + viewportDim).clamp(0.0, pos.maxScrollExtent);
      pos.jumpTo(current);
      await WidgetsBinding.instance.endOfFrame;
      await _preCaptureImages(root);
    }
  }
  // 원래 스크롤 위치로 복원
  for (final pos in scrollPositions) {
    pos.jumpTo(originalOffsets[pos] ?? 0.0);
  }
  await WidgetsBinding.instance.endOfFrame;

  // Phase 1: async pre-capture (상단 viewport 위젯 포함)
  await _preCaptureImages(root);

  // Phase 2: 기존 sync 크롤 (figmaExtractorEntryPoint 재사용)
  // Note: figmaExtractorEntryPoint 내부에서 _customPaintCaptures를 다시 채우지만,
  //       _imageDataByNode는 유지되므로 캡처 이미지가 정상 사용됨
  final result = figmaExtractorEntryPoint();

  _imageDataByNode.clear(); // 메모리 해제
  return result;
}

/// CLI에서 호출: evaluate('figmaStartExportWithImages()') 또는 figmaStartExportWithImages(4.0)
void figmaStartExportWithImages([double pixelRatio = 3.0]) {
  _capturePixelRatio = pixelRatio;
  _asyncExportBusy = true;
  _asyncExportResult = null;
  _figmaExportWithImagesAsync()
      .then((r) {
        _asyncExportResult = r;
        _asyncExportBusy = false;
      })
      .catchError((e) {
        _asyncExportResult = '{"error":"$e"}';
        _asyncExportBusy = false;
      });
}

/// CLI에서 폴링: evaluate('figmaGetExportResult()')
String? figmaGetExportResult() {
  if (_asyncExportBusy) return null;
  return _asyncExportResult;
}

