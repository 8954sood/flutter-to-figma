// ----------------------------
// Text 속성 적용 (flat properties에서 읽기)
// ----------------------------
function applyTextProps(textNode, props) {
  var content = props.content || "";
  var fontFamily = props.fontFamily || "Inter";
  var fontWeight = props.fontWeight || "w400";

  var font = resolveFont(fontFamily, fontWeight);

  try {
    textNode.fontName = font;
  } catch (e) {
    console.warn("[FlutterPlugin] set fontName failed", e);
    try {
      var fallbackFont = resolveFont("Inter", fontWeight);
      textNode.fontName = fallbackFont;
      font = fallbackFont;
    } catch (e2) {
      font = { family: "Inter", style: "Regular" };
      textNode.fontName = font;
    }
  }

  textNode.characters = String(content);

  if (typeof props.fontSize === "number") {
    textNode.fontSize = props.fontSize;
  }

  if (props.gradient) {
    // ShaderMask gradient → 텍스트에 gradient fill 적용
    var g = props.gradient;
    var gColors = g.colors || [];
    if (!Array.isArray(gColors) || gColors.length === 0) {
      // Empty gradient → fallback to solid color (handled below)
      props.gradient = null;
    }
  }
  if (props.gradient) {
    var g = props.gradient;
    var gColors = g.colors || [];
    var gStops = g.stops || [];
    var gradientStops = [];
    for (var gi = 0; gi < gColors.length; gi++) {
      var gc = parseFlutterColor(gColors[gi]);
      gradientStops.push({
        position: gStops[gi] != null ? gStops[gi] : (gi / Math.max(gColors.length - 1, 1)),
        color: { r: gc.r, g: gc.g, b: gc.b, a: gc.a }
      });
    }
    var gFill = { type: "GRADIENT_LINEAR", gradientStops: gradientStops };
    var gbx = g.begin ? g.begin.x : 0.5;
    var gby = g.begin ? g.begin.y : 0;
    var gex = g.end ? g.end.x : 0.5;
    var gey = g.end ? g.end.y : 1;
    gFill.gradientTransform = buildLinearGradientTransform(gbx, gby, gex, gey);
    textNode.fills = [gFill];
  } else if (props.color) {
    var c = parseFlutterColor(props.color);
    textNode.fills = [{
      type: "SOLID",
      color: { r: c.r, g: c.g, b: c.b },
      opacity: c.a,
    }];
  }

  if (props.letterSpacing != null) {
    var ls = Number(props.letterSpacing);
    if (!isNaN(ls)) {
      textNode.letterSpacing = { value: ls, unit: "PIXELS" };
    }
  }

  if (props.lineHeightMultiplier != null && props.fontSize) {
    var lh = Number(props.lineHeightMultiplier) * Number(props.fontSize);
    if (!isNaN(lh) && lh > 0) {
      textNode.lineHeight = { value: lh, unit: "PIXELS" };
    }
  }

  if (props.textAlign) {
    textNode.textAlignHorizontal = mapTextAlign(props.textAlign);
  }

  // RichText: 개별 TextSpan range 스타일 적용
  if (props.textSpans && Array.isArray(props.textSpans) && props.textSpans.length > 0) {
    var totalLen = textNode.characters.length;
    for (var si = 0; si < props.textSpans.length; si++) {
      var span = props.textSpans[si];
      var start = span.start || 0;
      var end = span.end || 0;
      if (start >= end || start >= totalLen) continue;
      if (end > totalLen) end = totalLen;

      try {
        if (typeof span.fontSize === "number") {
          textNode.setRangeFontSize(start, end, span.fontSize);
        }
        if (span.fontWeight || span.fontFamily) {
          var spanFont = resolveFont(span.fontFamily || fontFamily, span.fontWeight || fontWeight);
          textNode.setRangeFontName(start, end, spanFont);
        }
        if (span.color) {
          var sc = parseFlutterColor(span.color);
          textNode.setRangeFills(start, end, [{
            type: "SOLID",
            color: { r: sc.r, g: sc.g, b: sc.b },
            opacity: sc.a,
          }]);
        }
        if (span.letterSpacing != null) {
          var sls = Number(span.letterSpacing);
          if (!isNaN(sls)) {
            textNode.setRangeLetterSpacing(start, end, { value: sls, unit: "PIXELS" });
          }
        }
        if (span.lineHeightMultiplier != null && span.fontSize) {
          var slh = Number(span.lineHeightMultiplier) * Number(span.fontSize);
          if (!isNaN(slh) && slh > 0) {
            textNode.setRangeLineHeight(start, end, { value: slh, unit: "PIXELS" });
          }
        }
      } catch (e) {
        console.warn("[FlutterPlugin] setRange failed for span", si, e);
      }
    }
  }
}

// ----------------------------
// Image 적용 (flat properties에서 읽기)
// ----------------------------
function applyImageProps(rectNode, props) {
  var b64 = props.imageBase64;
  if (!b64) {
    rectNode.fills = [];
    return;
  }

  try {
    var bytes = base64ToUint8Array(b64);
    var image = figma.createImage(bytes);
    // boxFit이 있으면 우선 사용, 없으면 imageFit 사용
    var scaleMode = props.boxFit
      ? mapBoxFitToScaleMode(props.boxFit)
      : mapImageFit(props.imageFit || "cover");

    rectNode.fills = [{
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: scaleMode,
    }];
  } catch (e) {
    console.warn("[FlutterPlugin] image decode failed, use gray fill", e);
    rectNode.fills = [{
      type: "SOLID",
      color: { r: 0.85, g: 0.85, b: 0.85 },
      opacity: 1,
    }];
  }
}
