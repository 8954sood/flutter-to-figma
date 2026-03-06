// ============================
// Flutter Layout → Figma (Flat properties schema + Auto-Layout)
// 3-Phase Pipeline: Preprocess → Font Load → Render
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

// ============================================================
// Phase 1: 전처리 (순수 JS, Figma API 호출 없음)
// ============================================================

// --- 1.1 flattenEmptyWrappers ---
function isEmptyProps(props) {
  if (!props) return true;
  return Object.keys(props).length === 0;
}

function flattenEmptyWrappers(node) {
  if (!node || typeof node !== "object") return node;

  // 먼저 자식을 재귀적으로 처리
  if (node.children && node.children.length > 0) {
    for (var i = 0; i < node.children.length; i++) {
      node.children[i] = flattenEmptyWrappers(node.children[i]);
    }
    // null 제거
    node.children = node.children.filter(function (c) { return c != null; });
  }

  if (node.type !== "Frame") return node;
  if (!isEmptyProps(node.properties)) return node;

  var children = node.children || [];

  // 빈 프로퍼티 + 자식 1개 → 자식으로 대체
  if (children.length === 1) {
    var child = children[0];
    // 바깥쪽 rect 유지 (바운딩 박스)
    if (!child.rect && node.rect) {
      child.rect = node.rect;
    }
    return child;
  }

  // 빈 프로퍼티 + 자식 0개
  if (children.length === 0) {
    var rect = node.rect || {};
    var w = rect.w || 0;
    var h = rect.h || 0;
    // 고스트 래퍼 제거: 한 축이라도 크거나, 양쪽 모두 0
    if (w > 100 || h > 100 || (w === 0 && h === 0)) {
      return null;
    }
    // 양쪽 다 작고 하나 이상 > 0 = 스페이서 → 유지
    return node;
  }

  // 빈 프로퍼티 + 자식 여러개 → 유지, 레이아웃 추론 필요 표시
  node._needsLayoutInference = true;
  return node;
}

// --- 1.2 mergeWrapperChains ---
function mergeWrapperChains(node) {
  if (!node || typeof node !== "object") return node;

  // 먼저 자식을 재귀적으로 처리
  if (node.children && node.children.length > 0) {
    for (var i = 0; i < node.children.length; i++) {
      node.children[i] = mergeWrapperChains(node.children[i]);
    }
  }

  if (node.type !== "Frame") return node;

  // 체인 수집: Frame + children.length===1 + child.type===Frame
  var chain = [node];
  var current = node;
  while (
    current.type === "Frame" &&
    current.children &&
    current.children.length === 1 &&
    current.children[0].type === "Frame"
  ) {
    current = current.children[0];
    chain.push(current);
  }

  if (chain.length < 2) return node;

  // 속성 병합
  var merged = chain[chain.length - 1]; // 가장 안쪽 노드를 베이스로
  var mergedProps = Object.assign({}, merged.properties || {});

  // 바깥에서 안쪽으로 순회하며 병합
  for (var i = 0; i < chain.length - 1; i++) {
    var outerProps = chain[i].properties || {};
    mergePropsInto(mergedProps, outerProps, i === 0);
  }

  merged.properties = mergedProps;
  // rect: 바깥쪽 사용 (전체 바운딩 박스)
  merged.rect = chain[0].rect || merged.rect;

  return merged;
}

function mergePropsInto(target, source, isOutermost) {
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = source[key];

    // Visual (bg, border, radius): 안쪽 우선 (투명 제외)
    if (key === "backgroundColor") {
      if (!target[key] || isTransparent(target[key])) {
        if (!isTransparent(val)) target[key] = val;
      }
      continue;
    }
    if (key === "hasBorder" || key === "borderWidth" || key === "borderColor" || key === "borderRadius") {
      if (!(key in target)) target[key] = val;
      continue;
    }

    // Layout (layoutMode, alignment, spacing): 있는 곳에서 가져옴
    if (key === "layoutMode" || key === "mainAxisAlignment" || key === "crossAxisAlignment" ||
        key === "mainAxisSize" || key === "itemSpacing") {
      if (!(key in target)) target[key] = val;
      continue;
    }

    // Padding: 있는 곳에서 가져옴 (중복 시 합산)
    if (key === "paddingTop" || key === "paddingRight" || key === "paddingBottom" || key === "paddingLeft") {
      if (key in target) {
        target[key] = (target[key] || 0) + (val || 0);
      } else {
        target[key] = val;
      }
      continue;
    }

    // Flex (flexGrow, flexFit): 바깥쪽 우선
    if (key === "flexGrow" || key === "flexFit") {
      if (isOutermost) {
        target[key] = val;
      } else if (!(key in target)) {
        target[key] = val;
      }
      continue;
    }

    // 나머지: 없으면 가져옴
    if (!(key in target)) {
      target[key] = val;
    }
  }
}

// --- 1.3 inferMissingLayout ---
function inferMissingLayout(node) {
  if (!node || typeof node !== "object") return;

  // 자식 먼저 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    inferMissingLayout(children[i]);
  }

  if (node.type !== "Frame") return;

  var props = node.properties || {};
  // layoutMode가 이미 있으면 그대로
  if (props.layoutMode) return;

  // 자식 0~1개: VERTICAL 기본값
  if (children.length <= 1) {
    props.layoutMode = "VERTICAL";
    node.properties = props;
    return;
  }

  // 자식 여러개: rect 위치 분석
  var horizontal = true;
  var vertical = true;

  for (var i = 1; i < children.length; i++) {
    var prev = (children[i - 1].rect || {});
    var curr = (children[i].rect || {});
    var prevX = prev.x || 0;
    var prevY = prev.y || 0;
    var currX = curr.x || 0;
    var currY = curr.y || 0;

    // 세로 배치 체크: 다음 자식이 아래에 있는지
    if (currY <= prevY) vertical = false;
    // 가로 배치 체크: 다음 자식이 오른쪽에 있는지
    if (currX <= prevX) horizontal = false;
  }

  if (horizontal && !vertical) {
    props.layoutMode = "HORIZONTAL";
  } else {
    props.layoutMode = "VERTICAL"; // 기본값
  }
  node.properties = props;
}

// --- 1.4 convertSpacersToItemSpacing ---
function isSpacer(child, parentLayoutMode) {
  if (!child || child.type !== "Frame") return false;
  if (!isEmptyProps(child.properties)) return false;
  if (child.children && child.children.length > 0) return false;

  var rect = child.rect || {};
  var w = rect.w || 0;
  var h = rect.h || 0;

  if (parentLayoutMode === "HORIZONTAL") {
    return w > 0 && w <= 50 && h <= 1;
  } else {
    // VERTICAL
    return h > 0 && h <= 50 && w <= 1;
  }
}

function mostCommonValue(arr) {
  var counts = {};
  var maxCount = 0;
  var maxVal = 0;
  for (var i = 0; i < arr.length; i++) {
    var v = Math.round(arr[i]);
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > maxCount) {
      maxCount = counts[v];
      maxVal = v;
    }
  }
  return maxVal;
}

function convertSpacersToItemSpacing(node) {
  if (!node || typeof node !== "object") return;

  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    convertSpacersToItemSpacing(children[i]);
  }

  if (node.type !== "Frame") return;

  var props = node.properties || {};
  var layoutMode = props.layoutMode;
  if (!layoutMode) return;

  // 이미 itemSpacing이 있으면 스킵
  if (typeof props.itemSpacing === "number" && props.itemSpacing > 0) return;

  var spacerSizes = [];
  var spacerIndices = [];

  for (var i = 0; i < children.length; i++) {
    if (isSpacer(children[i], layoutMode)) {
      var rect = children[i].rect || {};
      var size = layoutMode === "HORIZONTAL" ? (rect.w || 0) : (rect.h || 0);
      spacerSizes.push(size);
      spacerIndices.push(i);
    }
  }

  if (spacerSizes.length === 0) return;

  // 가장 빈번한 스페이서 크기 → itemSpacing
  props.itemSpacing = mostCommonValue(spacerSizes);
  node.properties = props;

  // 스페이서 노드 제거 (역순)
  for (var i = spacerIndices.length - 1; i >= 0; i--) {
    node.children.splice(spacerIndices[i], 1);
  }
}

// --- 1.5 assignSizingHints ---
function assignSizingHints(node, parentProps) {
  if (!node || typeof node !== "object") return;

  var props = node.properties || {};
  var parentLayoutMode = parentProps ? parentProps.layoutMode : null;
  var parentCross = parentProps ? (parentProps.crossAxisAlignment || "") : "";
  var crossIsStretch = parentCross.indexOf("stretch") !== -1;

  if (node.type === "Text") {
    node._sizingH = "HUG";
    node._sizingV = "HUG";

    // Text + flexGrow + tight → 주축 FILL
    if (props.flexGrow > 0 && String(props.flexFit || "").indexOf("tight") !== -1) {
      if (parentLayoutMode === "HORIZONTAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "VERTICAL") {
        node._sizingV = "FILL";
      }
    }
  } else if (node.type === "Frame") {
    node._sizingH = "FIXED";
    node._sizingV = "FIXED";

    var flexGrow = props.flexGrow || 0;
    var flexFit = String(props.flexFit || "");
    var isTight = flexFit.indexOf("tight") !== -1;
    var mainAxisSize = props.mainAxisSize || "";
    var isAutoSize = mainAxisSize === "AUTO" || mainAxisSize === "min";

    // flexGrow > 0 + tight
    if (flexGrow > 0 && isTight) {
      if (parentLayoutMode === "HORIZONTAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "VERTICAL") {
        node._sizingV = "FILL";
      }
    }
    // flexGrow > 0 but loose — still FILL in the main axis
    else if (flexGrow > 0) {
      if (parentLayoutMode === "HORIZONTAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "VERTICAL") {
        node._sizingV = "FILL";
      }
    }

    // 부모 cross=stretch
    if (crossIsStretch) {
      if (parentLayoutMode === "VERTICAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "HORIZONTAL") {
        node._sizingV = "FILL";
      }
    }

    // mainAxisSize=AUTO → 주축 HUG
    if (isAutoSize) {
      if (props.layoutMode === "HORIZONTAL") {
        node._sizingH = "HUG";
      } else if (props.layoutMode === "VERTICAL") {
        node._sizingV = "HUG";
      }
    }
  }

  // 자식 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    assignSizingHints(children[i], props);
  }
}

// ============================================================
// Phase 1 헬퍼
// ============================================================

function isTransparent(colorStr) {
  if (!colorStr || typeof colorStr !== "string") return true;
  var s = colorStr.replace("#", "").toLowerCase();
  if (s.length === 8 && s.substring(0, 2) === "00") return true;
  if (s === "00000000") return true;
  return false;
}

function generateNodeName(node) {
  if (node.name) return node.name;
  var props = node.properties || {};
  if (node.type === "Text") {
    var content = props.content || "";
    if (content.length > 20) content = content.substring(0, 20) + "…";
    return content || "Text";
  }
  if (props.isIconBox) return "Icon";
  if (props.layoutMode === "HORIZONTAL") return "Row";
  if (props.layoutMode === "VERTICAL") return "Column";
  return "Frame";
}

function parseBorderRadius(val) {
  if (typeof val === "number") return val;
  if (val == null) return 0;
  var s = String(val);
  if (s.indexOf("zero") !== -1) return 0;
  var v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

// ============================================================
// Phase 2: 폰트 로딩
// ============================================================

async function preloadFonts(rootNode) {
  var fontSet = {};

  function addFont(font) {
    var key = font.family + "::" + font.style;
    if (!fontSet[key]) fontSet[key] = font;
  }

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Text") {
      var props = node.properties || {};
      var fam = props.fontFamily || null;
      var weight = props.fontWeight || "w400";
      addFont(resolveFont(fam, weight));
    }
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      visit(children[i]);
    }
  }

  visit(rootNode);

  // 항상 Inter 로드
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
          // fallback: Inter로 시도
          if (font.family !== "Inter") {
            var fallback = { family: "Inter", style: font.style };
            var fbKey = "Inter::" + font.style;
            if (!loadedFonts[fbKey]) {
              return figma.loadFontAsync(fallback).then(function () {
                loadedFonts[fbKey] = true;
              }).catch(function () {});
            }
          }
        });
      promises.push(p);
    })();
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

// ============================================================
// Phase 3: 렌더링
// ============================================================

async function renderWholeLayout(root) {
  figma.currentPage.selection = [];

  var screen = Array.isArray(root) ? root[0] : root;
  if (!screen || typeof screen !== "object") {
    throw new Error("루트 화면 노드를 찾지 못했습니다.");
  }

  // --- Phase 1: 전처리 ---
  console.log("[FlutterPlugin] Phase 1: 전처리 시작");
  var countBefore = countNodes(screen);

  screen = flattenEmptyWrappers(screen);
  if (!screen) throw new Error("루트 노드가 전처리 중 제거되었습니다.");

  mergeWrapperChains(screen);
  inferMissingLayout(screen);
  convertSpacersToItemSpacing(screen);
  assignSizingHints(screen, null);

  var countAfter = countNodes(screen);
  console.log("[FlutterPlugin] 전처리 완료: " + countBefore + " → " + countAfter + " 노드");

  // --- Phase 2: 폰트 로딩 ---
  console.log("[FlutterPlugin] Phase 2: 폰트 로딩");
  await preloadFonts(screen);

  // --- Phase 3: 렌더링 ---
  console.log("[FlutterPlugin] Phase 3: 렌더링 시작");
  var rect = screen.rect || {};
  var frameW = typeof rect.w === "number" ? rect.w : 375;
  var frameH = typeof rect.h === "number" ? rect.h : 812;

  var screenFrame = figma.createFrame();
  screenFrame.name = screen.name || "Flutter Screen";
  screenFrame.resize(frameW, frameH);
  screenFrame.x = 0;
  screenFrame.y = 0;
  screenFrame.clipsContent = false;

  // 루트에 visual + auto-layout 적용
  var rootProps = screen.properties || {};
  applyVisualProps(screenFrame, rootProps);
  applyAutoLayout(screenFrame, rootProps);

  // 자식 렌더링
  var children = screen.children || [];
  for (var i = 0; i < children.length; i++) {
    try {
      renderNode(children[i], screenFrame, rootProps.layoutMode || "VERTICAL");
    } catch (e) {
      console.warn("[FlutterPlugin] 루트 자식 렌더링 실패:", e);
    }
  }

  figma.currentPage.selection = [screenFrame];
  figma.viewport.scrollAndZoomIntoView([screenFrame]);
}

function countNodes(node) {
  if (!node || typeof node !== "object") return 0;
  var count = 1;
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    count += countNodes(children[i]);
  }
  return count;
}

// ----------------------------
// renderNode: 단일 노드 렌더링
// ----------------------------
function renderNode(node, parentFigma, parentLayoutDir) {
  if (!node || typeof node !== "object") return;

  var props = node.properties || {};
  var rect = node.rect || {};
  var w = typeof rect.w === "number" ? rect.w : 0;
  var h = typeof rect.h === "number" ? rect.h : 0;
  // Figma 최소 크기: 0.01, 기본 프레임이 100x100이 되지 않도록 항상 resize
  var rw = Math.max(w, 0.01);
  var rh = Math.max(h, 0.01);

  var figNode = null;

  try {
    if (node.type === "Text") {
      // --- Text 노드 ---
      figNode = figma.createText();
      applyTextProps(figNode, props);
    } else if (node.type === "Image") {
      // --- Image 노드 ---
      figNode = figma.createRectangle();
      figNode.resize(rw, rh);
      applyImageProps(figNode, props);
    } else {
      // --- Frame 노드 ---
      if (props.isIconBox) {
        figNode = figma.createFrame();
        figNode.resize(rw, rh);
        applyVisualProps(figNode, props);
        figNode.layoutMode = "NONE";
      } else if (props.isVectorCandidate) {
        figNode = figma.createFrame();
        figNode.resize(rw, rh);
        figNode.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }];
        figNode.layoutMode = "NONE";
      } else {
        figNode = figma.createFrame();
        figNode.resize(rw, rh);
        figNode.clipsContent = false;

        // Visual 속성 적용
        applyVisualProps(figNode, props);
        // Auto-layout 적용
        applyAutoLayout(figNode, props);
      }
    }
  } catch (e) {
    console.warn("[FlutterPlugin] 노드 생성 실패:", e, node.type);
    return;
  }

  if (!figNode) return;

  figNode.name = generateNodeName(node);

  // appendChild (sizing 전에 반드시)
  parentFigma.appendChild(figNode);

  // Sizing 적용 (appendChild 후)
  applySizing(figNode, node, parentLayoutDir);

  // 자식 재귀 (Frame만)
  if (node.type === "Frame" && !props.isIconBox && !props.isVectorCandidate) {
    var children = node.children || [];
    var childLayoutDir = props.layoutMode || "VERTICAL";
    for (var i = 0; i < children.length; i++) {
      try {
        renderNode(children[i], figNode, childLayoutDir);
      } catch (e) {
        console.warn("[FlutterPlugin] 자식 렌더링 실패:", e);
      }
    }
  }
}

// ----------------------------
// applyVisualProps: 배경색, 테두리, 둥근 모서리, 그림자
// ----------------------------
function applyVisualProps(frame, props) {
  // 배경 이미지
  if (props.backgroundImageBase64) {
    try {
      var bytes = base64ToUint8Array(props.backgroundImageBase64);
      var image = figma.createImage(bytes);
      var scaleMode = mapImageFit(props.imageFit || "cover");
      frame.fills = [{
        type: "IMAGE",
        imageHash: image.hash,
        scaleMode: scaleMode,
      }];
    } catch (e) {
      console.warn("[FlutterPlugin] background image decode failed", e);
      applyBgColor(frame, props);
    }
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
    frame.strokeWeight = typeof props.borderWidth === "number" ? props.borderWidth : 1;
  } else {
    frame.strokes = [];
  }

  // Corner radius
  var br = parseBorderRadius(props.borderRadius);
  if (br > 0) {
    frame.cornerRadius = br;
  }

  // Shadow
  if (props.elevation && typeof props.elevation === "number" && props.elevation > 0) {
    var elev = props.elevation;
    frame.effects = [{
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: elev },
      radius: elev * 2,
      visible: true,
      blendMode: "NORMAL",
    }];
  } else {
    frame.effects = [];
  }
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

// ----------------------------
// applyAutoLayout: layoutMode, spacing, padding, alignment
// ----------------------------
function applyAutoLayout(frame, props) {
  var mode = props.layoutMode;
  if (!mode) {
    frame.layoutMode = "VERTICAL";
    return;
  }

  if (mode === "HORIZONTAL" || mode === "ROW") {
    frame.layoutMode = "HORIZONTAL";
  } else {
    frame.layoutMode = "VERTICAL";
  }

  // itemSpacing
  frame.itemSpacing = typeof props.itemSpacing === "number" ? props.itemSpacing : 0;

  // Padding
  frame.paddingTop = typeof props.paddingTop === "number" ? props.paddingTop : 0;
  frame.paddingRight = typeof props.paddingRight === "number" ? props.paddingRight : 0;
  frame.paddingBottom = typeof props.paddingBottom === "number" ? props.paddingBottom : 0;
  frame.paddingLeft = typeof props.paddingLeft === "number" ? props.paddingLeft : 0;

  // Primary axis sizing
  var mainAxisSize = props.mainAxisSize || "FIXED";
  if (mainAxisSize === "AUTO" || mainAxisSize === "min") {
    frame.primaryAxisSizingMode = "AUTO";
  } else {
    frame.primaryAxisSizingMode = "FIXED";
  }

  // Counter axis sizing: 기본 FIXED로 안전
  frame.counterAxisSizingMode = "FIXED";

  // Alignment
  frame.primaryAxisAlignItems = mapMainAxisAlign(props.mainAxisAlignment);
  frame.counterAxisAlignItems = mapCrossAxisAlign(props.crossAxisAlignment);
}

// ----------------------------
// applySizing: appendChild 후 sizing 적용
// ----------------------------
function applySizing(figNode, jsonNode, parentLayoutDir) {
  try {
    var sizingH = jsonNode._sizingH || "FIXED";
    var sizingV = jsonNode._sizingV || "FIXED";

    // HUG는 Text 또는 auto-layout Frame만 가능
    var canHug =
      figNode.type === "TEXT" ||
      (figNode.type === "FRAME" && figNode.layoutMode && figNode.layoutMode !== "NONE");

    if (sizingH === "HUG" && !canHug) sizingH = "FIXED";
    if (sizingV === "HUG" && !canHug) sizingV = "FIXED";

    figNode.layoutSizingHorizontal = sizingH;
    figNode.layoutSizingVertical = sizingV;

    // flexGrow
    var props = jsonNode.properties || {};
    if (props.flexGrow > 0) {
      figNode.layoutGrow = 1;
    }
  } catch (e) {
    // FIXED fallback
    try {
      figNode.layoutSizingHorizontal = "FIXED";
      figNode.layoutSizingVertical = "FIXED";
    } catch (e2) {}
  }
}

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

  if (props.color) {
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

  if (props.textAlign) {
    textNode.textAlignHorizontal = mapTextAlign(props.textAlign);
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
    var scaleMode = mapImageFit(props.imageFit || "cover");

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

// ============================================================
// 유지하는 헬퍼 함수들
// ============================================================

// --- 색상 파싱 (Flutter ARGB → Figma RGBA) ---
function parseFlutterColor(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  var value = hex.trim();
  if (value.charAt(0) === "#") value = value.slice(1);

  var a = 1, r = 0, g = 0, b = 0;

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

// --- 폰트 이름 매핑 ---
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
  if (!family) return { family: "Inter", style: style };
  return { family: family, style: style };
}

// --- TextAlign 매핑 ---
function mapTextAlign(textAlign) {
  var key = String(textAlign).split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end" || key === "right") return "RIGHT";
  return "LEFT";
}

// --- Image fit 매핑 ---
function mapImageFit(fit) {
  var key = String(fit || "").toLowerCase();
  if (key === "contain") return "FIT";
  return "FILL";
}

// --- Alignment 매핑 ---
function mapMainAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "spaceBetween") return "SPACE_BETWEEN";
  if (key === "spaceAround") return "SPACE_BETWEEN";
  if (key === "spaceEvenly") return "SPACE_BETWEEN";
  return "MIN";
}

function mapCrossAxisAlign(val) {
  var key = String(val || "").split(".").pop();
  if (key === "center") return "CENTER";
  if (key === "end") return "MAX";
  if (key === "stretch") return "MIN"; // Figma에서 stretch는 자식별 FILL로 처리
  return "MIN";
}

// --- Base64 → Uint8Array ---
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
