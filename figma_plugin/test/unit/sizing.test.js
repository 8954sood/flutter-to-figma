var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  {
    name: "assignImageSizing: Image → FIXED/FIXED",
    fn: function() {
      var node = { type: "Image", rect: { x: 0, y: 0, w: 100, h: 100 }, properties: {} };
      P.assignImageSizing(node);
      assert.strictEqual(node._sizingH, "FIXED");
      assert.strictEqual(node._sizingV, "FIXED");
    }
  },
  {
    name: "assignTextSizing: Text default → HUG/HUG",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 50, h: 20 }, properties: {} };
      P.assignTextSizing(node, null, false, false, null, null);
      assert.strictEqual(node._sizingH, "HUG");
      assert.strictEqual(node._sizingV, "HUG");
    }
  },
  {
    name: "assignTextSizing: Text + flexGrow tight + HORIZONTAL parent → H=FILL",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 50, h: 20 },
        properties: { flexGrow: 1, flexFit: "FlexFit.tight" } };
      P.assignTextSizing(node, "HORIZONTAL", false, false, null, null);
      assert.strictEqual(node._sizingH, "FILL");
      assert.strictEqual(node._sizingV, "HUG");
    }
  },
  {
    name: "assignTextSizing: Text + stretch parent (VERTICAL) → H=FILL",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 50, h: 20 }, properties: {} };
      P.assignTextSizing(node, "VERTICAL", true, false, null, null);
      assert.strictEqual(node._sizingH, "FILL");
    }
  },
  {
    name: "assignTextSizing: Text + stretch + parentIsAutoSize → HUG 유지",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 50, h: 20 }, properties: {} };
      P.assignTextSizing(node, "VERTICAL", true, true, null, null);
      assert.strictEqual(node._sizingH, "HUG");
    }
  },
  {
    name: "assignTextSizing: multiline text (textW≈availW, textH > 1.5*singleLine) → H=FILL",
    fn: function() {
      var parentNode = { rect: { x: 0, y: 0, w: 200, h: 100 } };
      var parentProps = { paddingLeft: 10, paddingRight: 10 };
      // availW = 200-10-10 = 180, textW=180, textH=50, singleLineH=16*1.4=22.4, 1.5*22.4=33.6 < 50
      var node = { type: "Text", rect: { x: 10, y: 0, w: 180, h: 50 },
        properties: { fontSize: 16, lineHeightMultiplier: 1.4 } };
      P.assignTextSizing(node, "VERTICAL", false, false, parentNode, parentProps);
      assert.strictEqual(node._sizingH, "FILL");
    }
  },
  {
    name: "assignFrameSizing: Frame + icon → FIXED 유지",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 24, h: 24 },
        properties: { isIconBox: true } };
      P.assignFrameSizing(node, node.properties, false, false, null);
      assert.strictEqual(node._sizingH, "FIXED");
      assert.strictEqual(node._sizingV, "FIXED");
    }
  },
  {
    name: "assignFrameSizing: Frame + stretch VERTICAL → H=FILL",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 100, h: 50 }, properties: {} };
      P.assignFrameSizing(node, node.properties, true, false, "VERTICAL");
      assert.strictEqual(node._sizingH, "FILL");
    }
  },
  {
    name: "assignFrameSizing: Frame + mainAxisSize=AUTO + HORIZONTAL → H=HUG",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 100, h: 50 },
        properties: { mainAxisSize: "AUTO", layoutMode: "HORIZONTAL" } };
      P.assignFrameSizing(node, node.properties, false, false, null);
      assert.strictEqual(node._sizingH, "HUG");
    }
  },
  {
    name: "assignFrameSizing: Frame + layoutWrap → H=FILL, V=HUG",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 300, h: 100 },
        properties: { layoutWrap: true, layoutMode: "HORIZONTAL" } };
      P.assignFrameSizing(node, node.properties, false, false, null);
      assert.strictEqual(node._sizingH, "FILL");
      assert.strictEqual(node._sizingV, "HUG");
    }
  },
  {
    name: "applySizedBoxOverrides: fixedWidth → H=FIXED (but FILL preserved)",
    fn: function() {
      var node1 = { type: "Frame", _sizingH: "HUG", _sizingV: "HUG" };
      P.applySizedBoxOverrides(node1, { fixedWidth: true });
      assert.strictEqual(node1._sizingH, "FIXED");

      var node2 = { type: "Frame", _sizingH: "FILL", _sizingV: "HUG" };
      P.applySizedBoxOverrides(node2, { fixedWidth: true });
      assert.strictEqual(node2._sizingH, "FILL"); // FILL preserved
    }
  },
  {
    name: "propagateWrapFlags: child _hasWrap → parent FIXED→FILL(H), FIXED→HUG(V)",
    fn: function() {
      var child = { type: "Frame", _hasWrap: true, properties: { layoutWrap: true }, children: [] };
      var parent = { type: "Frame", _sizingH: "FIXED", _sizingV: "FIXED",
        properties: { layoutMode: "VERTICAL" }, children: [child] };
      P.propagateWrapFlags(parent, parent.properties, parent.children);
      assert.strictEqual(parent._hasWrap, true);
      assert.strictEqual(parent._sizingH, "FILL");
      assert.strictEqual(parent._sizingV, "HUG");
    }
  },
  {
    name: "assignSizingHints: full tree traversal",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 400, h: 600 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
        children: [
          { type: "Image", rect: { x: 0, y: 0, w: 400, h: 200 }, properties: {} },
          { type: "Text", rect: { x: 0, y: 200, w: 400, h: 20 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingH, "FIXED"); // Image
      assert.strictEqual(tree.children[0]._sizingV, "FIXED");
      assert.strictEqual(tree.children[1]._sizingH, "FILL"); // Text in stretch VERTICAL
    }
  },
  // ============================================================
  // Text with maxLines/textOverflow — sizing should stay HUG
  // ============================================================
  // ============================================================
  // Text truncation: maxLines/textOverflow vs textTruncate
  // These test the PREPROCESSING level. Rendering behavior is tested in render tests.
  // ============================================================
  {
    name: "assignTextSizing: Text with maxLines=1 + textOverflow=ellipsis → still HUG",
    fn: function() {
      var node = { type: "Text", rect: { x: 93, y: 869, w: 20, h: 15 },
        properties: { content: "Label", fontSize: 11, maxLines: 1, textOverflow: "ellipsis" } };
      P.assignTextSizing(node, "VERTICAL", false, false, null, null);
      assert.strictEqual(node._sizingH, "HUG");
      assert.strictEqual(node._sizingV, "HUG");
    }
  },
  {
    name: "assignTextSizing: Text with textTruncate=ENDING → still HUG (preprocessing level)",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 100, h: 31 },
        properties: { content: "Title", fontSize: 22, textTruncate: "ENDING" } };
      P.assignTextSizing(node, null, false, false, null, null);
      // textTruncate doesn't affect sizing at preprocessing level
      assert.strictEqual(node._sizingH, "HUG");
    }
  },
  {
    name: "pipeline: BottomNav label (maxLines=1, ellipsis) — _sizingH = HUG",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 834, w: 411, h: 80 },
        visual: { backgroundColor: "#FFFFFFFF" },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center" },
        children: [{
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: 0, y: 841, w: 206, h: 56 },
          visual: {},
          containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
          childLayout: { flexGrow: 1 },
          children: [
            { type: "Frame", rect: { x: 91, y: 848, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {}, childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true } },
            { type: "Text", rect: { x: 93, y: 879, w: 20, h: 15 },
              visual: { content: "Tab", fontSize: 11, maxLines: 1, textOverflow: "ellipsis", letterSpacing: 0.5, lineHeightMultiplier: 1.4 },
              containerLayout: {},
              childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } }
          ]
        }]
      };
      var result = helpers.runPreprocess(input);
      var textNode = helpers.findNode(result, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Tab";
      });
      assert.notStrictEqual(textNode, null);
      assert.strictEqual(textNode._sizingH, "HUG");
      // Properties preserved for rendering
      assert.strictEqual(textNode.properties.maxLines, 1);
      assert.strictEqual(textNode.properties.textOverflow, "ellipsis");
      // NO textTruncate — this is NOT set by preprocessing for bottom nav labels
      assert.strictEqual(textNode.properties.textTruncate, undefined,
        "Bottom nav labels should NOT have textTruncate (only maxLines/textOverflow)");
    }
  },
  {
    name: "pipeline: Toolbar centerTitle — title has textTruncate=ENDING",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 411, h: 56 },
        widgetName: "NavigationToolbar",
        visual: {},
        containerLayout: { crossAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 120, h: 56 }, visual: {}, containerLayout: {},
            children: [
              { type: "Text", rect: { x: 16, y: 18, w: 26, h: 20 }, visual: { content: "Lead", fontSize: 14 }, containerLayout: {} }
            ] },
          { type: "Frame", rect: { x: 140, y: 0, w: 131, h: 56 }, visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Text", rect: { x: 140, y: 12, w: 131, h: 31 }, visual: { content: "Title", fontSize: 22, textAlign: "center" }, containerLayout: {} }
            ] },
          { type: "Frame", rect: { x: 371, y: 4, w: 40, h: 48 }, visual: {}, containerLayout: {},
            children: [
              { type: "Frame", rect: { x: 379, y: 12, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
        ]
      };
      var result = helpers.runPreprocess(input);
      var titleText = helpers.findNode(result, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Title";
      });
      assert.notStrictEqual(titleText, null);
      // Toolbar title MUST have textTruncate=ENDING (set by markTitleTruncation)
      assert.strictEqual(titleText.properties.textTruncate, "ENDING",
        "Toolbar title must have textTruncate=ENDING for proper centering");
      // textAlign center (set by markTitleCenter for centered toolbar)
      assert.strictEqual(titleText.properties.textAlign, "center");
    }
  },
  {
    name: "pipeline: Toolbar leftAligned — title parent has sizingH=FILL + textTruncate=ENDING",
    fn: function() {
      // Left-aligned: leading(x=4) + title(x=72, far from center) — NOT centered
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 400, h: 56 },
        widgetName: "NavigationToolbar",
        visual: {},
        containerLayout: { crossAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 4, y: 4, w: 48, h: 48 }, visual: {}, containerLayout: {},
            children: [] },
          { type: "Frame", rect: { x: 72, y: 14, w: 100, h: 28 }, visual: {},
            containerLayout: {},
            children: [
              { type: "Text", rect: { x: 72, y: 14, w: 100, h: 28 }, visual: { content: "Page Title", fontSize: 20 }, containerLayout: {} }
            ] },
          { type: "Frame", rect: { x: 352, y: 4, w: 48, h: 48 }, visual: {}, containerLayout: {},
            children: [
              { type: "Frame", rect: { x: 364, y: 16, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
        ]
      };
      var result = helpers.runPreprocess(input);
      var titleText = helpers.findNode(result, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Page Title";
      });
      assert.notStrictEqual(titleText, null);
      assert.strictEqual(titleText.properties.textTruncate, "ENDING");
      // Left-aligned: title or its wrapper should have sizingH=FILL
      // (buildLeftAlignedToolbar sets tp.sizingH = "FILL" on title's wrapper)
      var hasFill = titleText.properties.sizingH === "FILL";
      if (!hasFill) {
        // Check parent wrapper
        var parent = helpers.findNode(result, function(n) {
          var ch = n.children || [];
          return ch.indexOf(titleText) !== -1;
        });
        if (parent) hasFill = (parent.properties || {}).sizingH === "FILL";
      }
      assert.ok(hasFill, "Left-aligned title or its wrapper should have sizingH=FILL");
    }
  },
];
