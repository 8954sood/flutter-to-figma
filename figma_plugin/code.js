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
  if (key === "contain" || key === "fitwidth" || key === "fitheight") return "FIT";
  if (key === "none" || key === "scaledown") return "FIT";
  return "FILL";
}

// --- BoxFit → Figma scaleMode 매핑 ---
function mapBoxFitToScaleMode(fit) {
  var key = String(fit || "").toLowerCase();
  if (key === "contain" || key === "fitwidth" || key === "fitheight" || key === "scaledown") return "FIT";
  if (key === "cover") return "FILL";
  if (key === "fill") return "FILL";
  if (key === "none") return "FIT";
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

// ============================
// Flutter Layout → Figma (Flat properties schema + Auto-Layout)
// 3-Phase Pipeline: Preprocess → Font Load → Render
// ============================

figma.showUI(__html__, { width: 360, height: 500 });

var loadedFonts = {}; // "family::style" → true
var resolvedFonts = {}; // "family::originalStyle" → actual loaded style


// ============================================================
// Phase 0: Schema v2 → flat properties 변환
// ============================================================

// --- 0.1 normalizeSchemaV2 ---
// Schema v2 (layoutMode, visual, containerLayout, childLayout) →
// flat properties schema (properties에 모든 속성 병합)
function normalizeSchemaV2(node) {
  if (!node || typeof node !== "object") return;

  // clipsContent 전파 (재귀 전): 부모가 clipsContent + borderRadius이면
  // 동일 borderRadius를 가진 직계 자식에도 clipsContent 전파
  // (Card → Material 구조: RenderPhysicalModel → RenderDecoratedBox)
  var children = node.children || [];
  var pVis = node.visual || {};
  if (pVis.clipsContent === true && pVis.borderRadius != null) {
    var pBr = String(pVis.borderRadius);
    for (var ci = 0; ci < children.length; ci++) {
      var ch = children[ci];
      if (ch && ch.visual && ch.visual.borderRadius != null &&
          String(ch.visual.borderRadius) === pBr &&
          ch.visual.clipsContent !== true) {
        ch.visual.clipsContent = true;
      }
    }
  }

  // 자식 재귀
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
      // per-corner: {tl, tr, bl, br} 객체 또는 단일 숫자
      props.borderRadius = (typeof vv === "object") ? vv : String(vv);
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

  // Wrap: constraints.maxWidth로 rect.w 보정 (줄바꿈 올바르게 동작)
  if (cl._wrapMaxWidth && node.rect) {
    node.rect.w = cl._wrapMaxWidth;
  }

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
    if (curHasVisual) return true; // both visual → stop

    var curRect = current.rect || {};
    var nextRect = next.rect || {};
    var wDiff = (curRect.w || 0) - (nextRect.w || 0);
    var hDiff = (curRect.h || 0) - (nextRect.h || 0);
    var hasSizeDiff = wDiff > 4 || hDiff > 4;

    // 크기가 유의미하게 다르면 병합 중단
    // (outer가 centering/padding container로 visual child를 감싸는 패턴)
    if (hasSizeDiff) return true;

    return "absorb";
  }

  // current가 visual이고 next가 non-visual이지만 크기가 다르면 → stop
  // (visual container + transparent spacer/wrapper + visual child 패턴 방지)
  if (curHasVisual && !nextHasVisual) {
    var curRect2 = current.rect || {};
    var nextRect2 = next.rect || {};
    if ((curRect2.w || 0) - (nextRect2.w || 0) > 4 || (curRect2.h || 0) - (nextRect2.h || 0) > 4) {
      return true;
    }
  }

  if (curHasVisual && !outerFlexGrow && cp.mainAxisSize === "FIXED" &&
      (cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end")) return true;

  // Non-visual centering container → non-visual child with size difference:
  // Stop to preserve center/end alignment (Center + icon wrapper pattern)
  if (!curHasVisual && !nextHasVisual &&
      (cp.mainAxisAlignment === "center" || cp.mainAxisAlignment === "end" ||
       cp.crossAxisAlignment === "center" || cp.crossAxisAlignment === "end")) {
    var curRect3 = current.rect || {};
    var nextRect3 = next.rect || {};
    if ((curRect3.w || 0) - (nextRect3.w || 0) > 4 || (curRect3.h || 0) - (nextRect3.h || 0) > 4) {
      return true;
    }
  }

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

  // Icon/SVG: keep inner rect (icon has specific size, wrapper is just centering container)
  if (mergedProps.isIconBox || mergedProps.isSvgBox) {
    // Keep merged.rect (inner node's rect) — don't inflate to outer wrapper size
  } else {
    merged.rect = chain[0].rect || merged.rect;
  }

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
      var cp2 = current.properties || {};
      var np2 = next.properties || {};
      // Propagate FILL sizing from padding wrapper to visual child
      if (cp2.sizingH === "FILL") {
        np2.sizingH = "FILL";
        next.properties = np2;
      }
      if (cp2.sizingV === "FILL") {
        np2.sizingV = "FILL";
        next.properties = np2;
      }
      // Propagate center/end alignment from outer to child (Center/Align widget pattern)
      if (cp2.mainAxisAlignment === "center" || cp2.mainAxisAlignment === "end") {
        if (!np2.mainAxisAlignment || np2.mainAxisAlignment === "start") {
          np2.mainAxisAlignment = cp2.mainAxisAlignment;
          next.properties = np2;
        }
      }
      if (cp2.crossAxisAlignment === "center" || cp2.crossAxisAlignment === "end") {
        if (!np2.crossAxisAlignment || np2.crossAxisAlignment === "start") {
          np2.crossAxisAlignment = cp2.crossAxisAlignment;
          next.properties = np2;
        }
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

    if (key === "layoutMode" || key === "mainAxisSize" || key === "itemSpacing") {
      if (!(key in target)) target[key] = val;
      continue;
    }

    // Alignment: outermost center/end overrides inner start/stretch (Center/Align widget pattern)
    // "start" and "stretch" are Flutter defaults — outer center/end is intentional
    if (key === "mainAxisAlignment" || key === "crossAxisAlignment") {
      if (isOutermost && (val === "center" || val === "end") &&
          (!target[key] || target[key] === "start" || target[key] === "stretch")) {
        target[key] = val;
      } else if (!(key in target)) {
        target[key] = val;
      }
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

// --- 1.1.3 detectOverlays ---
// Detects ModalBarrier (scrim) pattern and converts sequential overlay layers into STACK.
// Called after mergeWrapperChains, before preprocessNamedWidgets.

function isScrimNode(child, parentRect) {
  if (!child || child.widgetName !== "ModalBarrier") return false;
  var cr = child.rect || {};
  var pr = parentRect || {};
  return Math.abs((cr.w || 0) - (pr.w || 0)) < 10 &&
         Math.abs((cr.h || 0) - (pr.h || 0)) < 10;
}

function detectOverlays(node) {
  if (!node || typeof node !== "object") return;

  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    detectOverlays(children[i]);
  }

  if (node.type !== "Frame") return;
  if (children.length < 2) return;

  // Find ModalBarrier scrim node
  var scrimIdx = -1;
  var nodeRect = node.rect || {};
  for (var i = 0; i < children.length; i++) {
    if (isScrimNode(children[i], nodeRect)) {
      scrimIdx = i;
      break;
    }
  }

  if (scrimIdx < 0) return;

  // Split: before (main content) | scrim | after (overlay content)
  var before = children.slice(0, scrimIdx);
  var scrim = children[scrimIdx];
  var after = children.slice(scrimIdx + 1);

  // Filter out empty frames from 'before' (Overlay stack often has empty placeholders)
  var mainChildren = [];
  for (var i = 0; i < before.length; i++) {
    var b = before[i];
    var bChildren = b.children || [];
    var bProps = b.properties || {};
    var bVis = b.visual || {};
    var hasBg = bProps.backgroundColor || bVis.backgroundColor;
    // Skip fully transparent backgrounds (#00000000)
    if (hasBg && typeof hasBg === "string" && hasBg.replace("#","").substring(0,2) === "00") hasBg = false;
    var hasContent = bChildren.length > 0 || hasBg ||
        b.widgetName || b.type === "Text" || b.type === "Image";
    if (hasContent) mainChildren.push(b);
  }

  // Build main content wrapper
  var mainWrapper;
  if (mainChildren.length === 1) {
    mainWrapper = mainChildren[0];
  } else if (mainChildren.length > 1) {
    mainWrapper = {
      type: "Frame",
      rect: { x: nodeRect.x || 0, y: nodeRect.y || 0, w: nodeRect.w || 0, h: nodeRect.h || 0 },
      properties: { layoutMode: "VERTICAL", mainAxisSize: "FIXED" },
      children: mainChildren,
    };
  } else {
    // No main content, just overlay
    mainWrapper = null;
  }

  // Build overlay wrapper
  var overlayWrapper;
  if (after.length === 1) {
    overlayWrapper = after[0];
  } else if (after.length > 1) {
    overlayWrapper = {
      type: "Frame",
      rect: { x: nodeRect.x || 0, y: nodeRect.y || 0, w: nodeRect.w || 0, h: nodeRect.h || 0 },
      properties: {},
      children: after,
    };
  } else {
    overlayWrapper = null;
  }

  // Determine overlay position (bottom sheet vs dialog)
  if (overlayWrapper) {
    var overlayChild = (overlayWrapper.children && overlayWrapper.children.length > 0)
        ? overlayWrapper.children[0] : overlayWrapper;
    var childRect = overlayChild.rect || {};
    var parentH = nodeRect.h || 0;
    var childY = (childRect.y || 0) - (nodeRect.y || 0);
    var childH = childRect.h || 0;

    var overlayProps = overlayWrapper.properties || {};
    // Bottom sheet: child touches the bottom (childY + childH ≈ parentH)
    // Dialog: child has significant space both top and bottom
    var bottomGap = parentH - (childY + childH);
    var isBottomSheet = Math.abs(bottomGap) < parentH * 0.05 && childY > parentH * 0.05;
    if (isBottomSheet) {
      overlayProps.mainAxisAlignment = "end";
      overlayProps.crossAxisAlignment = "stretch";
    } else if (childY > parentH * 0.05 && bottomGap > parentH * 0.05) {
      // Dialog: space on both sides
      overlayProps.mainAxisAlignment = "center";
      overlayProps.crossAxisAlignment = "center";
    }
    overlayProps.layoutMode = "VERTICAL";
    overlayWrapper.properties = overlayProps;

    // Set overlay rect to screen size
    overlayWrapper.rect = { x: nodeRect.x || 0, y: nodeRect.y || 0, w: nodeRect.w || 0, h: nodeRect.h || 0 };
  }

  // Convert parent to STACK
  var newChildren = [];
  if (mainWrapper) newChildren.push(mainWrapper);
  newChildren.push(scrim);
  if (overlayWrapper) newChildren.push(overlayWrapper);

  var nodeProps = node.properties || {};
  nodeProps.isStack = true;
  nodeProps.clipsContent = true;
  delete nodeProps.layoutMode;
  node.properties = nodeProps;
  node.children = newChildren;

  // Ensure rect is screen size (not inflated)
  node.rect = { x: nodeRect.x || 0, y: nodeRect.y || 0, w: nodeRect.w || 0, h: nodeRect.h || 0 };
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
  } else if (wn === "ListTile" || wn === "CheckboxListTile" || wn === "RadioListTile") {
    handleListTile(node);
  } else if (wn === "Chip") {
    handleChip(node);
  }
}

// --- ListTile helpers ---

function groupChildrenByXRange(children) {
  var groups = [];
  var curGroup = [children[0]];

  for (var i = 1; i < children.length; i++) {
    var prevX = (curGroup[0].rect || {}).x || 0;
    var prevR = prevX + ((curGroup[0].rect || {}).w || 0);
    var currX = (children[i].rect || {}).x || 0;

    // 현재 자식의 x가 이전 그룹의 x~x+w 범위 안이면 같은 그룹
    if (currX >= prevX && currX < prevR) {
      curGroup.push(children[i]);
    } else {
      groups.push(curGroup);
      curGroup = [children[i]];
    }
  }
  groups.push(curGroup);
  return groups;
}

function buildGroupColumns(groups) {
  var newChildren = [];
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].length === 1) {
      newChildren.push(groups[g][0]);
    } else {
      // y 정렬
      groups[g].sort(function(a, b) {
        return ((a.rect || {}).y || 0) - ((b.rect || {}).y || 0);
      });
      var firstR = groups[g][0].rect || {};
      var lastR = groups[g][groups[g].length - 1].rect || {};
      var maxW = 0;
      for (var gi = 0; gi < groups[g].length; gi++) {
        var gw = (groups[g][gi].rect || {}).w || 0;
        if (gw > maxW) maxW = gw;
      }
      newChildren.push({
        type: "Frame",
        rect: {
          x: firstR.x || 0,
          y: firstR.y || 0,
          w: maxW,
          h: ((lastR.y || 0) + (lastR.h || 0)) - (firstR.y || 0)
        },
        properties: {
          layoutMode: "VERTICAL",
          crossAxisAlignment: "start",
          mainAxisAlignment: "center",
          mainAxisSize: "AUTO"
        },
        children: groups[g]
      });
    }
  }
  return newChildren;
}

function assignFlexGrowToWidest(children) {
  var widestIdx = 0;
  var widestW = 0;
  for (var i = 0; i < children.length; i++) {
    var cw = (children[i].rect || {}).w || 0;
    if (cw > widestW) {
      widestW = cw;
      widestIdx = i;
    }
  }

  var titleP = children[widestIdx].properties || {};
  titleP.flexGrow = 1;
  titleP.flexFit = "FlexFit.tight";
  children[widestIdx].properties = titleP;
}

function handleListTile(node) {
  // widgetName이 wrapper에 걸린 경우 → 실제 컨텐츠 노드까지 walk-down
  var target = node;
  while (target.children && target.children.length === 1 &&
         target.children[0].type === "Frame") {
    target = target.children[0];
  }

  var children = target.children || [];
  if (children.length < 2) return;

  var props = target.properties || {};

  // ROW 레이아웃 강제 설정
  props.layoutMode = "HORIZONTAL";
  props.crossAxisAlignment = "center";
  target.properties = props;

  // x 좌표로 정렬
  children.sort(function(a, b) {
    return ((a.rect || {}).x || 0) - ((b.rect || {}).x || 0);
  });

  // 같은 x 범위의 자식들을 COLUMN으로 그룹핑 (title + subtitle 등)
  var groups = groupChildrenByXRange(children);
  var newChildren = buildGroupColumns(groups);

  target.children = newChildren;

  // 가장 넓은 그룹(title/subtitle 영역)에 flexGrow 부여
  assignFlexGrowToWidest(newChildren);
}

// --- Chip helpers ---

function findDecoNode(node) {
  var p = node.properties || {};
  if (p.backgroundColor || p.hasBorder || p.borderRadius) return node;
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) {
    var found = findDecoNode(ch[i]);
    if (found) return found;
  }
  return null;
}

function findNoneFrame(node) {
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) {
    var cp = ch[i].properties || {};
    if (ch[i].type === "Frame" && !cp.layoutMode && !cp.isStack) {
      return ch[i];
    }
    var found = findNoneFrame(ch[i]);
    if (found) return found;
  }
  return null;
}

function filterChipChildren(children) {
  var newChildren = [];
  for (var i = 0; i < children.length; i++) {
    var c = children[i];
    if (c.type === "Text") {
      newChildren.push(c);
    } else if (c.type === "Frame") {
      var cp = c.properties || {};
      // 비어 있는 STACK (clipsContent만 있고 자식 없음) → 제거
      if ((cp.isStack || cp.layoutMode === "STACK") && (!c.children || c.children.length === 0)) {
        continue;
      }
      // 비어 있는 Frame (visual 없고 자식 없음) → 제거
      var hasVis = cp.backgroundColor || cp.hasBorder || cp.borderRadius ||
                   cp.isIconBox || cp.content;
      if (!hasVis && (!c.children || c.children.length === 0)) {
        continue;
      }
      newChildren.push(c);
    } else {
      newChildren.push(c);
    }
  }
  return newChildren;
}

function calculateBoundingPadding(children, containerRect) {
  var nx = containerRect.x || 0, ny = containerRect.y || 0;
  var nw = containerRect.w || 0, nh = containerRect.h || 0;

  var cMinX = Infinity, cMinY = Infinity, cMaxX = 0, cMaxY = 0;
  for (var i = 0; i < children.length; i++) {
    var cr = children[i].rect || {};
    var lx = (cr.x || 0) - nx;
    var ly = (cr.y || 0) - ny;
    var lw = cr.w || 0;
    var lh = cr.h || 0;
    if (lx < cMinX) cMinX = lx;
    if (ly < cMinY) cMinY = ly;
    if (lx + lw > cMaxX) cMaxX = lx + lw;
    if (ly + lh > cMaxY) cMaxY = ly + lh;
  }

  return {
    top: Math.max(0, Math.round(cMinY)),
    left: Math.max(0, Math.round(cMinX)),
    bottom: Math.max(0, Math.round(nh - cMaxY)),
    right: Math.max(0, Math.round(nw - cMaxX))
  };
}

function handleChip(node) {
  // Chip 구조: widgetName 노드 → ... → COLUMN(bg/border) → NONE(content) → [STACK, Text, STACK]
  // 목표: NONE 프레임을 HORIZONTAL로 변환하고, 좌표 기반 패딩 추출, 빈 STACK 제거

  var decoNode = findDecoNode(node);
  if (!decoNode) {
    console.log("[handleChip] decoNode not found");
    return;
  }
  console.log("[handleChip] decoNode found, layoutMode=" + (decoNode.properties || {}).layoutMode +
    ", children=" + (decoNode.children || []).length +
    ", bg=" + (decoNode.properties || {}).backgroundColor);

  // decoNode의 자식 구조 확인
  var decoChildren = decoNode.children || [];
  for (var di = 0; di < decoChildren.length; di++) {
    var dc = decoChildren[di];
    var dcp = dc.properties || {};
    console.log("[handleChip]   child[" + di + "] type=" + dc.type +
      " layoutMode=" + dcp.layoutMode +
      " isStack=" + dcp.isStack +
      " children=" + (dc.children || []).length +
      " content=" + (dcp.content || ""));
  }

  // decoNode 내부에서 NONE 프레임(content holder) 찾기
  var noneFrame = findNoneFrame(decoNode);
  if (!noneFrame) {
    console.log("[handleChip] noneFrame not found inside decoNode");
    // decoNode 자체가 NONE frame일 수도 있음 — mergeWrapperChains가 병합한 경우
    var hasDirectText = false;
    for (var i = 0; i < decoChildren.length; i++) {
      if (decoChildren[i].type === "Text") { hasDirectText = true; break; }
    }
    if (hasDirectText) {
      console.log("[handleChip] decoNode has direct Text children, treating as content node");
      noneFrame = decoNode;
    } else {
      return;
    }
  }

  var noneRect = noneFrame.rect || {};

  // 유의미한 자식만 남기고 STACK 아티팩트 제거
  var oldChildren = noneFrame.children || [];
  var newChildren = filterChipChildren(oldChildren);

  // 남은 자식들의 bounding box로 패딩 계산
  var pad = calculateBoundingPadding(newChildren, noneRect);

  // NONE → HORIZONTAL 변환, 패딩 적용
  var np = noneFrame.properties || {};
  np.layoutMode = "HORIZONTAL";
  np.crossAxisAlignment = "center";
  np.mainAxisAlignment = "center";
  np.paddingTop = pad.top;
  np.paddingBottom = pad.bottom;
  np.paddingLeft = pad.left;
  np.paddingRight = pad.right;
  noneFrame.properties = np;
  noneFrame.children = newChildren;
}

// 자식 노드의 layoutMode에 따라 수평/수직 정렬 설정
function applyAlignByLayoutDir(props, hAlign, vAlign) {
  if (props.layoutMode === "VERTICAL") {
    props.mainAxisAlignment = vAlign;
    props.crossAxisAlignment = hAlign;
  } else {
    props.mainAxisAlignment = hAlign;
    props.crossAxisAlignment = vAlign;
  }
}

// --- NavigationToolbar helpers ---

function classifyToolbarChildren(children, toolbarRight) {
  var leading = null, title = null, actions = null;

  if (children.length >= 3) {
    var sorted = children.slice().sort(function(a, b) {
      return ((a.rect || {}).x || 0) - ((b.rect || {}).x || 0);
    });
    leading = sorted[0];
    title = sorted[1];
    actions = sorted[2];
  } else if (children.length === 2) {
    var r1 = children[1].rect || {};
    var r1RightDist = toolbarRight - ((r1.x || 0) + (r1.w || 0));
    if (r1RightDist < 80) {
      title = children[0];
      actions = children[1];
    } else {
      leading = children[0];
      title = children[1];
    }
  } else {
    title = children[0];
  }

  return { leading: leading, title: title, actions: actions };
}

function normalizeBackButton(node) {
  if (!node) return false;
  if (node.widgetName === "BackButton") {
    var r = node.rect || {};
    var w = r.w || 0, h = r.h || 0;
    if (w !== 48) {
      r.x = (r.x || 0) + (w - 48) / 2;
      r.w = 48;
    }
    if (h !== 48) {
      r.y = (r.y || 0) + (h - 48) / 2;
      r.h = 48;
    }
    node.rect = r;
    var p = node.properties || {};
    p.fixedSize = true;
    p.fixedWidth = true;
    p.fixedHeight = true;
    if (!p.layoutMode) p.layoutMode = "HORIZONTAL";
    p.mainAxisAlignment = "center";
    p.crossAxisAlignment = "center";
    node.properties = p;
    return true;
  }
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) {
    if (normalizeBackButton(ch[i])) return true;
  }
  return false;
}

function detectCenterTitle(title, toolbarCenter, nodeW) {
  if (!title) return false;
  var tr = title.rect || {};
  var titleCenter = (tr.x || 0) + (tr.w || 0) / 2;
  return Math.abs(titleCenter - toolbarCenter) < nodeW * 0.15;
}

function markTitleTruncation(node) {
  if (!node) return;
  if (node.type === "Text") {
    var p = node.properties || {};
    p.textTruncate = "ENDING";
    node.properties = p;
    return;
  }
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) markTitleTruncation(ch[i]);
}

function markTitleCenter(node) {
  if (!node) return;
  if (node.type === "Text") {
    var p = node.properties || {};
    p.textAlign = "center";
    p.textAlignVertical = "center";
    node.properties = p;
    return;
  }
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) markTitleCenter(ch[i]);
}

function getTitleFontMetrics(node) {
  var fontSize = 16;
  var lineHeightMultiplier = 1.4;

  function findFontSize(n) {
    if (!n) return;
    if (n.type === "Text") {
      var p = n.properties || {};
      if (p.fontSize) fontSize = p.fontSize;
      if (p.lineHeightMultiplier) lineHeightMultiplier = p.lineHeightMultiplier;
      return;
    }
    var ch = n.children || [];
    for (var i = 0; i < ch.length; i++) findFontSize(ch[i]);
  }
  findFontSize(node);

  return { fontSize: fontSize, lineHeightMultiplier: lineHeightMultiplier };
}

function buildCenteredToolbar(node, props, leading, title, actions, nodeRect) {
  var nodeX = nodeRect.x || 0;
  var nodeW = nodeRect.w || 0;
  var nodeY = nodeRect.y || 0;
  var nodeH = nodeRect.h || 56;
  var toolbarRight = nodeX + nodeW;

  var padLeft = 0, padRight = 0;
  if (leading) {
    var lr = leading.rect || {};
    padLeft = Math.max(0, Math.round((lr.x || 0) - nodeX));
  }
  if (actions) {
    var ar = actions.rect || {};
    padRight = Math.max(0, Math.round(toolbarRight - ((ar.x || 0) + (ar.w || 0))));
  }

  if (title) markTitleCenter(title);

  // middle STACK 영역 계산
  var leadEdge = padLeft + (leading ? ((leading.rect || {}).w || 0) : 0);
  var actEdge = padRight + (actions ? ((actions.rect || {}).w || 0) : 0);
  if (leading) leadEdge += 16;
  if (actions) actEdge += 16;
  var middleX = nodeX + leadEdge;
  var middleW = nodeW - leadEdge - actEdge;

  if (title) {
    var toolbarCenterRel = nodeX + nodeW / 2;
    var middleCenter = middleX + middleW / 2;
    var offsetX = toolbarCenterRel - middleCenter;
    var metrics = getTitleFontMetrics(title);
    var singleLineH = Math.ceil(metrics.fontSize * metrics.lineHeightMultiplier);
    var offsetY = nodeY + (nodeH - singleLineH) / 2;
    title.rect = { x: middleX + offsetX, y: offsetY, w: middleW, h: singleLineH };
  }

  var middleStack = {
    type: "Frame",
    rect: { x: middleX, y: nodeY, w: middleW, h: nodeH },
    properties: {
      isStack: true,
      clipsContent: true,
      sizingH: "FILL",
    },
    children: title ? [title] : [],
  };

  var newChildren = [];
  if (leading) {
    newChildren.push(leading);
    newChildren.push({
      type: "Frame",
      rect: { x: nodeX + padLeft + ((leading.rect || {}).w || 0), y: nodeY, w: 16, h: 1 },
      properties: {},
      children: [],
    });
  }
  newChildren.push(middleStack);
  if (actions) {
    newChildren.push({
      type: "Frame",
      rect: { x: middleX + middleW, y: nodeY, w: 16, h: 1 },
      properties: {},
      children: [],
    });
    newChildren.push(actions);
  }

  props.paddingLeft = padLeft;
  props.paddingRight = padRight;
  props.itemSpacing = 0;
  node.children = newChildren;
  node.properties = props;
}

function buildLeftAlignedToolbar(node, props, leading, title, actions, nodeRect) {
  var nodeX = nodeRect.x || 0;
  var nodeW = nodeRect.w || 0;
  var nodeY = nodeRect.y || 0;
  var toolbarRight = nodeX + nodeW;

  var newChildren = [];

  if (leading) newChildren.push(leading);

  if (leading && title) {
    var leadR = leading.rect || {};
    var spacerX = (leadR.x || 0) + (leadR.w || 0);
    newChildren.push({
      type: "Frame",
      rect: { x: spacerX, y: nodeY, w: 16, h: 1 },
      properties: {},
      children: [],
    });
  }

  if (title) newChildren.push(title);

  if (title && actions) {
    var tR = title.rect || {};
    var spacerX2 = (tR.x || 0) + (tR.w || 0);
    newChildren.push({
      type: "Frame",
      rect: { x: spacerX2, y: nodeY, w: 16, h: 1 },
      properties: {},
      children: [],
    });
  }

  if (actions) newChildren.push(actions);

  if (title) {
    var tp = title.properties || {};
    tp.sizingH = "FILL";
    title.properties = tp;
  }

  if (leading) {
    var firstR = leading.rect || {};
    props.paddingLeft = Math.max(0, Math.round((firstR.x || 0) - nodeX));
  } else if (title) {
    var firstR2 = title.rect || {};
    props.paddingLeft = Math.max(0, Math.round((firstR2.x || 0) - nodeX));
  }
  if (actions) {
    var lastR = actions.rect || {};
    props.paddingRight = Math.max(0, Math.round(toolbarRight - ((lastR.x || 0) + (lastR.w || 0))));
  }

  props.itemSpacing = 0;

  node.children = newChildren;
  node.properties = props;
}

function handleNavigationToolbar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  props.layoutMode = "HORIZONTAL";
  props.crossAxisAlignment = "center";
  props.itemSpacing = 0;
  node.properties = props;

  var nodeRect = node.rect || {};
  var nodeX = nodeRect.x || 0;
  var nodeW = nodeRect.w || 0;
  var toolbarCenter = nodeX + nodeW / 2;
  var toolbarRight = nodeX + nodeW;

  if (children.length < 1) return;

  var classified = classifyToolbarChildren(children, toolbarRight);
  var leading = classified.leading;
  var title = classified.title;
  var actions = classified.actions;

  if (leading) normalizeBackButton(leading);

  var isCentered = detectCenterTitle(title, toolbarCenter, nodeW);

  if (title) markTitleTruncation(title);

  if (isCentered) {
    buildCenteredToolbar(node, props, leading, title, actions, nodeRect);
  } else {
    buildLeftAlignedToolbar(node, props, leading, title, actions, nodeRect);
  }
}

function handleBottomNavigationBar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  props.layoutMode = "HORIZONTAL";
  props.mainAxisAlignment = "spaceAround";
  props.crossAxisAlignment = "center";
  node.properties = props;

  for (var i = 0; i < children.length; i++) {
    var cp = children[i].properties || {};
    cp.flexGrow = 1;
    cp.flexFit = "FlexFit.tight";
    delete cp.fixedWidth;
    cp.crossAxisAlignment = "center";
    cp.mainAxisAlignment = "center";
    children[i].properties = cp;

    // Descendant Text: FILL + center (fills tab width, truncates if too long)
    _setBottomNavTextFill(children[i]);
  }
}

function _setBottomNavTextFill(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "Text") {
    var p = node.properties || {};
    p.sizingH = "FILL";
    p.textAlign = "center";
    node.properties = p;
    return;
  }
  var ch = node.children || [];
  for (var i = 0; i < ch.length; i++) {
    _setBottomNavTextFill(ch[i]);
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
  } else if (!props.layoutMode && children.length === 1) {
    // 자식 1개: VERTICAL 기본값
    props.layoutMode = "VERTICAL";
    node.properties = props;
  } else if (!props.layoutMode && children.length === 0) {
    // 자식 0개 (spacer 등): 빈 Frame에는 layoutMode 추가하지 않음
    // convertSpacersToItemSpacing에서 spacer로 인식 가능하도록
  }
}

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

// --- 1.6 assignSizingHints ---

function assignImageSizing(node) {
  node._sizingH = "FIXED";
  node._sizingV = "FIXED";
}

function assignTextSizing(node, parentLayoutMode, crossIsStretch, parentIsAutoSize, parentNode, parentProps) {
  var props = node.properties || {};

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

  // Text + 부모 cross=stretch → cross축 FILL
  // 단, 부모가 mainAxisSize=AUTO (content 크기에 맞추는 컨테이너)면 스킵
  if (crossIsStretch && !parentIsAutoSize) {
    if (parentLayoutMode === "VERTICAL") {
      node._sizingH = "FILL";
    } else if (parentLayoutMode === "HORIZONTAL") {
      node._sizingV = "FILL";
    }
  }

  // 크롤러가 명시적으로 sizingH/sizingV를 설정한 경우 반영
  if (props.sizingH === "FILL") node._sizingH = "FILL";
  if (props.sizingV === "FILL") node._sizingV = "FILL";

  // 여러 줄 Text가 부모 available width를 채우면 → FILL (Flutter에서 constrained wrap → Figma에서도 wrap)
  // 단일 행 텍스트는 HUG 유지 (FILL로 바꾸면 Figma 폰트 메트릭 차이로 줄바꿈 발생)
  if (node._sizingH === "HUG" && parentNode && parentNode.rect) {
    var parentW = parentNode.rect.w || 0;
    var parentPadL = parentProps ? (parentProps.paddingLeft || 0) : 0;
    var parentPadR = parentProps ? (parentProps.paddingRight || 0) : 0;
    var availW = parentW - parentPadL - parentPadR;
    var textW = (node.rect || {}).w || 0;
    var textH = (node.rect || {}).h || 0;
    var fontSize = props.fontSize || 16;
    var lineHMul = props.lineHeightMultiplier || 1.4;
    var singleLineH = fontSize * lineHMul;
    if (textW > 0 && availW > 0 && (textW - availW) >= -1 && textH > singleLineH * 1.5) {
      node._sizingH = "FILL";
    }
  }
}

function assignFrameSizing(node, props, crossIsStretch, parentIsAutoSize, parentLayoutMode, isSoleFlexChild) {
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

    // Expanded (flexGrow > 0 + tight):
    // - 유일한 flex 자식 → FILL (Figma에서 반응형 동작)
    // - 여러 flex 자식 → FIXED (비율 보존, Figma layoutGrow 미지원)
    if (flexGrow > 0 && isTight && isSoleFlexChild) {
      if (parentLayoutMode === "HORIZONTAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "VERTICAL") {
        node._sizingV = "FILL";
      }
    }

    // 부모 cross=stretch → cross축 FILL
    // 단, 부모가 mainAxisSize=AUTO (content 크기에 맞추는 컨테이너)면 스킵
    if (crossIsStretch && !parentIsAutoSize) {
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

  // 크롤러/전처리가 명시적으로 FILL을 설정한 경우 반영
  if (props.sizingH === "FILL") node._sizingH = "FILL";
  if (props.sizingV === "FILL") node._sizingV = "FILL";
}

function applySizedBoxOverrides(node, props) {
  // SizedBox 단축 고정: fixedWidth/fixedHeight가 있으면 해당 축 FIXED
  // 단, 이미 FILL(Expanded/Flexible)이면 flex 우선 (AppBar leading 등)
  if (props.fixedWidth && node._sizingH !== "FILL") node._sizingH = "FIXED";
  if (props.fixedHeight && node._sizingV !== "FILL") node._sizingV = "FIXED";
}

function propagateWrapFlags(node, props, children) {
  // Wrap 포함 여부 전파: 자식에 Wrap이 있거나 자손에 Wrap이 있으면 플래그 설정
  if (props.layoutWrap) {
    node._hasWrap = true;
  }
  if (node.type === "Frame" && props.layoutMode && !props.layoutWrap) {
    var hasWrapDescendant = false;
    for (var wi = 0; wi < children.length; wi++) {
      if (children[wi]._hasWrap) { hasWrapDescendant = true; break; }
    }
    if (hasWrapDescendant) {
      node._hasWrap = true; // 상위로 전파
      // Wrap 줄바꿈을 위해 조상 sizing 조정:
      // H: FIXED → FILL (Wrap이 부모 폭을 채워야 줄바꿈 동작)
      // V: FIXED → HUG (Wrap 줄바꿈에 맞춰 높이 조절)
      // FILL은 유지 (부모 공간 내에서 동작, overflow 방지)
      if (node._sizingH === "FIXED") {
        node._sizingH = "FILL";
      }
      if (node._sizingV === "FIXED") {
        node._sizingV = "HUG";
      }
    }
  }
}

function propagateExpandedFill(node, props, children, parentProps) {
  // 자식 중 주축 FILL이 있으면 부모도 같은 축에서 FILL로 승격
  // 단, 같은 축 방향일 때만 전파 (Column→Column 체인은 OK, Row(H)→Column(V)은 안 됨)
  // HUG 부모도 승격 대상 (mainAxisSize=AUTO 래퍼가 Expanded 전파를 막지 않도록)
  if (node.type !== "Frame" || !props.layoutMode) return;
  if (!parentProps) return;
  if (props.fixedSize || props.isIconBox || props.isSvgBox) return;

  var layoutDir = props.layoutMode;
  var isVert = layoutDir === "VERTICAL" || layoutDir === "COLUMN";
  var isHoriz = layoutDir === "HORIZONTAL" || layoutDir === "ROW";

  var parentDir = parentProps.layoutMode || "";
  var parentIsVert = parentDir === "VERTICAL" || parentDir === "COLUMN";
  var parentIsHoriz = parentDir === "HORIZONTAL" || parentDir === "ROW";

  if (isVert && parentIsVert) {
    var hasVFill = false;
    for (var i = 0; i < children.length; i++) {
      if (children[i]._sizingV === "FILL") { hasVFill = true; break; }
    }
    if (hasVFill && node._sizingV !== "FILL") {
      node._sizingV = "FILL";
    }
  }

  if (isHoriz && parentIsHoriz) {
    var hasHFill = false;
    for (var i = 0; i < children.length; i++) {
      if (children[i]._sizingH === "FILL") { hasHFill = true; break; }
    }
    if (hasHFill && node._sizingH !== "FILL") {
      node._sizingH = "FILL";
    }
  }
}

function assignSizingHints(node, parentProps, parentNode) {
  if (!node || typeof node !== "object") return;

  var props = node.properties || {};
  var parentLayoutMode = parentProps ? parentProps.layoutMode : null;
  var parentCross = parentProps ? (parentProps.crossAxisAlignment || "") : "";
  var crossIsStretch = parentCross.indexOf("stretch") !== -1;
  var parentMainAxisSize = parentProps ? (parentProps.mainAxisSize || "") : "";
  var parentIsAutoSize = parentMainAxisSize === "AUTO" || parentMainAxisSize === "min";

  // 형제 중 flexGrow > 0인 자식 수 계산 (sole flex child 판별)
  var siblingFlexCount = 0;
  if (parentNode) {
    var siblings = parentNode.children || [];
    for (var si = 0; si < siblings.length; si++) {
      var sp = (siblings[si].properties || {});
      if ((sp.flexGrow || 0) > 0) siblingFlexCount++;
    }
  }
  var isSoleFlexChild = siblingFlexCount === 1;

  if (node.type === "Image") {
    assignImageSizing(node);
  } else if (node.type === "Text") {
    assignTextSizing(node, parentLayoutMode, crossIsStretch, parentIsAutoSize, parentNode, parentProps);
  } else if (node.type === "Frame") {
    assignFrameSizing(node, props, crossIsStretch, parentIsAutoSize, parentLayoutMode, isSoleFlexChild);
  }

  applySizedBoxOverrides(node, props);

  // 자식 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    assignSizingHints(children[i], props, node);
  }

  propagateWrapFlags(node, props, children);
  propagateExpandedFill(node, props, children, parentProps);
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
  detectOverlays(screen);
  preprocessNamedWidgets(screen);
  inferMissingLayout(screen);
  convertSpacersToItemSpacing(screen);
  removeEmptyLeaves(screen);
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

  return screenFrame;
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
      // FittedBox 등으로 fixedSize 마킹된 텍스트는 고정 크기 텍스트 박스 (줄바꿈 방지)
      if (props.fixedSize) {
        figNode.textAutoResize = "TRUNCATE";
        figNode.textTruncation = "DISABLED";
      }
      // textTruncate: "ENDING" → 말줄임표(…) 표시, 단일 행 높이로 제한
      if (props.textTruncate === "ENDING") {
        var fontSize = props.fontSize || 16;
        var lineHMul = props.lineHeightMultiplier || 1.4;
        var singleLineH = Math.ceil(fontSize * lineHMul);
        figNode.resize(rw, singleLineH);
        figNode.textAutoResize = "TRUNCATE";
        figNode.textTruncation = "ENDING";
      }
      // maxLines/textOverflow 기반 truncation
      if (props.maxLines === 1 || props.textOverflow === "ellipsis") {
        var fontSize2 = props.fontSize || 16;
        var lineHMul2 = props.lineHeightMultiplier || 1.4;
        var singleLineH2 = Math.ceil(fontSize2 * lineHMul2);
        figNode.resize(rw, singleLineH2);
        figNode.textAutoResize = "TRUNCATE";
        figNode.textTruncation = (props.textOverflow === "ellipsis") ? "ENDING" : "DISABLED";
      }
      // 세로 중앙 정렬 (FittedBox alignment 등)
      if (props.textAlignVertical === "center") {
        figNode.textAlignVertical = "CENTER";
      }
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

        // clipsContent: BackdropFilter blur 또는 Flutter clipsContent 속성
        if ((props.backgroundBlur && typeof props.backgroundBlur === "number" && props.backgroundBlur > 0) ||
            props.clipsContent === true) {
          figNode.clipsContent = true;
        }
      }
    }
  } catch (e) {
    console.warn("[FlutterPlugin] 노드 생성 실패:", e, node.type);
    return;
  }

  if (!figNode) return;

  figNode.name = generateNodeName(node);

  // Opacity
  if (props.opacity != null && typeof props.opacity === "number" && props.opacity < 1) {
    figNode.opacity = props.opacity;
  }

  // Rotation은 위치 확정 후 적용 (아래에서 처리)
  var pendingRotation = 0;
  if (props.rotation != null && typeof props.rotation === "number" && Math.abs(props.rotation) > 0.01) {
    pendingRotation = -props.rotation;  // Flutter CW → Figma CCW
  }

  // flexGrow + fixedSize 충돌: flexGrow는 이제 FIXED 모드 사용이므로 비활성화
  if (false && props.flexGrow > 0 && props.fixedSize && node.type === "Frame") {
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
    // flexGrow wrapper 경로에서도 relativeTransform으로 center 회전
    if (pendingRotation !== 0) {
      var frad = pendingRotation * Math.PI / 180;
      var fcosR = Math.cos(frad);
      var fsinR = Math.sin(frad);
      var fcx = figNode.x + rw / 2;
      var fcy = figNode.y + rh / 2;
      var ftx = fcx - (rw / 2 * fcosR + rh / 2 * fsinR);
      var fty = fcy - (-rw / 2 * fsinR + rh / 2 * fcosR);
      figNode.relativeTransform = [[fcosR, fsinR, ftx], [-fsinR, fcosR, fty]];
    }
    return;
  }

  // appendChild (sizing 전에 반드시)
  parentFigma.appendChild(figNode);

  // Sizing 적용 (appendChild 후)
  applySizing(figNode, node, parentLayoutDir);

  // Text TRUNCATE: applySizing 후 재적용
  // (layoutSizingVertical=HUG가 textAutoResize를 HEIGHT로 리셋하므로)
  if (node.type === "Text") {
    var needsTruncate = false;
    var truncType = "DISABLED";
    if (props.textTruncate === "ENDING") {
      needsTruncate = true;
      truncType = "ENDING";
    } else if (props.maxLines === 1 || props.textOverflow === "ellipsis") {
      needsTruncate = true;
      truncType = (props.textOverflow === "ellipsis") ? "ENDING" : "DISABLED";
    }
    if (needsTruncate) {
      var fs = props.fontSize || 16;
      var lhm = props.lineHeightMultiplier || 1.4;
      var slh = Math.ceil(fs * lhm);
      figNode.resize(rw, slh);
      // TRUNCATE 설정 (sizing 전에 — TRUNCATE가 sizing을 리셋할 수 있으므로)
      figNode.textAutoResize = "TRUNCATE";
      figNode.textTruncation = truncType;
      // sizing 복원 (TRUNCATE가 양축 FIXED로 리셋하므로)
      try { figNode.layoutSizingVertical = "FIXED"; } catch(e) {}
      try {
        var intendedH = node._sizingH || "FIXED";
        if (intendedH === "FILL") {
          figNode.layoutSizingHorizontal = "FILL";
        } else if (intendedH === "HUG" && !props.textTruncate) {
          // HUG + maxLines/textOverflow only (no textTruncate): restore HUG
          // textTruncate is set intentionally by preprocessing (e.g., toolbar title)
          // maxLines/textOverflow come from Flutter widget props (e.g., bottom nav label)
          figNode.textAutoResize = "WIDTH_AND_HEIGHT";
          figNode.textTruncation = "DISABLED";
          figNode.layoutSizingHorizontal = "HUG";
          figNode.layoutSizingVertical = "HUG";
        }
      } catch(e) {}
    }
  }

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

    // Stack 자식: 부모 rect 기준 상대 좌표로 절대 배치 → 그 후 rotation 적용
    // (자식의 renderNode에서는 rotation 미적용 상태)
    if (props.isStack) {
      var parentRect = node.rect || {};
      var px = typeof parentRect.x === "number" ? parentRect.x : 0;
      var py = typeof parentRect.y === "number" ? parentRect.y : 0;
      for (var si = 0; si < children.length; si++) {
        var child = children[si] || {};
        var childRect = child.rect || {};
        var cx = typeof childRect.x === "number" ? childRect.x : 0;
        var cy = typeof childRect.y === "number" ? childRect.y : 0;
        try {
          var childFig = figNode.children[si];
          if (childFig) {
            var origX = cx - px;
            var origY = cy - py;
            var childRot = (child.visual && child.visual.rotation) ||
                           (child.properties && child.properties.rotation);
            if (typeof childRot === "number" && Math.abs(childRot) > 0.01) {
              // Flutter: center 기준 회전 / Figma: top-left 기준 회전
              // → relativeTransform 직접 설정으로 center 보존
              var cw = typeof childRect.w === "number" ? childRect.w : 0;
              var ch = typeof childRect.h === "number" ? childRect.h : 0;
              var figmaRotDeg = -childRot;  // Flutter CW → Figma CCW
              var rad = figmaRotDeg * Math.PI / 180;
              var cosR = Math.cos(rad);
              var sinR = Math.sin(rad);
              // Flutter visual center (unrotated rect 기준)
              var centerX = origX + cw / 2;
              var centerY = origY + ch / 2;
              // relativeTransform: [[cosR, sinR, tx], [-sinR, cosR, ty]]
              // center(w/2, h/2) → (centerX, centerY) 보존:
              var tx = centerX - (cw / 2 * cosR + ch / 2 * sinR);
              var ty = centerY - (-cw / 2 * sinR + ch / 2 * cosR);
              childFig.relativeTransform = [[cosR, sinR, tx], [-sinR, cosR, ty]];
            } else {
              childFig.x = origX;
              childFig.y = origY;
            }
          }
        } catch (e) {}
      }
    }
  }

  // 비-Stack 노드: relativeTransform으로 center 기준 회전 적용
  if (pendingRotation !== 0 && parentLayoutDir !== "NONE") {
    var nrad = pendingRotation * Math.PI / 180;
    var ncosR = Math.cos(nrad);
    var nsinR = Math.sin(nrad);
    var ncx = figNode.x + rw / 2;
    var ncy = figNode.y + rh / 2;
    var ntx = ncx - (rw / 2 * ncosR + rh / 2 * nsinR);
    var nty = ncy - (-rw / 2 * nsinR + rh / 2 * ncosR);
    figNode.relativeTransform = [[ncosR, nsinR, ntx], [-nsinR, ncosR, nty]];
  }

  // clipPath: 벡터 마스크로 클리핑 (wrapper frame 방식)
  // Figma mask는 sibling만 클립하므로, frame의 fills까지 클립하려면
  // wrapper frame 안에 mask + 원본 frame을 배치해야 함
  var clipPoints = node.clipPath || props.clipPath;
  if (clipPoints && clipPoints.length > 2 && figNode.type === "FRAME") {
    var svgPath = "M " + clipPoints[0].x + " " + clipPoints[0].y;
    for (var ci = 1; ci < clipPoints.length; ci++) {
      svgPath += " L " + clipPoints[ci].x + " " + clipPoints[ci].y;
    }
    svgPath += " Z";

    var maskVector = figma.createVector();
    maskVector.vectorPaths = [{ windingRule: "NONZERO", data: svgPath }];
    maskVector.resize(rw, rh);
    maskVector.fills = [{ type: "SOLID", color: {r:1,g:1,b:1}, opacity: 1 }];
    maskVector.name = "ClipPath_mask";
    maskVector.isMask = true;

    // wrapper frame 생성
    var clipWrapper = figma.createFrame();
    clipWrapper.name = figNode.name + "_clipped";
    clipWrapper.resize(rw, rh);
    clipWrapper.fills = [];
    clipWrapper.clipsContent = true;
    clipWrapper.layoutMode = "NONE";

    // figNode의 부모에서 figNode 위치에 wrapper 삽입
    var figParent = figNode.parent;
    if (figParent) {
      var figIdx = -1;
      for (var fi = 0; fi < figParent.children.length; fi++) {
        if (figParent.children[fi] === figNode) { figIdx = fi; break; }
      }
      if (figIdx >= 0) {
        figParent.insertChild(figIdx, clipWrapper);
      }
    }

    // mask + 원본 frame을 wrapper에 배치
    clipWrapper.appendChild(maskVector);
    clipWrapper.appendChild(figNode);
    figNode.x = 0;
    figNode.y = 0;

    // 부모 auto-layout에서의 sizing을 wrapper에 전파
    try {
      clipWrapper.layoutSizingHorizontal = figNode.layoutSizingHorizontal;
      clipWrapper.layoutSizingVertical = figNode.layoutSizingVertical;
      if (figNode.layoutGrow > 0) clipWrapper.layoutGrow = figNode.layoutGrow;
    } catch (e) {}
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
      frame.strokeTopWeight =
        typeof props.borderTopWidth === "number" ? props.borderTopWidth : 0;
      frame.strokeRightWeight =
        typeof props.borderRightWidth === "number" ? props.borderRightWidth : 0;
      frame.strokeBottomWeight =
        typeof props.borderBottomWidth === "number" ? props.borderBottomWidth : 0;
      frame.strokeLeftWeight =
        typeof props.borderLeftWidth === "number" ? props.borderLeftWidth : 0;
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

  if (!Array.isArray(colors) || colors.length === 0) {
    applyBgColor(frame, props);
    return;
  }

  if (colors.length === 1) {
    var single = parseFlutterColor(colors[0]);
    frame.fills = [{
      type: "SOLID",
      color: { r: single.r, g: single.g, b: single.b },
      opacity: single.a,
    }];
    return;
  }

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
  } else {
    fill.type = "GRADIENT_LINEAR";
    fill.gradientTransform = buildLinearGradientTransform(0.5, 0, 0.5, 1);
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
  // Clamp dimensions and radius to avoid division by zero → Infinity
  frameW = Math.max(frameW, 1);
  frameH = Math.max(frameH, 1);
  var minDim = Math.min(frameW, frameH);
  var radiusPx = r * minDim;
  // 각 축의 normalized radius (element [0,1] 공간)
  var rx = radiusPx / frameW;
  var ry = radiusPx / frameH;
  // Clamp to avoid Infinity when radius=0
  rx = Math.max(rx, 0.001);
  ry = Math.max(ry, 0.001);
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

// ----------------------------
// applyAutoLayout: layoutMode, spacing, padding, alignment
// ----------------------------
function applyAutoLayout(frame, props) {
  // Stack은 절대 배치 → auto-layout 없음
  if (props.isStack) {
    frame.layoutMode = "NONE";
    // Stack clipsContent는 Flutter clipBehavior 속성에 따라 결정 (props.clipsContent)
    if (props.clipsContent === true) {
      frame.clipsContent = true;
    }
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
    frame.counterAxisSizingMode = "AUTO";
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

  // Counter axis sizing: 기본 FIXED로 안전 (WRAP은 위에서 AUTO로 설정됨)
  if (!props.layoutWrap) {
    frame.counterAxisSizingMode = "FIXED";
  }

  // Alignment
  frame.primaryAxisAlignItems = mapMainAxisAlign(props.mainAxisAlignment);
  frame.counterAxisAlignItems = mapCrossAxisAlign(props.crossAxisAlignment);

  // spaceAround / spaceEvenly → SPACE_BETWEEN + 패딩으로 시뮬레이션
  var maKey = String(props.mainAxisAlignment || "").split(".").pop();
  if (maKey === "spaceAround" || maKey === "spaceEvenly") {
    var spacing = frame.itemSpacing || 0;
    var extraPad = maKey === "spaceAround" ? spacing / 2 : spacing;
    var isHoriz = (props.layoutMode === "HORIZONTAL" || props.layoutMode === "ROW");
    if (isHoriz) {
      frame.paddingLeft = (frame.paddingLeft || 0) + extraPad;
      frame.paddingRight = (frame.paddingRight || 0) + extraPad;
    } else {
      frame.paddingTop = (frame.paddingTop || 0) + extraPad;
      frame.paddingBottom = (frame.paddingBottom || 0) + extraPad;
    }
  }
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

    // flexGrow: FIXED 모드 사용 (Flutter 계산 크기 반영)
    // Figma layoutGrow는 비율 미지원이므로 설정하지 않음
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


// ----------------------------
// clientStorage 헬퍼
// ----------------------------
var STORAGE_KEY = "savedJsonList";

function generateId() {
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var id = "";
  for (var i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function extractJsonName(jsonStr) {
  try {
    var obj = JSON.parse(jsonStr);
    if (obj.widgetName) return obj.widgetName;
    if (obj.name) return obj.name;
    if (obj.children && obj.children.length > 0) {
      var first = obj.children[0];
      if (first.widgetName) return first.widgetName;
      if (first.name) return first.name;
    }
    if (obj.type) return obj.type;
  } catch (e) {
    // ignore
  }
  return "Untitled";
}

async function loadJsonList() {
  var list = (await figma.clientStorage.getAsync(STORAGE_KEY)) || [];
  return list;
}

async function saveJsonList(list) {
  await figma.clientStorage.setAsync(STORAGE_KEY, list);
}

async function sendJsonListToUI() {
  var list = await loadJsonList();
  var items = list.map(function (item) {
    return {
      id: item.id,
      name: item.name,
      savedAt: item.savedAt,
      preview: item.jsonStr.substring(0, 80),
    };
  });
  figma.ui.postMessage({ type: "json-list", items: items });
}

// ----------------------------
// UI 메시지 핸들러
// ----------------------------
figma.ui.onmessage = function (msg) {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "load-json-list") {
    sendJsonListToUI();
    return;
  }

  if (msg.type === "save-json") {
    (async function () {
      var list = await loadJsonList();
      var entry = {
        id: generateId(),
        name: msg.name || extractJsonName(msg.json),
        savedAt: new Date().toISOString(),
        jsonStr: msg.json,
      };
      list.push(entry);
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("갤러리에 저장되었습니다.");
    })();
    return;
  }

  if (msg.type === "load-json-item") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          figma.ui.postMessage({
            type: "json-item",
            id: list[i].id,
            name: list[i].name,
            json: list[i].jsonStr,
          });
          return;
        }
      }
    })();
    return;
  }

  if (msg.type === "update-json") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          list[i].name = msg.name;
          list[i].jsonStr = msg.json;
          break;
        }
      }
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("수정되었습니다.");
    })();
    return;
  }

  if (msg.type === "rename-json") {
    (async function () {
      var list = await loadJsonList();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          list[i].name = msg.name;
          break;
        }
      }
      await saveJsonList(list);
    })();
    return;
  }

  if (msg.type === "delete-json") {
    (async function () {
      var list = await loadJsonList();
      list = list.filter(function (item) {
        return item.id !== msg.id;
      });
      await saveJsonList(list);
      await sendJsonListToUI();
      figma.notify("삭제되었습니다.");
    })();
    return;
  }

  if (msg.type === "render-gallery-item") {
    (async function () {
      var list = await loadJsonList();
      var item = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === msg.id) {
          item = list[i];
          break;
        }
      }
      if (!item) {
        figma.notify("해당 항목을 찾을 수 없습니다.");
        return;
      }
      try {
        var root = JSON.parse(item.jsonStr);
        await renderWholeLayout(root);
        figma.notify("레이아웃 복원이 완료되었습니다.");
      } catch (e) {
        console.error("[FlutterPlugin] render-gallery-item error", e);
        figma.notify("렌더링에 실패했습니다.");
      }
    })();
    return;
  }

  if (msg.type === "render-all-layouts") {
    (async function () {
      var list = await loadJsonList();
      if (list.length === 0) {
        figma.notify("저장된 JSON이 없습니다.");
        return;
      }
      var offsetX = 0;
      var gap = 100;
      var rendered = 0;
      for (var i = 0; i < list.length; i++) {
        try {
          var root = JSON.parse(list[i].jsonStr);
          var frame = await renderWholeLayout(root);
          if (frame) {
            frame.x = offsetX;
            frame.y = 0;
            offsetX += frame.width + gap;
          }
          rendered++;
        } catch (e) {
          console.error(
            "[FlutterPlugin] render-all error for item",
            list[i].name,
            e
          );
        }
      }
      figma.notify(rendered + "개 화면 렌더링 완료");
    })();
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
