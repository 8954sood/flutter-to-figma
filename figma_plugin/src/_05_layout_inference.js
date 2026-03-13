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
