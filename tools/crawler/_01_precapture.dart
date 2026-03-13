/// =======================================================
/// 0.5 Pre-capture: 이미지/아이콘 → base64 (async)
/// =======================================================

Future<void> _preCaptureImages(RenderObject node) async {
  // RenderImage → 축소 후 PNG 인코딩 (maxDim = 512 * pixelRatio)
  if (node is RenderImage) {
    try {
      final ui.Image? img = node.image;
      if (img != null) {
        final maxDim = (512 * _capturePixelRatio).round();
        int targetW = img.width;
        int targetH = img.height;
        if (targetW > maxDim || targetH > maxDim) {
          final scale = maxDim / (targetW > targetH ? targetW : targetH);
          targetW = (targetW * scale).ceil();
          targetH = (targetH * scale).ceil();
        }
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(recorder);
        canvas.drawImageRect(
          img,
          Rect.fromLTWH(0, 0, img.width.toDouble(), img.height.toDouble()),
          Rect.fromLTWH(0, 0, targetW.toDouble(), targetH.toDouble()),
          Paint(),
        );
        final picture = recorder.endRecording();
        final resized = await picture.toImage(targetW, targetH);
        final byteData = await resized.toByteData(
          format: ui.ImageByteFormat.png,
        );
        if (byteData != null) {
          _imageDataByNode[node] = base64Encode(byteData.buffer.asUint8List());
        }
      }
    } catch (_) {}
  }

  // MaterialIcons → TextPainter → PictureRecorder → toImage()
  if (node is RenderParagraph) {
    try {
      final span = node.text;
      if (span is TextSpan &&
          span.style?.fontFamily?.contains('MaterialIcons') == true) {
        final double pr = _capturePixelRatio;
        final outW = (node.size.width * pr).ceil();
        final outH = (node.size.height * pr).ceil();
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(
          recorder,
          Rect.fromLTWH(0, 0, outW.toDouble(), outH.toDouble()),
        );
        canvas.scale(pr);
        final painter = TextPainter(
          text: span,
          textDirection: TextDirection.ltr,
        );
        painter.layout();
        painter.paint(canvas, Offset.zero);
        final picture = recorder.endRecording();
        final img = await picture.toImage(outW, outH);
        final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
        if (byteData != null) {
          _imageDataByNode[node] = base64Encode(byteData.buffer.asUint8List());
        }
      }
    } catch (_) {}
  }

  // CustomPaint with painter → 투명 배경에 painter만 직접 paint
  if (node is RenderBox &&
      _customPainterByRO.containsKey(node) &&
      !_imageDataByNode.containsKey(node)) {
    try {
      final painter = _customPainterByRO[node]!;
      final w = node.size.width;
      final h = node.size.height;
      if (w > 0 && h > 0) {
        final double pr = _capturePixelRatio;
        final outW = (w * pr).round();
        final outH = (h * pr).round();
        final recorder = ui.PictureRecorder();
        final canvas = Canvas(
          recorder,
          Rect.fromLTWH(0, 0, outW.toDouble(), outH.toDouble()),
        );
        canvas.scale(pr);
        painter.paint(canvas, Size(w, h));
        final picture = recorder.endRecording();
        final img = await picture.toImage(outW, outH);
        final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
        img.dispose();
        if (byteData != null) {
          _imageDataByNode[node] = base64Encode(byteData.buffer.asUint8List());
        }
      }
    } catch (e) {
      debugPrint('[CustomPainter] direct paint failed: $e');
    }
  }

  // Checkbox / Switch / RangeSlider 등 → 투명 배경에 직접 paint (우선)
  // 사방 4px 여유 포함하여 overflow paint(리플/그림자) 캡처
  if (node is RenderBox &&
      _customPaintCaptures.contains(node) &&
      !_imageDataByNode.containsKey(node)) {
    try {
      final w = node.size.width;
      final h = node.size.height;
      if (w > 0 && h > 0) {
        final double pr = _capturePixelRatio;
        const double pad = 4.0;
        final paintW = w + pad * 2;
        final paintH = h + pad * 2;
        final layer = OffsetLayer();
        final context = PaintingContext(
          layer,
          Rect.fromLTWH(0, 0, paintW, paintH),
        );
        node.paint(context, Offset(pad, pad));
        context.stopRecordingIfNeeded();
        final img = await layer.toImage(
          Rect.fromLTWH(0, 0, paintW, paintH),
          pixelRatio: pr,
        );
        final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
        if (byteData != null) {
          _imageDataByNode[node] = base64Encode(byteData.buffer.asUint8List());
        }
      }
    } catch (e) {
      debugPrint(
        '[preCapture] direct paint FAILED for ${node.runtimeType}: $e',
      );
    }
  }

  // Fallback: direct paint 실패 시 RepaintBoundary crop
  if (node is RenderBox &&
      _customPaintCaptures.contains(node) &&
      !_imageDataByNode.containsKey(node)) {
    try {
      final w = node.size.width;
      final h = node.size.height;
      if (w > 0 && h > 0) {
        final double pr = _capturePixelRatio;
        const double pad = 4.0;
        RenderObject? ancestor = node.parent;
        RenderRepaintBoundary? bestBoundary;
        while (ancestor != null) {
          if (ancestor is RenderRepaintBoundary) {
            bestBoundary = ancestor;
            if (ancestor.size.width >= w + pad * 2 &&
                ancestor.size.height >= h + pad * 2) {
              break;
            }
          }
          ancestor = ancestor.parent;
        }
        ancestor = bestBoundary;
        if (ancestor is RenderRepaintBoundary) {
          final img = await ancestor.toImage(pixelRatio: pr);
          final nodeOffset = node.localToGlobal(Offset.zero);
          final boundaryOffset = (ancestor as RenderBox).localToGlobal(
            Offset.zero,
          );
          final outW = ((w + pad * 2) * pr).round();
          final outH = ((h + pad * 2) * pr).round();
          final rawSrcX = (nodeOffset.dx - boundaryOffset.dx - pad) * pr;
          final rawSrcY = (nodeOffset.dy - boundaryOffset.dy - pad) * pr;
          final srcX = rawSrcX.clamp(0.0, img.width.toDouble());
          final srcY = rawSrcY.clamp(0.0, img.height.toDouble());
          final dstX = srcX - rawSrcX;
          final dstY = srcY - rawSrcY;
          final srcW = (outW.toDouble() - dstX).clamp(
            0.0,
            img.width.toDouble() - srcX,
          );
          final srcH = (outH.toDouble() - dstY).clamp(
            0.0,
            img.height.toDouble() - srcY,
          );
          if (srcW > 0 && srcH > 0) {
            final recorder = ui.PictureRecorder();
            final canvas = Canvas(
              recorder,
              Rect.fromLTWH(0, 0, outW.toDouble(), outH.toDouble()),
            );
            canvas.drawImageRect(
              img,
              Rect.fromLTWH(srcX, srcY, srcW, srcH),
              Rect.fromLTWH(dstX, dstY, srcW, srcH),
              Paint(),
            );
            final picture = recorder.endRecording();
            final cropped = await picture.toImage(outW, outH);
            final byteData = await cropped.toByteData(
              format: ui.ImageByteFormat.png,
            );
            if (byteData != null) {
              _imageDataByNode[node] = base64Encode(
                byteData.buffer.asUint8List(),
              );
            }
          }
        }
      }
    } catch (e) {
      debugPrint(
        '[preCapture] RepaintBoundary crop FAILED for ${node.runtimeType}: $e',
      );
    }
  }

  // 자식 재귀 (visitChildren은 sync callback → 리스트 수집 후 순회)
  final children = <RenderObject>[];
  node.visitChildren((child) => children.add(child));
  for (final child in children) {
    await _preCaptureImages(child);
  }
}
