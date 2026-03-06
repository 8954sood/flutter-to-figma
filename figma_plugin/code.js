// ============================
// Flutter Layout → Figma (단일 화면, 부모 rect 기준 상대좌표)
// ============================

figma.showUI(__html__, { width: 360, height: 380 });

var loadedFonts = {}; // "family::style" → true

// ----------------------------
// UI 메시지 핸들러
// ----------------------------
figma.ui.onmessage = function (msg) {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "render-flutter-layout" || msg.type === "import-layout") {
    var jsonText = msg.json || msg.data;
    if (!jsonText) {
      figma.notify("JSON 내용이 비어 있습니다.");
      return;
    }

    var root;
    try {
      root = JSON.parse(jsonText);
    } catch (e) {
      console.error("[FlutterPlugin] JSON parse error", e);
      figma.notify("JSON 파싱에 실패했습니다.");
      return;
    }

    renderWholeLayout(root)
      .then(function () {
        figma.notify("레이아웃 복원이 완료되었습니다.");
      })
      .catch(function (e) {
        console.error("[FlutterPlugin] renderWholeLayout error", e);
        var msgText = "Import failed";
        if (e && e.message) msgText += ": " + e.message;
        figma.notify(msgText);
      });
  }
};

// ----------------------------
// 전체를 한 화면으로 렌더링
// ----------------------------
async function renderWholeLayout(root) {
  figma.currentPage.selection = [];

  var screen = Array.isArray(root) ? root[0] : root;
  if (!screen || typeof screen !== "object") {
    throw new Error("루트 화면 노드를 찾지 못했습니다.");
  }

  await preloadFonts(screen);

  var rect = screen.rect || {};
  var frameW = typeof rect.w === "number" ? rect.w : 375;
  var frameH = typeof rect.h === "number" ? rect.h : 812;

  var screenFrame = figma.createFrame();
  screenFrame.name = screen.name || screen.description || "Flutter Screen";
  screenFrame.resize(frameW, frameH);
  screenFrame.x = 0;
  screenFrame.y = 0;
  screenFrame.clipsContent = false;

  var firstProps = screen.properties || {};
  applyFrameProps(screenFrame, firstProps);

  var rootRect = {
    x: typeof rect.x === "number" ? rect.x : 0,
    y: typeof rect.y === "number" ? rect.y : 0,
    w: frameW,
    h: frameH,
  };

  renderNodeTree(screen, screenFrame, rootRect, {});

  figma.currentPage.selection = [screenFrame];
  figma.viewport.scrollAndZoomIntoView([screenFrame]);
}

// ----------------------------
// 트리 전체에서 필요한 폰트 preload
// ----------------------------
async function preloadFonts(rootNode) {
  var fontSet = {};

  function addFont(font) {
    var key = font.family + "::" + font.style;
    if (!fontSet[key]) {
      fontSet[key] = font;
    }
  }

  function visit(node) {
    if (!node || typeof node !== "object") return;

    if (node.type === "Text" && node.properties) {
      var props = node.properties;
      var fam = props.fontFamily || null;
      var weight = props.fontWeight || "FontWeight.w400";
      var font = resolveFont(fam, weight);
      addFont(font);
    }

    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      visit(children[i]);
    }
  }

  visit(rootNode);

  addFont({ family: "Inter", style: "Regular" });
  addFont({ family: "Inter", style: "Bold" });

  var keys = Object.keys(fontSet);
  var promises = [];

  for (var i = 0; i < keys.length; i++) {
    (function () {
      var font = fontSet[keys[i]];
      var key = font.family + "::" + font.style;
      if (loadedFonts[key]) return;
      var p = figma
        .loadFontAsync(font)
        .then(function () {
          loadedFonts[key] = true;
        })
        .catch(function (e) {
          console.warn("[FlutterPlugin] loadFontAsync failed", font, e);
        });
      promises.push(p);
    })();
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

// ----------------------------
// 트리 렌더링 (부모 rect 기준 상대좌표, 동기 버전)
// ----------------------------
function renderNodeTree(node, parentFigma, parentRect, parentNodeProps) {
  if (!node || typeof node !== "object") return;

  var rect = node.rect || {};
  var props = node.properties || {};
  var pProps = parentNodeProps || {};

  // 부모가 Auto Layout인지 확인
  var parentIsAutoLayout =
    pProps.layoutMode === "HORIZONTAL" || pProps.layoutMode === "VERTICAL" ||
    pProps.paddingTop != null || pProps.paddingRight != null ||
    pProps.paddingBottom != null || pProps.paddingLeft != null;

  var parentX =
    parentRect && typeof parentRect.x === "number" ? parentRect.x : 0;
  var parentY =
    parentRect && typeof parentRect.y === "number" ? parentRect.y : 0;

  var x = typeof rect.x === "number" ? rect.x : 0;
  var y = typeof rect.y === "number" ? rect.y : 0;
  var w = typeof rect.w === "number" ? rect.w : 0;
  var h = typeof rect.h === "number" ? rect.h : 0;

  var localX = x - parentX;
  var localY = y - parentY;

  var figNode = null;

  try {
    if (node.type === "Frame") {
      if (
        w === 0 &&
        h === 0 &&
        (!props.backgroundColor || props.backgroundColor === "#00000000")
      ) {
        figNode = null;
      } else {
        figNode = figma.createFrame();
        if (w > 0 && h > 0) figNode.resize(w, h);
        figNode.clipsContent = false;
        applyFrameProps(figNode, props);
      }
    } else if (node.type === "Text") {
      figNode = figma.createText();
      applyTextProps(figNode, props);
    } else if (node.type === "Image") {
      figNode = figma.createRectangle();
      if (w > 0 && h > 0) figNode.resize(w, h);
      applyImageProps(figNode, props);
    }
  } catch (e) {
    console.warn("[FlutterPlugin] create figNode error, skip node:", e, node);
    figNode = null;
  }

  if (figNode) {
    // Auto Layout 부모일 때: 절대좌표 건너뛰기 + flex 속성 적용
    if (parentIsAutoLayout) {
      // flexGrow: Expanded/Flexible 자식
      if (typeof props.flexGrow === "number" && props.flexGrow > 0) {
        figNode.layoutGrow = 1;
      }
      // 부모가 crossAxisAlignment.stretch이면
      var parentCross = mapCrossAxisAlign(pProps.crossAxisAlignment);
      if (parentCross === "STRETCH") {
        figNode.layoutAlign = "STRETCH";
      }
      // Auto Layout 자식은 x/y를 설정하지 않음 (Figma가 자동 배치)
    } else {
      figNode.x = localX;
      figNode.y = localY;
    }

    figNode.name = node.name || node.description || node.type || "Node";
    parentFigma.appendChild(figNode);
  }

  var container = figNode || parentFigma;
  var children = node.children || [];
  var nextParentRect = rect;

  for (var i = 0; i < children.length; i++) {
    renderNodeTree(children[i], container, nextParentRect, props);
  }
}

// ----------------------------
// Flutter Alignment → Figma 정렬 매핑
// ----------------------------
function mapMainAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "spaceBetween") return "SPACE_BETWEEN";
  return "MIN"; // start, default
}

function mapCrossAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "stretch") return "STRETCH";
  return "MIN"; // start, default
}

// ----------------------------
// Frame 스타일 적용
// ----------------------------
function applyFrameProps(frame, props) {
  // --- Auto Layout 적용 ---
  if (props.layoutMode === "HORIZONTAL" || props.layoutMode === "VERTICAL") {
    frame.layoutMode = props.layoutMode;
    frame.itemSpacing = typeof props.itemSpacing === "number" ? props.itemSpacing : 0;

    // Padding
    frame.paddingTop = typeof props.paddingTop === "number" ? props.paddingTop : 0;
    frame.paddingRight = typeof props.paddingRight === "number" ? props.paddingRight : 0;
    frame.paddingBottom = typeof props.paddingBottom === "number" ? props.paddingBottom : 0;
    frame.paddingLeft = typeof props.paddingLeft === "number" ? props.paddingLeft : 0;

    // Primary axis sizing (mainAxisSize: min → HUG, max → FIXED)
    frame.primaryAxisSizingMode = props.mainAxisSize === "AUTO" ? "AUTO" : "FIXED";
    // Counter axis sizing
    var crossAlign = mapCrossAxisAlign(props.crossAxisAlignment);
    frame.counterAxisSizingMode = crossAlign === "STRETCH" ? "FIXED" : "AUTO";

    // Alignment
    frame.primaryAxisAlignItems = mapMainAxisAlign(props.mainAxisAlignment);
    frame.counterAxisAlignItems = crossAlign === "STRETCH" ? "MIN" : crossAlign;
  } else if (
    props.paddingTop != null || props.paddingRight != null ||
    props.paddingBottom != null || props.paddingLeft != null
  ) {
    // 단독 Padding → Auto Layout VERTICAL + padding + HUG sizing
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.itemSpacing = 0;
    frame.paddingTop = typeof props.paddingTop === "number" ? props.paddingTop : 0;
    frame.paddingRight = typeof props.paddingRight === "number" ? props.paddingRight : 0;
    frame.paddingBottom = typeof props.paddingBottom === "number" ? props.paddingBottom : 0;
    frame.paddingLeft = typeof props.paddingLeft === "number" ? props.paddingLeft : 0;
  } else {
    frame.layoutMode = "NONE";
  }

  // 1) 배경 이미지가 있으면 최우선으로 사용
  if (props.backgroundImageBase64) {
    try {
      var bytes = base64ToUint8Array(props.backgroundImageBase64);
      var image = figma.createImage(bytes);
      var scaleMode = mapImageFit(
        props.backgroundImageFit || props.fit || "cover"
      );

      frame.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: scaleMode,
        },
      ];
    } catch (e) {
      console.warn(
        "[FlutterPlugin] background image decode failed, use color fallback",
        e
      );
      applyFrameColorFallback(frame, props);
    }
  } else {
    // 이미지가 없으면 색상/투명 배경 사용
    applyFrameColorFallback(frame, props);
  }

  // Border
  var hasBorderFlag = !!props.hasBorder;
  var hasBorderColor = !!props.borderColor;

  if (hasBorderFlag || hasBorderColor) {
    var bc = parseFlutterColor(props.borderColor || "#ff000000");
    frame.strokes = [
      {
        type: "SOLID",
        color: { r: bc.r, g: bc.g, b: bc.b },
        opacity: bc.a,
      },
    ];

    if (typeof props.borderWidth === "number") {
      frame.strokeWeight = props.borderWidth;
    } else {
      frame.strokeWeight = 1;
    }
  } else {
    frame.strokes = [];
  }

  // Corner radius
  if (props.borderRadius != null) {
    var br = String(props.borderRadius);
    if (br.indexOf("zero") !== -1) {
      frame.cornerRadius = 0;
    } else {
      var v = parseFloat(br);
      if (!isNaN(v)) frame.cornerRadius = v;
    }
  }

  // Shadow
  if (props.hasShadow && typeof props.elevation === "number") {
    var e = props.elevation;
    frame.effects = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: e },
        radius: e * 2,
        visible: true,
        blendMode: "NORMAL",
      },
    ];
  } else {
    frame.effects = [];
  }
}

// Frame 색상/투명 배경만 처리하는 헬퍼
function applyFrameColorFallback(frame, props) {
  if (props.backgroundColor) {
    var c = parseFlutterColor(props.backgroundColor);
    frame.fills = [
      {
        type: "SOLID",
          color: { r: c.r, g: c.g, b: c.b },
          opacity: c.a,
      },
    ];
  } else {
    frame.fills = [];
  }
}

// ----------------------------
// Text 스타일 적용
// ----------------------------
function applyTextProps(textNode, props) {
  var content = props.content || "";
  var fontFamily = props.fontFamily || "Inter";
  var fontWeight = props.fontWeight || "FontWeight.w400";

  var font = resolveFont(fontFamily, fontWeight);

  try {
    textNode.fontName = font;
  } catch (e) {
    console.warn("[FlutterPlugin] set fontName failed, fallback with same weight", e);

    var fallbackFont;
    try {
      fallbackFont = resolveFont("Inter", fontWeight);
      textNode.fontName = fallbackFont;
      font = fallbackFont;
    } catch (e2) {
      console.warn("[FlutterPlugin] fallback resolveFont failed, final fallback Inter Regular", e2);
      font = { family: "Inter", style: "Regular" };
      textNode.fontName = font;
    }
  }

  textNode.characters = String(content);

  if (typeof props.fontSize === "number") {
    textNode.fontSize = props.fontSize;
  }

  if (props.color) {
    var c = parseFlutterColor(props.color);
    textNode.fills = [{
      type: "SOLID",
      color: { r: c.r, g: c.g, b: c.b },
      opacity: c.a
    }];
  }

  if (props.letterSpacing != null) {
    var ls = Number(props.letterSpacing);
    if (!isNaN(ls)) {
      textNode.letterSpacing = { value: ls, unit: "PIXELS" };
    }
  }

  if (props.textAlign) {
    textNode.textAlignHorizontal = mapTextAlign(props.textAlign);
  }
}

// ----------------------------
// Image 적용 (일반 Image node)
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
    var scaleMode = mapImageFit(props.fit);

    rectNode.fills = [{
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: scaleMode
    }];
  } catch (e) {
    console.warn("[FlutterPlugin] image decode failed, use gray fill", e);
    rectNode.fills = [{
      type: "SOLID",
      color: { r: 0.85, g: 0.85, b: 0.85 },
      opacity: 1
    }];
  }
}

// ----------------------------
// 헬퍼: 색상 파싱 (Flutter ARGB → Figma RGBA)
// ----------------------------
function parseFlutterColor(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  var value = hex.trim();
  if (value.charAt(0) === "#") value = value.slice(1);

  var a = 1;
  var r = 0;
  var g = 0;
  var b = 0;

  if (value.length === 8) {
    a = parseInt(value.slice(0, 2), 16) / 255;
    r = parseInt(value.slice(2, 4), 16) / 255;
    g = parseInt(value.slice(4, 6), 16) / 255;
    b = parseInt(value.slice(6, 8), 16) / 255;
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16) / 255;
    g = parseInt(value.slice(2, 4), 16) / 255;
    b = parseInt(value.slice(4, 6), 16) / 255;
  }

  return { r: r, g: g, b: b, a: a };
}

// ----------------------------
// 폰트 이름 매핑 (Flutter FontWeight → 스타일)
// ----------------------------
function resolveFont(family, fontWeight) {
  var key = String(fontWeight).split(".").pop() || "w400";

  var map = {
    w100: "Thin",
    w200: "Extra light",
    w300: "Light",
    w400: "Regular",
    w500: "Medium",
    w600: "Semi bold",
    w700: "Bold",
    w800: "Extra bold",
    w900: "Black",
  };

  var style = map[key] || "Regular";

  if (!family) {
    return { family: "Inter", style: style };
  }

  return { family: family, style: style };
}

// ----------------------------
// TextAlign 매핑
// ----------------------------
function mapTextAlign(textAlign) {
  var key = String(textAlign).split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end" || key === "right") return "RIGHT";
  return "LEFT";
}

// ----------------------------
// Image fit 매핑
// ----------------------------
function mapImageFit(fit) {
  var key = String(fit || "").toLowerCase();
  if (key === "contain") return "FIT";
  return "FILL";
}

// ----------------------------
// Base64 → Uint8Array
// ----------------------------
function base64ToUint8Array(base64) {
  if (!base64 || typeof base64 !== "string") {
    return new Uint8Array(0);
  }

  var cleaned = base64.trim();
  var commaIndex = cleaned.indexOf(",");
  if (commaIndex !== -1 && cleaned.slice(0, 5).toLowerCase() === "data:") {
    cleaned = cleaned.slice(commaIndex + 1);
  }
  cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, "");

  while (cleaned.length % 4 !== 0) {
    cleaned += "=";
  }

  var encTable =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var len = cleaned.length;

  var outputLen = (len / 4) * 3;
  if (cleaned.endsWith("==")) outputLen -= 2;
  else if (cleaned.endsWith("=")) outputLen -= 1;

  var bytes = new Uint8Array(outputLen);
  var p = 0;

  for (var i = 0; i < len; i += 4) {
    var c1 = encTable.indexOf(cleaned.charAt(i));
    var c2 = encTable.indexOf(cleaned.charAt(i + 1));
    var c3 = encTable.indexOf(cleaned.charAt(i + 2));
    var c4 = encTable.indexOf(cleaned.charAt(i + 3));

    var triple = (c1 << 18) | (c2 << 12) | ((c3 & 63) << 6) | (c4 & 63);

    bytes[p++] = (triple >> 16) & 0xff;
    if (cleaned.charAt(i + 2) !== "=") {
      if (p < outputLen) bytes[p++] = (triple >> 8) & 0xff;
    }
    if (cleaned.charAt(i + 3) !== "=") {
      if (p < outputLen) bytes[p++] = triple & 0xff;
    }
  }

  return bytes;
}
