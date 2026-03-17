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
