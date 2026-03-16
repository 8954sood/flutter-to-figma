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

  // NavigationToolbar는 handleNavigationToolbar에서 spacer를 명시적으로 삽입했으므로 스킵
  if (node.widgetName === "NavigationToolbar") return;

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

// --- 1.4.5 removeEmptyLeaves ---
// convertSpacersToItemSpacing 후 남은 빈 leaf Frame 제거
// 앞뒤 edge 빈 프레임은 padding으로 변환, 중간은 제거
function isEmptyLeaf(c) {
  if (!c || c.type !== "Frame") return false;
  var cp = c.properties || {};
  if (cp.backgroundColor || cp.hasBorder || cp.borderRadius ||
      cp.elevation || cp.shadowColor || cp.isIconBox || cp.isSvgBox ||
      cp.isTextField || cp.isDivider || cp.gradient || cp.backgroundBlur) return false;
  if (c.children && c.children.length > 0) return false;
  return true;
}

function removeEmptyLeaves(node) {
  if (!node || typeof node !== "object") return;

  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    removeEmptyLeaves(children[i]);
  }

  var props = node.properties || {};
  if (!props.layoutMode || props.layoutMode === "NONE") return;

  // NavigationToolbar는 handleNavigationToolbar에서 spacer를 명시적으로 삽입했으므로 스킵
  if (node.widgetName === "NavigationToolbar") return;

  children = node.children || [];
  if (children.length === 0) return;

  var isVert = (props.layoutMode === "VERTICAL");

  // 앞쪽 edge 빈 프레임 → 패딩으로 변환
  while (children.length > 0 && isEmptyLeaf(children[0])) {
    var cr = children[0].rect || {};
    if (isVert) {
      props.paddingTop = (props.paddingTop || 0) + (cr.h || 0);
    } else {
      props.paddingLeft = (props.paddingLeft || 0) + (cr.w || 0);
    }
    children.shift();
  }

  // 뒤쪽 edge 빈 프레임 → 패딩으로 변환
  while (children.length > 0 && isEmptyLeaf(children[children.length - 1])) {
    var cr = children[children.length - 1].rect || {};
    if (isVert) {
      props.paddingBottom = (props.paddingBottom || 0) + (cr.h || 0);
    } else {
      props.paddingRight = (props.paddingRight || 0) + (cr.w || 0);
    }
    children.pop();
  }

  // 중간 빈 leaf 제거
  node.children = children.filter(function(c) { return !isEmptyLeaf(c); });

  // 패딩 초과 방지: rect 높이/너비를 기준으로 캡핑
  var rectH = (node.rect || {}).h || 0;
  var rectW = (node.rect || {}).w || 0;
  if (isVert && rectH > 0) {
    var contentH = 0;
    for (var i = 0; i < node.children.length; i++) {
      contentH += ((node.children[i].rect || {}).h || 0);
    }
    var totalPad = (props.paddingTop || 0) + (props.paddingBottom || 0);
    if (totalPad + contentH > rectH) {
      var avail = Math.max(0, rectH - contentH);
      var ratio = totalPad > 0 ? (props.paddingTop || 0) / totalPad : 0.5;
      props.paddingTop = Math.round(avail * ratio);
      props.paddingBottom = avail - props.paddingTop;
    }
  } else if (!isVert && rectW > 0) {
    var contentW = 0;
    for (var i = 0; i < node.children.length; i++) {
      contentW += ((node.children[i].rect || {}).w || 0);
    }
    var totalPad = (props.paddingLeft || 0) + (props.paddingRight || 0);
    if (totalPad + contentW > rectW) {
      var avail = Math.max(0, rectW - contentW);
      var ratio = totalPad > 0 ? (props.paddingLeft || 0) / totalPad : 0.5;
      props.paddingLeft = Math.round(avail * ratio);
      props.paddingRight = avail - props.paddingLeft;
    }
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

  // NavigationToolbar는 전처리에서 contiguous rect + itemSpacing=0 설정 완료
  if (node.widgetName === "NavigationToolbar") return;

  // rect 좌표 기반 gap 계산
  var gaps = [];
  for (var i = 0; i < children.length - 1; i++) {
    // flexGrow는 이제 FIXED 모드 → gap 계산에 포함
    var currProps = children[i].properties || {};
    var nextProps = children[i + 1].properties || {};
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
    props.itemSpacing = 0;
    node.properties = props;
    return;
  }

  // 최빈값(mode)으로 itemSpacing 결정
  props.itemSpacing = mostCommonValue(gaps);
  node.properties = props;
}
