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

function assignFrameSizing(node, props, crossIsStretch, parentIsAutoSize, parentLayoutMode) {
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

    // flexGrow > 0 → FIXED (Flutter가 계산한 rect 크기 사용, 비율 정확)
    // Figma layoutGrow는 비율을 지원하지 않으므로 FIXED로 실제 크기 반영
    if (flexGrow > 0) {
      // FIXED 유지 — rect 크기가 그대로 적용됨
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

function assignSizingHints(node, parentProps, parentNode) {
  if (!node || typeof node !== "object") return;

  var props = node.properties || {};
  var parentLayoutMode = parentProps ? parentProps.layoutMode : null;
  var parentCross = parentProps ? (parentProps.crossAxisAlignment || "") : "";
  var crossIsStretch = parentCross.indexOf("stretch") !== -1;
  var parentMainAxisSize = parentProps ? (parentProps.mainAxisSize || "") : "";
  var parentIsAutoSize = parentMainAxisSize === "AUTO" || parentMainAxisSize === "min";

  if (node.type === "Image") {
    assignImageSizing(node);
  } else if (node.type === "Text") {
    assignTextSizing(node, parentLayoutMode, crossIsStretch, parentIsAutoSize, parentNode, parentProps);
  } else if (node.type === "Frame") {
    assignFrameSizing(node, props, crossIsStretch, parentIsAutoSize, parentLayoutMode);
  }

  applySizedBoxOverrides(node, props);

  // 자식 재귀
  var children = node.children || [];
  for (var i = 0; i < children.length; i++) {
    assignSizingHints(children[i], props, node);
  }

  propagateWrapFlags(node, props, children);
}
