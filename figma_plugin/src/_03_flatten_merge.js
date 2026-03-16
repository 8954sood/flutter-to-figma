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
    // clipPath 전파
    if (node.clipPath && !child.clipPath) {
      child.clipPath = node.clipPath;
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

// --- 1.2 mergeWrapperChains ---

function shouldStopChain(current, next, outerFlexGrow) {
  var np = next.properties || {};
  var cp = current.properties || {};

  // widgetName이 있는 노드는 병합 중단
  if (next.widgetName) return true;

  // rotation이 있는 노드는 병합 중단 (좌표계가 다름)
  if (np.rotation) return true;

  var nextHasVisual = np.backgroundColor || np.hasBorder || np.borderRadius ||
      np.elevation || np.shadowColor || np.isIconBox || np.isSvgBox;
  var curHasVisual = cp.backgroundColor || cp.hasBorder || cp.borderRadius ||
      cp.elevation || cp.shadowColor || cp.isIconBox || cp.isSvgBox;

  // 센터링/끝정렬 컨테이너 보존 (visual 흡수보다 먼저 체크)
  if ((cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end") &&
      (cp.mainAxisAlignment !== np.mainAxisAlignment ||
       cp.crossAxisAlignment !== np.crossAxisAlignment)) return true;

  if (nextHasVisual) {
    if (curHasVisual) return true; // 양쪽 다 visual → 병합 중단
    // outer가 비주얼 없음 → visual child 흡수 후 체인 종료
    return "absorb"; // special: absorb then stop
  }

  // 센터링/끝정렬 + visual 컨테이너 보존
  if (curHasVisual && !outerFlexGrow && cp.mainAxisSize === "FIXED" &&
      (cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end")) return true;

  return false;
}

function calculateImplicitPadding(frame) {
  var np = frame.properties || {};

  // rotation이 있는 자식은 좌표가 회전 전 기준이므로 패딩 계산 스킵
  var hasRotatedChild = false;
  if (frame.children) {
    for (var ri = 0; ri < frame.children.length; ri++) {
      if ((frame.children[ri].properties || {}).rotation) { hasRotatedChild = true; break; }
    }
  }

  if (np.layoutMode || hasRotatedChild || !frame.children || frame.children.length === 0) {
    return null;
  }

  var nRect = frame.rect || {};
  var nrx = nRect.x || 0, nry = nRect.y || 0;
  var nrw = nRect.w || 0, nrh = nRect.h || 0;
  var cMinX = Infinity, cMinY = Infinity, cMaxX = 0, cMaxY = 0;
  var hasContent = false;

  for (var ci = 0; ci < frame.children.length; ci++) {
    var cc = frame.children[ci];
    // Text 노드 또는 visual이 있는 Frame만 고려
    if (cc.type === "Text") { /* ok */ }
    else if (cc.type === "Frame") {
      var ccp = cc.properties || {};
      var hasVis = ccp.backgroundColor || ccp.hasBorder || ccp.borderRadius ||
                   ccp.isIconBox || ccp.content;
      var hasCh = cc.children && cc.children.length > 0;
      if (!hasVis && !hasCh) continue; // 빈 artifact → 스킵
    } else continue;
    var cr = cc.rect || {};
    var lx = (cr.x || 0) - nrx;
    var ly = (cr.y || 0) - nry;
    if (lx < cMinX) cMinX = lx;
    if (ly < cMinY) cMinY = ly;
    if (lx + (cr.w || 0) > cMaxX) cMaxX = lx + (cr.w || 0);
    if (ly + (cr.h || 0) > cMaxY) cMaxY = ly + (cr.h || 0);
    hasContent = true;
  }

  if (!hasContent || cMinX === Infinity) return null;

  return {
    top: Math.max(0, Math.round(cMinY)),
    left: Math.max(0, Math.round(cMinX)),
    bottom: Math.max(0, Math.round(nrh - cMaxY)),
    right: Math.max(0, Math.round(nrw - cMaxX))
  };
}

function mergeChainIntoInnermost(chain) {
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

  // widgetName: 바깥쪽 노드의 widgetName 전파
  if (chain[0].widgetName && !merged.widgetName) {
    merged.widgetName = chain[0].widgetName;
  }

  // clipPath: 체인 중 clipPath를 가진 노드가 있으면 보존
  for (var ci = 0; ci < chain.length; ci++) {
    if (chain[ci].clipPath) {
      merged.clipPath = chain[ci].clipPath;
      break;
    }
  }

  return merged;
}

function mergeWrapperChains(node) {
  if (!node || typeof node !== "object") return node;

  // 먼저 자식을 재귀적으로 처리
  if (node.children && node.children.length > 0) {
    for (var i = 0; i < node.children.length; i++) {
      node.children[i] = mergeWrapperChains(node.children[i]);
    }
  }

  if (node.type !== "Frame") return node;

  // Chip widgetName이 있는 노드는 mergeWrapperChains 스킵 → handleChip에서 처리
  if (node.widgetName === "Chip") return node;
  if ((node.properties || {}).layoutWrap) return node;

  // 체인 수집: Frame + children.length===1 + child.type===Frame
  var chain = [node];
  var current = node;
  while (
    current.type === "Frame" &&
    current.children &&
    current.children.length === 1 &&
    current.children[0].type === "Frame"
  ) {
    var next = current.children[0];
    var outerFlexGrow = ((chain[0].properties || {}).flexGrow || 0) > 0;
    var stopResult = shouldStopChain(current, next, outerFlexGrow);

    if (stopResult === true) break;

    if (stopResult === "absorb") {
      // outer가 비주얼 없음 → visual child 흡수 후 체인 종료
      current = next;
      chain.push(current);
      break;
    }

    // NONE 프레임의 암시적 패딩 계산
    var padding = calculateImplicitPadding(next);
    if (padding) {
      var np = next.properties || {};
      np.paddingTop = (np.paddingTop || 0) + padding.top;
      np.paddingLeft = (np.paddingLeft || 0) + padding.left;
      np.paddingBottom = (np.paddingBottom || 0) + padding.bottom;
      np.paddingRight = (np.paddingRight || 0) + padding.right;
      next.properties = np;
    }

    current = next;
    chain.push(current);
  }

  if (chain.length < 2) return node;

  return mergeChainIntoInnermost(chain);
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

    // Sizing (sizingH, sizingV): 바깥쪽 우선 (부모가 지정한 sizing이 자식 내부 sizing보다 우선)
    if (key === "sizingH" || key === "sizingV") {
      if (isOutermost) {
        target[key] = val;
      } else if (!(key in target)) {
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
