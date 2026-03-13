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

    // Text + 부모 cross=stretch → cross축 FILL
    if (crossIsStretch) {
      if (parentLayoutMode === "VERTICAL") {
        node._sizingH = "FILL";
      } else if (parentLayoutMode === "HORIZONTAL") {
        node._sizingV = "FILL";
      }
    }

    // 크롤러가 명시적으로 sizingH/sizingV를 설정한 경우 반영
    if (props.sizingH === "FILL") node._sizingH = "FILL";
    if (props.sizingV === "FILL") node._sizingV = "FILL";
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

      // flexGrow > 0 → FIXED (Flutter가 계산한 rect 크기 사용, 비율 정확)
      // Figma layoutGrow는 비율을 지원하지 않으므로 FIXED로 실제 크기 반영
      if (flexGrow > 0) {
        // FIXED 유지 — rect 크기가 그대로 적용됨
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

  // Wrap 자식을 가진 부모: cross axis를 FILL로 설정
  // (Wrap이 부모 전체 너비를 사용해야 줄바꿈이 올바르게 동작)
  if (node.type === "Frame" && props.layoutMode && !props.layoutWrap) {
    var hasWrapChild = false;
    for (var wi = 0; wi < children.length; wi++) {
      var cp = (children[wi].properties || {});
      if (cp.layoutWrap) { hasWrapChild = true; break; }
    }
    if (hasWrapChild) {
      if (props.layoutMode === "VERTICAL" && node._sizingH !== "FILL") {
        node._sizingH = "FILL";
      } else if (props.layoutMode === "HORIZONTAL" && node._sizingV !== "FILL") {
        node._sizingV = "FILL";
      }
    }
  }
}
