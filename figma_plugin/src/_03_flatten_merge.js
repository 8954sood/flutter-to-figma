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
    if (!child.rect && node.rect) {
      child.rect = node.rect;
    }
    if (node.widgetName && !child.widgetName) {
      child.widgetName = node.widgetName;
    }
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
    if ((w > 100 && h > 100) || (w < 1 && h < 1)) {
      return null;
    }
    return node;
  }

  node._needsLayoutInference = true;
  return node;
}

// --- 1.2 mergeWrapperChains ---

function shouldStopChain(current, next, outerFlexGrow) {
  var np = next.properties || {};
  var cp = current.properties || {};

  if (next.widgetName) return true;
  if (np.rotation) return true;

  var nextHasVisual = np.backgroundColor || np.hasBorder || np.borderRadius ||
      np.elevation || np.shadowColor || np.isIconBox || np.isSvgBox;
  var curHasVisual = cp.backgroundColor || cp.hasBorder || cp.borderRadius ||
      cp.elevation || cp.shadowColor || cp.isIconBox || cp.isSvgBox;

  if ((cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end") &&
      (cp.mainAxisAlignment !== np.mainAxisAlignment ||
       cp.crossAxisAlignment !== np.crossAxisAlignment)) return true;

  if (nextHasVisual) {
    if (curHasVisual) return true;

    // outer가 padding 래퍼이고 inner(visual child)와 크기가 다르면 병합 중단
    // Padding(16) + Container(bg,border,radius) 패턴: outer는 위치 결정, inner는 시각 요소
    var curHasPadding = cp.paddingTop || cp.paddingRight || cp.paddingBottom || cp.paddingLeft;
    if (curHasPadding && !curHasVisual) {
      var curRect = current.rect || {};
      var nextRect = next.rect || {};
      var wDiff = (curRect.w || 0) - (nextRect.w || 0);
      var hDiff = (curRect.h || 0) - (nextRect.h || 0);
      if (wDiff > 4 || hDiff > 4) return true;
    }

    return "absorb";
  }

  if (curHasVisual && !outerFlexGrow && cp.mainAxisSize === "FIXED" &&
      (cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end")) return true;

  return false;
}

function calculateImplicitPadding(frame) {
  var np = frame.properties || {};

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
    if (cc.type === "Text") { /* ok */ }
    else if (cc.type === "Frame") {
      var ccp = cc.properties || {};
      var hasVis = ccp.backgroundColor || ccp.hasBorder || ccp.borderRadius ||
                   ccp.isIconBox || ccp.content;
      var hasCh = cc.children && cc.children.length > 0;
      if (!hasVis && !hasCh) continue;
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
  var merged = chain[chain.length - 1];
  var mergedProps = Object.assign({}, merged.properties || {});

  for (var i = 0; i < chain.length - 1; i++) {
    var outerProps = chain[i].properties || {};
    // If outer is a transparent wrapper (no visual):
    // 1. Don't propagate HUG sizing (let assignSizingHints decide from parent context)
    // 2. If outer has crossAxisAlignment=stretch, set cross-axis to FILL on merged node
    var outerHasVisual = outerProps.backgroundColor || outerProps.hasBorder ||
        outerProps.borderRadius || outerProps.elevation || outerProps.gradient;
    if (!outerHasVisual) {
      var outerCross = String(outerProps.crossAxisAlignment || "");
      var outerLayout = outerProps.layoutMode;
      if (outerCross.indexOf("stretch") !== -1) {
        // stretch → cross-axis FILL
        if (outerLayout === "VERTICAL" || outerLayout === "COLUMN") {
          outerProps.sizingH = "FILL";
        } else if (outerLayout === "HORIZONTAL" || outerLayout === "ROW") {
          outerProps.sizingV = "FILL";
        }
      } else {
        if (outerProps.sizingH === "HUG") delete outerProps.sizingH;
        if (outerProps.sizingV === "HUG") delete outerProps.sizingV;
      }
    }
    mergePropsInto(mergedProps, outerProps, i === 0);
  }

  merged.properties = mergedProps;
  merged.rect = chain[0].rect || merged.rect;

  if (chain[0].widgetName && !merged.widgetName) {
    merged.widgetName = chain[0].widgetName;
  }

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

  if (node.children && node.children.length > 0) {
    for (var i = 0; i < node.children.length; i++) {
      node.children[i] = mergeWrapperChains(node.children[i]);
    }
  }

  if (node.type !== "Frame") return node;

  if (node.widgetName === "Chip") return node;
  if ((node.properties || {}).layoutWrap) return node;

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

    if (stopResult === true) {
      // Propagate FILL sizing from padding wrapper to visual child
      // FILL overrides HUG (wrapper's stretch intent should reach the visual child)
      var cp2 = current.properties || {};
      var np2 = next.properties || {};
      if (cp2.sizingH === "FILL") {
        np2.sizingH = "FILL";
        next.properties = np2;
      }
      if (cp2.sizingV === "FILL") {
        np2.sizingV = "FILL";
        next.properties = np2;
      }
      break;
    }

    if (stopResult === "absorb") {
      current = next;
      chain.push(current);
      break;
    }

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

    if (key === "layoutMode" || key === "mainAxisAlignment" || key === "crossAxisAlignment" ||
        key === "mainAxisSize" || key === "itemSpacing") {
      if (!(key in target)) target[key] = val;
      continue;
    }

    if (key === "paddingTop" || key === "paddingRight" || key === "paddingBottom" || key === "paddingLeft") {
      if (key in target) {
        target[key] = (target[key] || 0) + (val || 0);
      } else {
        target[key] = val;
      }
      continue;
    }

    if (key === "sizingH" || key === "sizingV") {
      if (isOutermost) {
        target[key] = val;
      } else if (!(key in target)) {
        target[key] = val;
      }
      continue;
    }

    if (key === "flexGrow" || key === "flexFit") {
      if (isOutermost) {
        target[key] = val;
      } else if (!(key in target)) {
        target[key] = val;
      }
      continue;
    }

    if (!(key in target)) {
      target[key] = val;
    }
  }
}
