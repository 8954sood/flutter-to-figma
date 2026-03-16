// --- 1.4 convertSpacersToItemSpacing ---
// Layout-only keys that don't make a node non-empty for spacer detection
var _spacerIgnoreKeys = {
  "sizingH": true, "sizingV": true, "flexGrow": true,
  "flexFit": true, "alignSelf": true, "layoutMode": true
};

function isSpacerProps(props) {
  if (!props) return true;
  var keys = Object.keys(props);
  for (var i = 0; i < keys.length; i++) {
    if (!_spacerIgnoreKeys[keys[i]]) return false;
  }
  return true;
}

function isSpacer(child, parentLayoutMode) {
  if (!child || child.type !== "Frame") return false;
  if (!isSpacerProps(child.properties)) return false;
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

  // 비-spacer 자식 수
  var nonSpacerCount = children.length - spacerIndices.length;

  // spacer → itemSpacing 변환 조건: 모든 인접 비-spacer 쌍 사이에 spacer가 있어야 함
  // (일부만 spacer면 uniform itemSpacing 적용 시 gap 없는 쌍에도 spacing이 들어감)
  var canConvert = false;
  if (nonSpacerCount >= 2 && spacerSizes.length === nonSpacerCount - 1) {
    // spacer가 모든 비-spacer 쌍 사이에 존재하는지 확인:
    // 패턴이 [nonSpacer, spacer, nonSpacer, spacer, ...] 인지 검증
    canConvert = true;
    var spacerSet = {};
    for (var si = 0; si < spacerIndices.length; si++) spacerSet[spacerIndices[si]] = true;
    for (var i = 0; i < children.length - 1; i++) {
      var curIsSpacer = !!spacerSet[i];
      var nextIsSpacer = !!spacerSet[i + 1];
      // 인접한 두 non-spacer가 spacer 없이 붙어 있으면 변환 불가
      if (!curIsSpacer && !nextIsSpacer) {
        canConvert = false;
        break;
      }
    }
  }

  if (!canConvert) return;

  // 가장 빈번한 스페이서 크기 → itemSpacing
  props.itemSpacing = mostCommonValue(spacerSizes);
  node.properties = props;

  // 스페이서 노드 제거 (역순)
  for (var i = spacerIndices.length - 1; i >= 0; i--) {
    node.children.splice(spacerIndices[i], 1);
  }
}

// --- 1.4.5 removeEmptyLeaves ---
function isEmptyLeaf(c) {
  if (!c || c.type !== "Frame") return false;
  var cp = c.properties || {};
  if (cp.backgroundColor || cp.hasBorder || cp.borderRadius ||
      cp.elevation || cp.shadowColor || cp.isIconBox || cp.isSvgBox ||
      cp.isTextField || cp.isDivider || cp.gradient || cp.backgroundBlur) return false;
  if (c.children && c.children.length > 0) return false;
  // flexGrow가 있는 Spacer는 레이아웃에서 남은 공간을 채우므로 제거하면 안 됨
  if (cp.flexGrow > 0) return false;
  return true;
}

function convertEdgeEmptyFramesToPadding(props, children, isVert) {
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
}

function capPaddingToRect(node, props, isVert) {
  var rectH = (node.rect || {}).h || 0;
  var rectW = (node.rect || {}).w || 0;
  var children = node.children || [];

  if (isVert && rectH > 0) {
    var contentH = 0;
    for (var i = 0; i < children.length; i++) {
      contentH += ((children[i].rect || {}).h || 0);
    }
    if (contentH <= rectH) {
      var totalPad = (props.paddingTop || 0) + (props.paddingBottom || 0);
      if (totalPad + contentH > rectH) {
        var avail = Math.max(0, rectH - contentH);
        var ratio = totalPad > 0 ? (props.paddingTop || 0) / totalPad : 0.5;
        props.paddingTop = Math.round(avail * ratio);
        props.paddingBottom = avail - props.paddingTop;
      }
    }
  } else if (!isVert && rectW > 0) {
    var contentW = 0;
    for (var i = 0; i < children.length; i++) {
      contentW += ((children[i].rect || {}).w || 0);
    }
    if (contentW <= rectW) {
      var totalPad = (props.paddingLeft || 0) + (props.paddingRight || 0);
      if (totalPad + contentW > rectW) {
        var avail = Math.max(0, rectW - contentW);
        var ratio = totalPad > 0 ? (props.paddingLeft || 0) / totalPad : 0.5;
        props.paddingLeft = Math.round(avail * ratio);
        props.paddingRight = avail - props.paddingLeft;
      }
    }
  }
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

  convertEdgeEmptyFramesToPadding(props, children, isVert);

  // 중간 빈 leaf 제거 (spacer 역할의 Frame은 보존)
  node.children = children.filter(function(c) {
    if (!isEmptyLeaf(c)) return true;
    // spacer 크기의 빈 Frame은 유지 (spacing 역할)
    var cr = c.rect || {};
    var w = cr.w || 0;
    var h = cr.h || 0;
    if (isVert && h > 0 && h <= 50 && w <= 1) return true;
    if (!isVert && w > 0 && w <= 50 && h <= 1) return true;
    return false;
  });

  // 패딩 초과 방지
  capPaddingToRect(node, props, isVert);
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

  // 남아있는 spacer child(isEmptyLeaf) 처리 전략:
  // 1. spacer를 임시 제거하고 rect gap으로 itemSpacing 계산
  // 2. itemSpacing > 0이면 제거 확정 (margin gap 등이 spacing을 담당)
  // 3. itemSpacing = 0이면 spacer를 복원 (spacer Frame이 유일한 간격 수단)
  var spacerBackup = []; // {index, child, padding info}
  var isVert2 = (mode === "VERTICAL");
  var savedPadTop = props.paddingTop, savedPadBot = props.paddingBottom;
  var savedPadLeft = props.paddingLeft, savedPadRight = props.paddingRight;

  for (var i = children.length - 1; i >= 0; i--) {
    if (isEmptyLeaf(children[i])) {
      var cr = children[i].rect || {};
      var spacerSize = isVert2 ? (cr.h || 0) : (cr.w || 0);
      spacerBackup.unshift({ index: i, child: children[i] });
      if (i === 0) {
        if (isVert2) props.paddingTop = (props.paddingTop || 0) + spacerSize;
        else props.paddingLeft = (props.paddingLeft || 0) + spacerSize;
      } else if (i === children.length - 1) {
        if (isVert2) props.paddingBottom = (props.paddingBottom || 0) + spacerSize;
        else props.paddingRight = (props.paddingRight || 0) + spacerSize;
      }
      children.splice(i, 1);
    }
  }

  // rect 좌표 기반 gap 계산
  var gaps = [];
  for (var i = 0; i < children.length - 1; i++) {
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
    gaps.push(Math.max(0, Math.round(gap)));
  }

  var computed = gaps.length > 0 ? mostCommonValue(gaps) : 0;

  if (computed > 0 || spacerBackup.length === 0) {
    // 제거 확정: margin gap 등이 spacing을 담당
    props.itemSpacing = computed;
    node.children = children;
    node.properties = props;
  } else {
    // spacer 복원: spacer Frame이 유일한 간격 수단
    props.paddingTop = savedPadTop;
    props.paddingBottom = savedPadBot;
    props.paddingLeft = savedPadLeft;
    props.paddingRight = savedPadRight;
    for (var si = 0; si < spacerBackup.length; si++) {
      children.splice(spacerBackup[si].index, 0, spacerBackup[si].child);
    }
    props.itemSpacing = 0;
    node.children = children;
    node.properties = props;
  }
}
