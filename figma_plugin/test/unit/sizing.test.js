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
];
