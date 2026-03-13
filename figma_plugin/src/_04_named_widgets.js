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

  // 각 그룹을 처리: 1개면 그대로, 2개 이상이면 COLUMN 래퍼 생성
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

  target.children = newChildren;

  // 가장 넓은 그룹(title/subtitle 영역)에 flexGrow 부여
  var widestIdx = 0;
  var widestW = 0;
  for (var i = 0; i < newChildren.length; i++) {
    var cw = (newChildren[i].rect || {}).w || 0;
    if (cw > widestW) {
      widestW = cw;
      widestIdx = i;
    }
  }

  var titleP = newChildren[widestIdx].properties || {};
  titleP.flexGrow = 1;
  titleP.flexFit = "FlexFit.tight";
  newChildren[widestIdx].properties = titleP;
}

function handleChip(node) {
  // Chip 구조: widgetName 노드 → ... → COLUMN(bg/border) → NONE(content) → [STACK, Text, STACK]
  // 목표: NONE 프레임을 HORIZONTAL로 변환하고, 좌표 기반 패딩 추출, 빈 STACK 제거

  // walk-down: widgetName 노드에서 실제 bg/border가 있는 decoration 노드까지
  function findDecoNode(n) {
    var p = n.properties || {};
    if (p.backgroundColor || p.hasBorder || p.borderRadius) return n;
    var ch = n.children || [];
    for (var i = 0; i < ch.length; i++) {
      var found = findDecoNode(ch[i]);
      if (found) return found;
    }
    return null;
  }

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
  // normalizeSchemaV2 이후: NONE → layoutMode 없음, STACK → isStack=true
  function findNoneFrame(n) {
    var ch = n.children || [];
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

  var noneFrame = findNoneFrame(decoNode);
  if (!noneFrame) {
    console.log("[handleChip] noneFrame not found inside decoNode");
    // decoNode 자체가 NONE frame일 수도 있음 — mergeWrapperChains가 병합한 경우
    // decoNode의 자식 중 Text/STACK이 직접 있으면 decoNode 자체를 처리
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
  var nx = noneRect.x || 0, ny = noneRect.y || 0;
  var nw = noneRect.w || 0, nh = noneRect.h || 0;

  // 유의미한 자식만 남기고 STACK 아티팩트 제거
  var oldChildren = noneFrame.children || [];
  var newChildren = [];
  for (var i = 0; i < oldChildren.length; i++) {
    var c = oldChildren[i];
    if (c.type === "Text") {
      newChildren.push(c);
    } else if (c.type === "Frame") {
      var cp = c.properties || {};
      // 비어 있는 STACK (clipsContent만 있고 자식 없음) → 제거
      // normalizeSchemaV2 이후: STACK → isStack=true, layoutMode 없음
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

  // 남은 자식들의 bounding box로 패딩 계산
  var cMinX = Infinity, cMinY = Infinity, cMaxX = 0, cMaxY = 0;
  for (var i = 0; i < newChildren.length; i++) {
    var cr = newChildren[i].rect || {};
    var lx = (cr.x || 0) - nx;
    var ly = (cr.y || 0) - ny;
    var lw = cr.w || 0;
    var lh = cr.h || 0;
    if (lx < cMinX) cMinX = lx;
    if (ly < cMinY) cMinY = ly;
    if (lx + lw > cMaxX) cMaxX = lx + lw;
    if (ly + lh > cMaxY) cMaxY = ly + lh;
  }

  var padTop = Math.max(0, Math.round(cMinY));
  var padLeft = Math.max(0, Math.round(cMinX));
  var padBottom = Math.max(0, Math.round(nh - cMaxY));
  var padRight = Math.max(0, Math.round(nw - cMaxX));

  // NONE → HORIZONTAL 변환, 패딩 적용
  var np = noneFrame.properties || {};
  np.layoutMode = "HORIZONTAL";
  np.crossAxisAlignment = "center";
  np.mainAxisAlignment = "center";
  np.paddingTop = padTop;
  np.paddingBottom = padBottom;
  np.paddingLeft = padLeft;
  np.paddingRight = padRight;
  noneFrame.properties = np;
  noneFrame.children = newChildren;
}

// 자식 노드의 layoutMode에 따라 수평/수직 정렬 설정
// hAlign: 수평 정렬 ("start"|"center"|"end")
// vAlign: 수직 정렬 ("start"|"center"|"end")
function applyAlignByLayoutDir(props, hAlign, vAlign) {
  if (props.layoutMode === "VERTICAL") {
    // VERTICAL: main=수직, cross=수평
    props.mainAxisAlignment = vAlign;
    props.crossAxisAlignment = hAlign;
  } else {
    // HORIZONTAL 또는 기타: main=수평, cross=수직
    props.mainAxisAlignment = hAlign;
    props.crossAxisAlignment = vAlign;
  }
}

function handleNavigationToolbar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  // ROW 모드 보장 (normalizeSchemaV2 이후 flat properties)
  props.layoutMode = "HORIZONTAL";
  props.mainAxisAlignment = "center";
  node.properties = props;

  var nodeRect = node.rect || {};
  var nodeH = nodeRect.h || 56;

  if (children.length === 3) {
    var c0rect = children[0].rect || {};
    var c2rect = children[2].rect || {};

    // leading → 래퍼로 감싸서 FILL + left + vcenter
    var leadWrapper = {
      type: "Frame",
      rect: { x: c0rect.x || 0, y: nodeRect.y || 0, w: c0rect.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[0]],
    };
    children[0] = leadWrapper;

    // title → HUG
    var titleP = children[1].properties || {};
    titleP.flexGrow = 0;
    delete titleP.flexFit;
    children[1].properties = titleP;

    // actions → 래퍼로 감싸서 FILL + right + vcenter
    // 원래 actions 노드는 자연 크기 유지 (터치 영역 보존)
    var actWrapper = {
      type: "Frame",
      rect: { x: c2rect.x || 0, y: nodeRect.y || 0, w: c2rect.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "end",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[2]],
    };
    children[2] = actWrapper;
  } else if (children.length === 2) {
    var c0r = children[0].rect || {};
    var c1r = children[1].rect || {};

    // 첫 자식 → FILL + left + vcenter (래퍼)
    var wrap0 = {
      type: "Frame",
      rect: { x: c0r.x || 0, y: nodeRect.y || 0, w: c0r.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "start",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[0]],
    };
    // 둘째 자식 → FILL + right + vcenter (래퍼)
    var wrap1 = {
      type: "Frame",
      rect: { x: c1r.x || 0, y: nodeRect.y || 0, w: c1r.w || 0, h: nodeH },
      properties: {
        layoutMode: "HORIZONTAL",
        mainAxisAlignment: "end",
        crossAxisAlignment: "center",
        flexGrow: 1,
        flexFit: "FlexFit.tight",
      },
      children: [children[1]],
    };
    children[0] = wrap0;
    children[1] = wrap1;
  }
}

function handleBottomNavigationBar(node) {
  var children = node.children || [];
  var props = node.properties || {};

  // ROW + spaceAround (normalizeSchemaV2 이후 flat properties)
  props.layoutMode = "HORIZONTAL";
  props.mainAxisAlignment = "spaceAround";
  props.crossAxisAlignment = "center";
  node.properties = props;

  // 각 아이템 FILL + center
  for (var i = 0; i < children.length; i++) {
    var cp = children[i].properties || {};
    cp.flexGrow = 1;
    cp.flexFit = "FlexFit.tight";
    delete cp.fixedWidth;
    cp.crossAxisAlignment = "center";
    cp.mainAxisAlignment = "center";
    children[i].properties = cp;
  }
}
