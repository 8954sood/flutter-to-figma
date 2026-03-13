// ----------------------------
// applyVisualProps: 배경색, 테두리, 둥근 모서리, 그림자
// ----------------------------
function applyVisualProps(frame, props) {
  // 배경 이미지
  if (props.backgroundImageBase64) {
    try {
      var bytes = base64ToUint8Array(props.backgroundImageBase64);
      var image = figma.createImage(bytes);
      var scaleMode = props.boxFit
        ? mapBoxFitToScaleMode(props.boxFit)
        : mapImageFit(props.imageFit || "cover");
      frame.fills = [{
        type: "IMAGE",
        imageHash: image.hash,
        scaleMode: scaleMode,
      }];
    } catch (e) {
      console.warn("[FlutterPlugin] background image decode failed", e);
      applyBgColor(frame, props);
    }
  } else if (props.gradient) {
    applyGradient(frame, props);
  } else {
    applyBgColor(frame, props);
  }

  // Border
  if (props.hasBorder && props.borderColor) {
    var bc = parseFlutterColor(props.borderColor);
    frame.strokes = [{
      type: "SOLID",
      color: { r: bc.r, g: bc.g, b: bc.b },
      opacity: bc.a,
    }];
    if (props.borderTopWidth != null) {
      frame.strokeTopWeight = props.borderTopWidth;
      frame.strokeRightWeight = props.borderRightWidth;
      frame.strokeBottomWeight = props.borderBottomWidth;
      frame.strokeLeftWeight = props.borderLeftWidth;
    } else {
      frame.strokeWeight = typeof props.borderWidth === "number" ? props.borderWidth : 1;
    }
  } else {
    frame.strokes = [];
  }

  // Corner radius (uniform 또는 per-corner)
  var brVal = props.borderRadius;
  if (brVal && typeof brVal === "object" && brVal.tl != null) {
    // per-corner radius
    frame.topLeftRadius = brVal.tl || 0;
    frame.topRightRadius = brVal.tr || 0;
    frame.bottomLeftRadius = brVal.bl || 0;
    frame.bottomRightRadius = brVal.br || 0;
  } else {
    var br = parseBorderRadius(brVal);
    if (br > 0) {
      frame.cornerRadius = br;
    }
  }

  // Effects (shadow + background blur 누적)
  var effects = [];
  if (props.shadowColor) {
    var sc = parseFlutterColor(props.shadowColor);
    effects.push({
      type: "DROP_SHADOW",
      color: { r: sc.r, g: sc.g, b: sc.b, a: sc.a },
      offset: { x: props.shadowOffsetX || 0, y: props.shadowOffsetY || 0 },
      radius: props.shadowBlurRadius || 0,
      spread: props.shadowSpreadRadius || 0,
      visible: true,
      blendMode: "NORMAL",
    });
  } else if (props.elevation && typeof props.elevation === "number" && props.elevation > 0) {
    var elev = props.elevation;
    effects.push({
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: elev },
      radius: elev * 2,
      visible: true,
      blendMode: "NORMAL",
    });
  }
  if (props.backgroundBlur && typeof props.backgroundBlur === "number" && props.backgroundBlur > 0) {
    effects.push({
      type: "BACKGROUND_BLUR",
      radius: props.backgroundBlur,
      visible: true,
    });
  }
  frame.effects = effects;
}

function applyBgColor(frame, props) {
  if (props.backgroundColor && !isTransparent(props.backgroundColor)) {
    var c = parseFlutterColor(props.backgroundColor);
    frame.fills = [{
      type: "SOLID",
      color: { r: c.r, g: c.g, b: c.b },
      opacity: c.a,
    }];
  } else {
    frame.fills = [];
  }
}

function applyGradient(frame, props) {
  var g = props.gradient;
  var colors = g.colors || [];
  var stops = g.stops || [];

  var gradientStops = [];
  for (var i = 0; i < colors.length; i++) {
    var c = parseFlutterColor(colors[i]);
    gradientStops.push({
      position: stops[i] != null ? stops[i] : (i / Math.max(colors.length - 1, 1)),
      color: { r: c.r, g: c.g, b: c.b, a: c.a }
    });
  }

  var fill = { gradientStops: gradientStops };

  if (g.type === "linear") {
    fill.type = "GRADIENT_LINEAR";
    var bx = g.begin ? g.begin.x : 0.5;
    var by = g.begin ? g.begin.y : 0;
    var ex = g.end ? g.end.x : 0.5;
    var ey = g.end ? g.end.y : 1;
    fill.gradientTransform = buildLinearGradientTransform(bx, by, ex, ey);
  } else if (g.type === "radial") {
    fill.type = "GRADIENT_RADIAL";
    var cx = g.center ? g.center.x : 0.5;
    var cy = g.center ? g.center.y : 0.5;
    var r = g.radius || 0.5;
    var fw = frame.width || 100;
    var fh = frame.height || 100;
    fill.gradientTransform = buildRadialGradientTransform(cx, cy, r, fw, fh);
  } else if (g.type === "sweep") {
    fill.type = "GRADIENT_ANGULAR";
    var cx = g.center ? g.center.x : 0.5;
    var cy = g.center ? g.center.y : 0.5;
    fill.gradientTransform = buildSweepGradientTransform(cx, cy);
  }

  frame.fills = [fill];
}

function buildLinearGradientTransform(bx, by, ex, ey) {
  var dx = ex - bx;
  var dy = ey - by;
  var len2 = dx * dx + dy * dy;
  if (len2 < 0.0001) {
    return [[1, 0, 0], [0, 1, 0]];
  }
  // Transform maps ELEMENT space → GRADIENT space
  // u = dot(p - begin, dir) / len^2  → color position (0=start, 1=end)
  // v = dot(p - begin, perp) / len^2 + 0.5  → perpendicular (centered)
  var a = dx / len2;
  var b = dy / len2;
  var tx = -(bx * dx + by * dy) / len2;
  var c = -dy / len2;
  var d = dx / len2;
  var ty = (bx * dy - by * dx) / len2 + 0.5;
  var result = [
    [a, b, tx],
    [c, d, ty],
  ];
  console.log("[GradientTransform] begin=(" + bx + "," + by + ") end=(" + ex + "," + ey + ")");
  console.log("[GradientTransform] len2=" + len2 + " a=" + a + " b=" + b + " tx=" + tx);
  console.log("[GradientTransform] result:", JSON.stringify(result));
  return result;
}

// gradientTransform: element 공간 [0,1] → gradient 공간 [0,1] 매핑
// gradient 공간에서 원의 중심은 (0.5, 0.5), 반지름은 0.5
// Flutter RadialGradient.radius는 shortest side의 비율
function buildRadialGradientTransform(cx, cy, r, frameW, frameH) {
  var minDim = Math.min(frameW, frameH);
  var radiusPx = r * minDim;
  // 각 축의 normalized radius (element [0,1] 공간)
  var rx = radiusPx / frameW;
  var ry = radiusPx / frameH;
  // gradient 반지름 0.5 → element 반지름 rx,ry 로 매핑
  var sx = 1 / (2 * rx);
  var sy = 1 / (2 * ry);
  return [
    [sx, 0, 0.5 - cx * sx],
    [0, sy, 0.5 - cy * sy]
  ];
}

// Sweep(Angular) gradient: element → gradient, center만 매핑
function buildSweepGradientTransform(cx, cy) {
  return [
    [1, 0, 0.5 - cx],
    [0, 1, 0.5 - cy]
  ];
}
