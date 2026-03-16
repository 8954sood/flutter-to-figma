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
      try { figNode.layoutSizingVertical = "FIXED"; } catch(e) {}
      figNode.textAutoResize = "TRUNCATE";
      figNode.textTruncation = truncType;
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
