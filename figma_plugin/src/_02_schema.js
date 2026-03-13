
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
