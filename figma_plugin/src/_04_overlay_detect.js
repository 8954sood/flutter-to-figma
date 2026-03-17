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
