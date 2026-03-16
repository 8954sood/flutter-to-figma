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

  props.layoutMode = "HORIZONTAL";
  props.crossAxisAlignment = "center";
  props.itemSpacing = 0;
  node.properties = props;

  var nodeRect = node.rect || {};
  var nodeX = nodeRect.x || 0;
  var nodeW = nodeRect.w || 0;
  var nodeY = nodeRect.y || 0;
  var nodeH = nodeRect.h || 56;
  var toolbarCenter = nodeX + nodeW / 2;
  var toolbarRight = nodeX + nodeW;

  if (children.length < 1) return;

  // --- 자식을 leading / title / actions 로 분류 ---
  var leading = null, title = null, actions = null;

  if (children.length >= 3) {
    // x 좌표로 정렬 → 좌측=leading, 중간=title, 우측=actions
    var sorted = children.slice().sort(function(a, b) {
      return ((a.rect || {}).x || 0) - ((b.rect || {}).x || 0);
    });
    leading = sorted[0];
    title = sorted[1];
    actions = sorted[2];
  } else if (children.length === 2) {
    // Flutter 크롤러 순서: [leading, middle] 또는 [middle, trailing]
    // children[1]이 오른쪽 끝에 가까우면 → [middle, trailing]
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

  // --- BackButton 48x48 정규화 ---
  // AppBar가 leading을 56px ConstrainedBox로 감싸므로 rect가 56이 될 수 있음.
  // 실제 BackButton 터치 타겟은 48x48, 내부 아이콘은 center/center.
  function normalizeBackButton(n) {
    if (!n) return false;
    if (n.widgetName === "BackButton") {
      var r = n.rect || {};
      var w = r.w || 0, h = r.h || 0;
      if (w !== 48) {
        r.x = (r.x || 0) + (w - 48) / 2;
        r.w = 48;
      }
      if (h !== 48) {
        r.y = (r.y || 0) + (h - 48) / 2;
        r.h = 48;
      }
      n.rect = r;
      // FIXED 48x48 보장 (HUG 방지), center/center 정렬
      var p = n.properties || {};
      p.fixedSize = true;
      p.fixedWidth = true;
      p.fixedHeight = true;
      if (!p.layoutMode) p.layoutMode = "HORIZONTAL";
      p.mainAxisAlignment = "center";
      p.crossAxisAlignment = "center";
      n.properties = p;
      return true;
    }
    var ch = n.children || [];
    for (var i = 0; i < ch.length; i++) {
      if (normalizeBackButton(ch[i])) return true;
    }
    return false;
  }
  if (leading) normalizeBackButton(leading);

  // --- centerTitle 감지: title 중심이 toolbar 중심 근처인지 ---
  var isCentered = false;
  if (title) {
    var tr = title.rect || {};
    var titleCenter = (tr.x || 0) + (tr.w || 0) / 2;
    isCentered = Math.abs(titleCenter - toolbarCenter) < nodeW * 0.15;
  }

  // title에 truncation 설정 (양방향 모두)
  if (title) {
    function markTitleTruncation(n) {
      if (!n) return;
      if (n.type === "Text") {
        var p = n.properties || {};
        p.textTruncate = "ENDING";
        n.properties = p;
        return;
      }
      var ch = n.children || [];
      for (var i = 0; i < ch.length; i++) markTitleTruncation(ch[i]);
    }
    markTitleTruncation(title);
  }

  if (isCentered) {
    // --- centerTitle: true → STACK 방식으로 title 정중앙 배치 ---
    // 구조: toolbar(HORIZONTAL) = [leading] + [spacer] + middleStack(FILL, STACK, clip) + [spacer] + [actions]
    // middleStack 안에 title을 toolbar 전체 너비 rect로 배치 → textAlign center → 정중앙
    // clipsContent로 leading/actions 영역 침범 방지

    var padLeft = 0, padRight = 0;
    if (leading) {
      var lr = leading.rect || {};
      padLeft = Math.max(0, Math.round((lr.x || 0) - nodeX));
    }
    if (actions) {
      var ar = actions.rect || {};
      padRight = Math.max(0, Math.round(toolbarRight - ((ar.x || 0) + (ar.w || 0))));
    }

    // title Text에 textAlign center + textAlignVertical center 설정
    if (title) {
      function markTitleCenter(n) {
        if (!n) return;
        if (n.type === "Text") {
          var p = n.properties || {};
          p.textAlign = "center";
          p.textAlignVertical = "center";
          n.properties = p;
          return;
        }
        var ch = n.children || [];
        for (var i = 0; i < ch.length; i++) markTitleCenter(ch[i]);
      }
      markTitleCenter(title);
    }

    // middle STACK 영역 계산
    var leadEdge = padLeft + (leading ? ((leading.rect || {}).w || 0) : 0);
    var actEdge = padRight + (actions ? ((actions.rect || {}).w || 0) : 0);
    if (leading) leadEdge += 16; // spacer
    if (actions) actEdge += 16; // spacer
    var middleX = nodeX + leadEdge;
    var middleW = nodeW - leadEdge - actEdge;

    // title rect: width=middleW (truncation 발동), 위치를 offset하여 toolbar 정중앙
    if (title) {
      var toolbarCenterRel = nodeX + nodeW / 2;
      var middleCenter = middleX + middleW / 2;
      var offsetX = toolbarCenterRel - middleCenter;
      // 수직 중앙: 렌더 시 텍스트 높이 = fontSize * lineHeightMultiplier
      function getTitleFontSize(n) {
        if (!n) return 16;
        if (n.type === "Text") return (n.properties || {}).fontSize || 16;
        var ch = n.children || [];
        for (var i = 0; i < ch.length; i++) {
          var f = getTitleFontSize(ch[i]);
          if (f !== 16) return f;
        }
        return 16;
      }
      function getTitleLineHMul(n) {
        if (!n) return 1.4;
        if (n.type === "Text") return (n.properties || {}).lineHeightMultiplier || 1.4;
        var ch = n.children || [];
        for (var i = 0; i < ch.length; i++) {
          var f = getTitleLineHMul(ch[i]);
          if (f !== 1.4) return f;
        }
        return 1.4;
      }
      var titleFontSize = getTitleFontSize(title);
      var titleLineHMul = getTitleLineHMul(title);
      var singleLineH = Math.ceil(titleFontSize * titleLineHMul);
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
  } else {
    // --- centerTitle: false (기본값) → left-aligned ---
    // Leading(FIXED) + [Spacer 16px] + Title(FILL, start) + Actions(FIXED)
    var newChildren = [];

    if (leading) newChildren.push(leading);

    // leading과 title 사이: middleSpacing 16px spacer 삽입
    if (leading && title) {
      var leadR = leading.rect || {};
      var titleR = title.rect || {};
      var spacerX = (leadR.x || 0) + (leadR.w || 0);
      newChildren.push({
        type: "Frame",
        rect: { x: spacerX, y: nodeY, w: 16, h: 1 },
        properties: {},
        children: [],
      });
    }

    if (title) newChildren.push(title);

    // title과 actions 사이: middleSpacing 16px spacer 삽입
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

    // Title → FILL (남은 공간 채움, 좌측 정렬)
    if (title) {
      var tp = title.properties || {};
      tp.sizingH = "FILL";
      title.properties = tp;
    }

    // Toolbar 패딩: 양쪽 가장자리 자식의 offset
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
