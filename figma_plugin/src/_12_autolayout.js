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
