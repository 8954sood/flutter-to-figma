// ============================
// Flutter Layout → Figma (Flat properties schema + Auto-Layout)
// 3-Phase Pipeline: Preprocess → Font Load → Render
// ============================

figma.showUI(__html__, { width: 360, height: 380 });

var loadedFonts = {}; // "family::style" → true
var resolvedFonts = {}; // "family::originalStyle" → actual loaded style

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
// Phase 0: Schema v2 → flat properties 변환
// ============================================================

// --- 0.1 normalizeSchemaV2 ---
// Schema v2 (layoutMode, visual, containerLayout, childLayout) →
// flat properties schema (properties에 모든 속성 병합)
function normalizeSchemaV2(node) {
  if (!node || typeof node !== "object") return;

  // 자식 먼저 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    normalizeSchemaV2(children[i]);
  }

  // v2 감지: containerLayout 또는 visual 필드가 있으면 변환
  if (!node.visual && !node.containerLayout && !node.childLayout) return;

  var props = node.properties || {};

  // layoutMode (top-level → properties)
  if (node.layoutMode && !props.layoutMode) {
    if (node.layoutMode === "STACK") {
      props.isStack = true;
      // STACK → Figma NONE (절대 위치 배치)
    } else if (node.layoutMode !== "NONE") {
      props.layoutMode = node.layoutMode === "ROW" ? "HORIZONTAL" :
                         node.layoutMode === "COLUMN" ? "VERTICAL" :
                         node.layoutMode === "WRAP" ? "HORIZONTAL" :
                         node.layoutMode;
      if (node.layoutMode === "WRAP") {
        props.layoutWrap = true;
      }
    }
  }

  // visual → properties
  var visual = node.visual || {};
  var visualKeys = Object.keys(visual);
  for (var vi = 0; vi < visualKeys.length; vi++) {
    var vk = visualKeys[vi];
    var vv = visual[vk];
    if (vk === "border" && vv && typeof vv === "object") {
      // border: {color, width, topWidth?, rightWidth?, bottomWidth?, leftWidth?} → hasBorder, borderColor, borderWidth, per-side
      props.hasBorder = true;
      if (vv.color) props.borderColor = vv.color;
      if (vv.width) props.borderWidth = vv.width;
      if (vv.topWidth != null) {
        props.borderTopWidth = vv.topWidth;
        props.borderRightWidth = vv.rightWidth;
        props.borderBottomWidth = vv.bottomWidth;
        props.borderLeftWidth = vv.leftWidth;
      }
    } else if (vk === "borderRadius" && vv != null) {
      props.borderRadius = String(vv);
    } else if (vk === "shadow" && vv && typeof vv === "object") {
      if (vv.color != null) {
        props.shadowColor = vv.color;
        props.shadowOffsetX = vv.offsetX || 0;
        props.shadowOffsetY = vv.offsetY || 0;
        props.shadowBlurRadius = vv.blurRadius || 0;
        props.shadowSpreadRadius = vv.spreadRadius || 0;
      } else if (vv.elevation) {
        props.elevation = vv.elevation;
      }
    } else if (vk === "gradient" && vv && typeof vv === "object") {
      props.gradient = vv;
    } else if (vk === "backgroundBlur" && typeof vv === "number" && vv > 0) {
      props.backgroundBlur = vv;
    } else if (vk === "rotation" && typeof vv === "number") {
      props.rotation = vv;
    } else if (vv != null && !(vk in props)) {
      // 나머지 (backgroundColor, content, fontFamily, fontSize, color, letterSpacing, textAlign, isIconBox, ...) 직접 복사
      props[vk] = vv;
    }
  }

  // containerLayout → properties
  var cl = node.containerLayout || {};
  if (cl.padding) {
    if (cl.padding.top != null) props.paddingTop = cl.padding.top;
    if (cl.padding.right != null) props.paddingRight = cl.padding.right;
    if (cl.padding.bottom != null) props.paddingBottom = cl.padding.bottom;
    if (cl.padding.left != null) props.paddingLeft = cl.padding.left;
  }
  if (cl.mainAxisAlignment && !props.mainAxisAlignment) {
    props.mainAxisAlignment = cl.mainAxisAlignment;
  }
  if (cl.crossAxisAlignment && !props.crossAxisAlignment) {
    props.crossAxisAlignment = cl.crossAxisAlignment;
  }
  if (cl.mainAxisSize && !props.mainAxisSize) {
    var ms = cl.mainAxisSize;
    props.mainAxisSize = (ms === "max" || ms === "MainAxisSize.max") ? "FIXED" : "AUTO";
  }
  if (cl.itemSpacing != null && props.itemSpacing == null) {
    props.itemSpacing = cl.itemSpacing;
  }
  if (cl.runSpacing != null) props.runSpacing = cl.runSpacing;

  // childLayout → properties (부모가 설정한 자식 레이아웃 정보)
  var childLay = node.childLayout || {};
  if (childLay.flexGrow != null && childLay.flexGrow > 0) {
    props.flexGrow = childLay.flexGrow;
    // sizing에 FILL이 있으면 tight (Expanded), 없으면 loose (Flexible)
    var hasFill = childLay.sizingH === "FILL" || childLay.sizingV === "FILL";
    props.flexFit = hasFill ? "FlexFit.tight" : "FlexFit.loose";
  }
  if (childLay.fixedSize) {
    props.fixedSize = true;
  }
  if (childLay.fixedWidth) {
    props.fixedWidth = true;
  }
  if (childLay.fixedHeight) {
    props.fixedHeight = true;
  }
  // Stack 자식: positioned 정보 보존
  if (childLay.positioned) {
    props.positioned = childLay.positioned;
  }
  // sizingH/sizingV 보존
  if (childLay.sizingH) props.sizingH = childLay.sizingH;
  if (childLay.sizingV) props.sizingV = childLay.sizingV;

  node.properties = props;

  // v2 전용 필드 정리
  delete node.visual;
  delete node.containerLayout;
  delete node.childLayout;
  if (node.layoutMode) delete node.layoutMode;
}

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
    // widgetName 전파
    if (node.widgetName && !child.widgetName) {
      child.widgetName = node.widgetName;
    }
    return child;
  }

  // 빈 프로퍼티 + 자식 0개
  if (children.length === 0) {
    var rect = node.rect || {};
    var w = rect.w || 0;
    var h = rect.h || 0;
    // 고스트 래퍼 제거: 양축 모두 크거나, 양쪽 모두 0
    // (한 축만 큰 경우는 stretch된 스페이서 → 유지)
    if ((w > 100 && h > 100) || (w < 1 && h < 1)) {
      return null;
    }
    // 양쪽 다 작고 하나 이상 > 0 = 스페이서 → 유지
    return node;
  }

  // 빈 프로퍼티 + 자식 여러개 → 유지, 레이아웃 추론 필요 표시
  node._needsLayoutInference = true;
  return node;
}

// --- 1.1.5 preprocessNamedWidgets ---
function preprocessNamedWidgets(node) {
  if (!node || typeof node !== "object") return;

  // 자식 먼저 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    preprocessNamedWidgets(children[i]);
  }

  var wn = node.widgetName;
  if (!wn) return;

  if (wn === "NavigationToolbar") {
    handleNavigationToolbar(node);
  } else if (wn === "BottomNavigationBar") {
    handleBottomNavigationBar(node);
  }
}

// 자식 노드의 layoutMode에 따라 수평/수직 정렬 설정
// hAlign: 수평 정렬 ("start"|"center"|"end")
// vAlign: 수직 정렬 ("start"|"center"|"end")
function applyAlignByLayoutDir(props, hAlign, vAlign) {
  if (props.layoutMode === "VERTICAL") {
    // VERTICAL: main=수직, cross=수평
    props.mainAxisAlignment = vAlign;
    props.crossAxisAlignment = hAlign;
  } else {
    // HORIZONTAL 또는 기타: main=수평, cross=수직
    props.mainAxisAlignment = hAlign;
    props.crossAxisAlignment = vAlign;
  }
}

function handleNavigationToolbar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  // ROW 모드 보장 (normalizeSchemaV2 이후 flat properties)
  props.layoutMode = "HORIZONTAL";
  props.mainAxisAlignment = "center";
  node.properties = props;

  var nodeRect = node.rect || {};
  var nodeH = nodeRect.h || 56;

  if (children.length === 3) {
    var c0rect = children[0].rect || {};
    var c2rect = children[2].rect || {};

    // leading → 래퍼로 감싸서 FILL + left + vcenter
    var leadWrapper = {
      type: "Frame",
      rect: { x: c0rect.x || 0, y: nodeRect.y || 0, w: c0rect.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[0]],
    };
    children[0] = leadWrapper;

    // title → HUG
    var titleP = children[1].properties || {};
    titleP.flexGrow = 0;
    delete titleP.flexFit;
    children[1].properties = titleP;

    // actions → 래퍼로 감싸서 FILL + right + vcenter
    // 원래 actions 노드는 자연 크기 유지 (터치 영역 보존)
    var actWrapper = {
      type: "Frame",
      rect: { x: c2rect.x || 0, y: nodeRect.y || 0, w: c2rect.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "end",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[2]],
    };
    children[2] = actWrapper;
  } else if (children.length === 2) {
    var c0r = children[0].rect || {};
    var c1r = children[1].rect || {};

    // 첫 자식 → FILL + left + vcenter (래퍼)
    var wrap0 = {
      type: "Frame",
      rect: { x: c0r.x || 0, y: nodeRect.y || 0, w: c0r.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[0]],
    };
    // 둘째 자식 → FILL + right + vcenter (래퍼)
    var wrap1 = {
      type: "Frame",
      rect: { x: c1r.x || 0, y: nodeRect.y || 0, w: c1r.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "end",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[1]],
    };
    children[0] = wrap0;
    children[1] = wrap1;
  }
}

function handleBottomNavigationBar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  // ROW + spaceAround (normalizeSchemaV2 이후 flat properties)
  props.layoutMode = "HORIZONTAL";
  props.mainAxisAlignment = "spaceAround";
  props.crossAxisAlignment = "center";
  node.properties = props;

  // 각 아이템 FILL + center
  for (var i = 0; i < children.length; i++) {
    var cp = children[i].properties || {};
    cp.flexGrow = 1;
    cp.flexFit = "FlexFit.tight";
    delete cp.fixedWidth;
    cp.crossAxisAlignment = "center";
    cp.mainAxisAlignment = "center";
    children[i].properties = cp;
  }
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
  // visual 속성이 있는 노드에서 중단 (시각적 경계 보존)
  var chain = [node];
  var current = node;
  while (
    current.type === "Frame" &&
    current.children &&
    current.children.length === 1 &&
    current.children[0].type === "Frame"
  ) {
    var next = current.children[0];
    var np = next.properties || {};
    if (np.backgroundColor || np.hasBorder || np.borderRadius ||
        np.elevation || np.shadowColor || np.isIconBox || np.isSvgBox) break;
    // widgetName이 있는 노드는 병합 중단
    if (next.widgetName) break;
    // 센터링/끝정렬 컨테이너 보존: current가 공간을 채우고(mainAxisSize=max)
    // 자식을 center/end로 배치하면 → 병합 시 정렬 소실 방지
    var cp = current.properties || {};
    if (cp.mainAxisSize === "FIXED" &&
        (cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
         cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end")) break;
    current = next;
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
    if (key === "gradient") {
      if (!(key in target)) target[key] = val;
      continue;
    }
    if (key === "hasBorder" || key === "borderWidth" || key === "borderColor" || key === "borderRadius" ||
        key === "borderTopWidth" || key === "borderRightWidth" || key === "borderBottomWidth" || key === "borderLeftWidth") {
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
function sortChildrenByAxis(children, axis) {
  // axis: "y" or "x"
  var sorted = children.slice();
  sorted.sort(function (a, b) {
    var aVal = (a.rect || {})[axis] || 0;
    var bVal = (b.rect || {})[axis] || 0;
    return aVal - bVal;
  });
  return sorted;
}

function isMonotonicallyIncreasing(children, axis) {
  for (var i = 1; i < children.length; i++) {
    var prev = (children[i - 1].rect || {})[axis] || 0;
    var curr = (children[i].rect || {})[axis] || 0;
    if (curr < prev) return false;
  }
  return true;
}

function inferMissingLayout(node) {
  if (!node || typeof node !== "object") return;

  // 자식 먼저 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    inferMissingLayout(children[i]);
  }

  if (node.type !== "Frame") return;

  var props = node.properties || {};

  // Stack은 절대 배치 → layout 추론 건너뛰기
  if (props.isStack) return;

  // 자식이 2개 이상이면 위치 기준으로 정렬 + 방향 추론
  if (children.length >= 2) {
    var ySorted = sortChildrenByAxis(children, "y");
    var xSorted = sortChildrenByAxis(children, "x");

    var isVertical = isMonotonicallyIncreasing(ySorted, "y");
    var isHorizontal = isMonotonicallyIncreasing(xSorted, "x");

    if (!props.layoutMode) {
      // 방향 추론: 양 축 모두 monotonic이면 range 비교로 주축 결정
      if (isHorizontal && isVertical) {
        var xRange = ((xSorted[xSorted.length-1].rect||{}).x||0) - ((xSorted[0].rect||{}).x||0);
        var yRange = ((ySorted[ySorted.length-1].rect||{}).y||0) - ((ySorted[0].rect||{}).y||0);
        props.layoutMode = (xRange > yRange) ? "HORIZONTAL" : "VERTICAL";
      } else if (isHorizontal) {
        props.layoutMode = "HORIZONTAL";
      } else {
        props.layoutMode = "VERTICAL";
      }
      node.properties = props;
    }

    // layoutWrap (Wrap 위젯)은 이미 올바른 순서로 크롤링됨 → 재정렬 금지
    if (props.layoutWrap) return;

    // layoutMode에 맞게 자식 정렬 (기존 layoutMode가 있든 새로 추론했든)
    var mode = props.layoutMode;
    if (mode === "HORIZONTAL" || mode === "ROW") {
      node.children = xSorted;
    } else {
      node.children = ySorted;
    }
  } else if (!props.layoutMode) {
    // 자식 0~1개: VERTICAL 기본값
    props.layoutMode = "VERTICAL";
    node.properties = props;
  }
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

// --- 1.5 recalcItemSpacing ---
function recalcItemSpacing(node) {
  if (!node || typeof node !== "object") return;

  // 자식 먼저 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    recalcItemSpacing(children[i]);
  }

  if (node.type !== "Frame") return;

  var props = node.properties || {};
  var mode = props.layoutMode;
  if (!mode) return;
  if (children.length < 2) return;

  // rect 좌표 기반 gap 계산
  var gaps = [];
  for (var i = 0; i < children.length - 1; i++) {
    // flexGrow 자식 간 gap은 FILL 크기에 포함되므로 제외
    var currProps = children[i].properties || {};
    var nextProps = children[i + 1].properties || {};
    if ((currProps.flexGrow || 0) > 0 || (nextProps.flexGrow || 0) > 0) continue;
    var currRect = children[i].rect || {};
    var nextRect = children[i + 1].rect || {};
    var gap;
    if (mode === "HORIZONTAL" || mode === "ROW") {
      var currEnd = (currRect.x || 0) + (currRect.w || 0);
      gap = (nextRect.x || 0) - currEnd;
    } else {
      var currEnd = (currRect.y || 0) + (currRect.h || 0);
      gap = (nextRect.y || 0) - currEnd;
    }
    // 음수 gap → 0 클램프
    gaps.push(Math.max(0, Math.round(gap)));
  }

  if (gaps.length === 0) {
    // 모든 gap이 flexGrow로 skip됨 → spacing은 0 (gap은 flex 분배)
    props.itemSpacing = 0;
    node.properties = props;
    return;
  }

  // 최빈값(mode)으로 itemSpacing 결정
  props.itemSpacing = mostCommonValue(gaps);
  node.properties = props;
}

// --- 1.6 assignSizingHints ---
function assignSizingHints(node, parentProps) {
  if (!node || typeof node !== "object") return;

  var props = node.properties || {};
  var parentLayoutMode = parentProps ? parentProps.layoutMode : null;
  var parentCross = parentProps ? (parentProps.crossAxisAlignment || "") : "";
  var crossIsStretch = parentCross.indexOf("stretch") !== -1;

  // Image 노드: 항상 FIXED (래스터 이미지는 고정 크기)
  if (node.type === "Image") {
    node._sizingH = "FIXED";
    node._sizingV = "FIXED";
  } else if (node.type === "Text") {
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

    // 고정 크기 요소: 항상 FIXED 유지
    if (props.isIconBox || props.isSvgBox || props.isVectorCandidate || props.fixedSize) {
      // skip — FIXED/FIXED 유지
    } else {
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
      // 단, flexGrow(Expanded/Flexible)로 FILL이 설정된 축은 유지
      if (isAutoSize) {
        if (props.layoutMode === "HORIZONTAL" && node._sizingH !== "FILL") {
          node._sizingH = "HUG";
        } else if (props.layoutMode === "VERTICAL" && node._sizingV !== "FILL") {
          node._sizingV = "HUG";
        }
      }

      // WRAP 레이아웃: 가로 FILL (부모 폭 채워야 줄바꿈 가능), 세로 HUG
      if (props.layoutWrap) {
        node._sizingH = "FILL";
        node._sizingV = "HUG";
      }
    }
  }

  // SizedBox 단축 고정: fixedWidth/fixedHeight가 있으면 해당 축 FIXED
  // 단, 이미 FILL(Expanded/Flexible)이면 flex 우선 (AppBar leading 등)
  if (props.fixedWidth && node._sizingH !== "FILL") node._sizingH = "FIXED";
  if (props.fixedHeight && node._sizingV !== "FILL") node._sizingV = "FIXED";

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
      // RichText: 개별 span 폰트도 수집
      if (props.textSpans && Array.isArray(props.textSpans)) {
        for (var si = 0; si < props.textSpans.length; si++) {
          var span = props.textSpans[si];
          if (span.fontWeight || span.fontFamily) {
            addFont(resolveFont(span.fontFamily || fam, span.fontWeight || weight));
          }
        }
      }
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

  // 후보 스타일 순회하며 로딩 시도
  async function tryLoadFont(font) {
    var candidates = font._candidates || [font.style];
    var family = font.family;

    for (var ci = 0; ci < candidates.length; ci++) {
      var style = candidates[ci];
      var key = family + "::" + style;
      if (loadedFonts[key]) {
        // 이미 로드된 스타일이 있으면 resolvedFonts에 매핑
        resolvedFonts[family + "::" + font.style] = style;
        return;
      }
      try {
        await figma.loadFontAsync({ family: family, style: style });
        loadedFonts[key] = true;
        resolvedFonts[family + "::" + font.style] = style;
        console.log("[FlutterPlugin] loaded font:", family, style);
        return;
      } catch (e) {
        // 이 스타일은 없음, 다음 후보 시도
      }
    }

    // 모든 후보 실패 → Inter fallback
    console.warn("[FlutterPlugin] all candidates failed for", family, font.style, "→ Inter fallback");
    for (var ci = 0; ci < candidates.length; ci++) {
      var style = candidates[ci];
      var fbKey = "Inter::" + style;
      if (loadedFonts[fbKey]) {
        resolvedFonts[family + "::" + font.style] = style;
        resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
        return;
      }
      try {
        await figma.loadFontAsync({ family: "Inter", style: style });
        loadedFonts[fbKey] = true;
        resolvedFonts[family + "::" + font.style] = style;
        resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
        return;
      } catch (e) {}
    }
    // 최종 fallback
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      loadedFonts["Inter::Regular"] = true;
    } catch (e) {}
    resolvedFonts[family + "::" + font.style] = "Regular";
    resolvedFonts[family + "::" + font.style + "::family"] = "Inter";
  }

  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    promises.push(tryLoadFont(fontSet[keys[i]]));
  }
  await Promise.all(promises);
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

  // --- Phase 0: Schema v2 → flat properties ---
  normalizeSchemaV2(screen);

  // --- Phase 1: 전처리 ---
  console.log("[FlutterPlugin] Phase 1: 전처리 시작");
  var countBefore = countNodes(screen);

  screen = flattenEmptyWrappers(screen);
  if (!screen) throw new Error("루트 노드가 전처리 중 제거되었습니다.");

  mergeWrapperChains(screen);
  preprocessNamedWidgets(screen);
  inferMissingLayout(screen);
  convertSpacersToItemSpacing(screen);
  recalcItemSpacing(screen);
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
      figNode.resize(rw, rh);
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
        if (props.iconImageBase64) {
          // 실제 아이콘 이미지로 채우기
          try {
            var bytes = base64ToUint8Array(props.iconImageBase64);
            var image = figma.createImage(bytes);
            figNode.fills = [{
              type: "IMAGE",
              imageHash: image.hash,
              scaleMode: "FIT",
            }];
          } catch (e) {
            applyVisualProps(figNode, props);
          }
        } else {
          applyVisualProps(figNode, props);
        }
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

  // Rotation (degrees → Figma uses negative convention)
  if (props.rotation != null && typeof props.rotation === "number" && Math.abs(props.rotation) > 0.01) {
    figNode.rotation = -props.rotation;
  }

  // flexGrow + fixedSize 충돌: mergeWrapperChains가 Expanded 프레임과 내부 아이콘 체인을 병합한 경우
  // → wrapper ROW(FILL, align=END)를 만들고, 원본은 FIXED 자식으로 배치
  if (props.flexGrow > 0 && props.fixedSize && node.type === "Frame") {
    var wrapper = figma.createFrame();
    wrapper.name = figNode.name + "_fill";
    wrapper.resize(rw, rh);
    wrapper.fills = [];
    wrapper.clipsContent = false;
    wrapper.layoutMode = "HORIZONTAL";
    wrapper.primaryAxisAlignItems = "MAX";      // 오른쪽 끝 정렬
    wrapper.counterAxisAlignItems = "CENTER";   // 수직 중앙
    wrapper.paddingTop = 0;
    wrapper.paddingRight = 0;
    wrapper.paddingBottom = 0;
    wrapper.paddingLeft = 0;
    wrapper.itemSpacing = 0;

    parentFigma.appendChild(wrapper);

    // wrapper: FILL (flex 역할 대행)
    try {
      wrapper.layoutSizingHorizontal = "FILL";
      wrapper.layoutSizingVertical = "FILL";
      wrapper.layoutGrow = 1;
    } catch (e) {}

    // 원본 figNode: FIXED 크기로 wrapper 안에 배치
    wrapper.appendChild(figNode);
    try {
      figNode.layoutSizingHorizontal = "FIXED";
      figNode.layoutSizingVertical = "FIXED";
      figNode.layoutGrow = 0;
    } catch (e) {}

    // 자식 재귀 (원본 figNode 안에)
    if (!props.isIconBox && !props.isVectorCandidate) {
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
    return;
  }

  // appendChild (sizing 전에 반드시)
  parentFigma.appendChild(figNode);

  // Sizing 적용 (appendChild 후)
  applySizing(figNode, node, parentLayoutDir);

  // 자식 재귀 (Frame만)
  if (node.type === "Frame" && !props.isIconBox && !props.isVectorCandidate) {
    var children = node.children || [];
    var childLayoutDir = props.isStack ? "NONE" : (props.layoutMode || "VERTICAL");
    for (var i = 0; i < children.length; i++) {
      try {
        renderNode(children[i], figNode, childLayoutDir);
      } catch (e) {
        console.warn("[FlutterPlugin] 자식 렌더링 실패:", e);
      }
    }

    // Stack 자식: 부모 rect 기준 상대 좌표로 절대 배치
    if (props.isStack) {
      var parentRect = node.rect || {};
      var px = typeof parentRect.x === "number" ? parentRect.x : 0;
      var py = typeof parentRect.y === "number" ? parentRect.y : 0;
      for (var si = 0; si < children.length; si++) {
        var childRect = (children[si] || {}).rect || {};
        var cx = typeof childRect.x === "number" ? childRect.x : 0;
        var cy = typeof childRect.y === "number" ? childRect.y : 0;
        try {
          var childFig = figNode.children[si];
          if (childFig) {
            childFig.x = cx - px;
            childFig.y = cy - py;
          }
        } catch (e) {}
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

  // Corner radius
  var br = parseBorderRadius(props.borderRadius);
  if (br > 0) {
    frame.cornerRadius = br;
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
    fill.gradientTransform = buildRadialGradientTransform(cx, cy, r);
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

function buildRadialGradientTransform(cx, cy, r) {
  return [
    [r, 0, cx - r / 2],
    [0, r, cy - r / 2]
  ];
}

function buildSweepGradientTransform(cx, cy) {
  var r = 0.5;
  return [
    [r, 0, cx - r / 2],
    [0, r, cy - r / 2]
  ];
}

// ----------------------------
// applyAutoLayout: layoutMode, spacing, padding, alignment
// ----------------------------
function applyAutoLayout(frame, props) {
  // Stack은 절대 배치 → auto-layout 없음
  if (props.isStack) {
    frame.layoutMode = "NONE";
    return;
  }
  var mode = props.layoutMode;
  if (!mode) {
    // layoutMode 없는 프레임(SizedBox 스페이서 등)은 auto-layout 없이 유지
    // auto-layout 설정 시 빈 프레임이 0으로 축소될 수 있음
    frame.layoutMode = "NONE";
    return;
  }

  if (mode === "HORIZONTAL" || mode === "ROW") {
    frame.layoutMode = "HORIZONTAL";
  } else {
    frame.layoutMode = "VERTICAL";
  }

  // layoutWrap
  if (props.layoutWrap) {
    frame.layoutWrap = "WRAP";
    if (typeof props.runSpacing === "number") {
      frame.counterAxisSpacing = props.runSpacing;
    }
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
    var props = jsonNode.properties || {};

    // Stack(NONE) 자식: auto-layout sizing 불필요, 절대 위치 사용
    if (parentLayoutDir === "NONE") return;

    // 고정 크기 요소: 항상 FIXED, layoutGrow 금지
    // 단, flexGrow(Expanded/Flexible)가 있으면 flex 우선 (mergeWrapperChains로 fixedSize+flexGrow 병합 가능)
    var hasFlexGrow = props.flexGrow > 0;
    if (props.isIconBox || props.isSvgBox || props.isVectorCandidate ||
        jsonNode.type === "Image" || (props.fixedSize && !hasFlexGrow)) {
      figNode.layoutSizingHorizontal = "FIXED";
      figNode.layoutSizingVertical = "FIXED";
      figNode.layoutGrow = 0;
      return;
    }

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

  if (props.gradient) {
    // ShaderMask gradient → 텍스트에 gradient fill 적용
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
  var candidates = {
    w100: ["Thin", "Hairline", "ExtraThin"],
    w200: ["ExtraLight", "UltraLight", "Extra Light", "Ultra Light"],
    w300: ["Light"],
    w400: ["Regular", "Normal"],
    w500: ["Medium"],
    w600: ["SemiBold", "Semi Bold", "DemiBold"],
    w700: ["Bold"],
    w800: ["ExtraBold", "UltraBold", "Extra Bold", "Ultra Bold"],
    w900: ["Black", "Heavy"],
  };
  var styles = candidates[key] || ["Regular"];
  var fam = family || "Inter";
  var firstStyle = styles[0];

  // preloadFonts에서 실제 로드된 스타일 확인
  var resolveKey = fam + "::" + firstStyle;
  var actualStyle = resolvedFonts[resolveKey];
  var actualFamily = resolvedFonts[resolveKey + "::family"] || fam;
  if (actualStyle) {
    return { family: actualFamily, style: actualStyle };
  }

  // preload 전 호출 (수집 단계) → 후보 리스트 포함
  return { family: fam, style: firstStyle, _candidates: styles };
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
