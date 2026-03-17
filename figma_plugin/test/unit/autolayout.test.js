var helpers = require("../helpers");
var R = helpers.loadRenderPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // applyAutoLayout
  // ============================================================
  {
    name: "applyAutoLayout: isStack → layoutMode NONE",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { isStack: true });
      assert.strictEqual(frame.layoutMode, "NONE");
    }
  },
  {
    name: "applyAutoLayout: HORIZONTAL mapping",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "HORIZONTAL" });
      assert.strictEqual(frame.layoutMode, "HORIZONTAL");
    }
  },
  {
    name: "applyAutoLayout: ROW → HORIZONTAL",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "ROW" });
      assert.strictEqual(frame.layoutMode, "HORIZONTAL");
    }
  },
  {
    name: "applyAutoLayout: VERTICAL mapping",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL" });
      assert.strictEqual(frame.layoutMode, "VERTICAL");
    }
  },
  {
    name: "applyAutoLayout: layoutWrap → WRAP + counterAxisSpacing",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "HORIZONTAL", layoutWrap: true, runSpacing: 8 });
      assert.strictEqual(frame.layoutWrap, "WRAP");
      assert.strictEqual(frame.counterAxisSpacing, 8);
    }
  },
  {
    name: "applyAutoLayout: mainAxisSize AUTO → primaryAxisSizingMode AUTO",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL", mainAxisSize: "AUTO" });
      assert.strictEqual(frame.primaryAxisSizingMode, "AUTO");
    }
  },
  {
    name: "applyAutoLayout: mainAxisSize FIXED → FIXED",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL", mainAxisSize: "FIXED" });
      assert.strictEqual(frame.primaryAxisSizingMode, "FIXED");
    }
  },
  {
    name: "applyAutoLayout: spaceAround padding simulation (HORIZONTAL)",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "HORIZONTAL", mainAxisAlignment: "spaceAround", itemSpacing: 16 });
      // spaceAround adds spacing/2 to left+right padding
      assert.strictEqual(frame.paddingLeft, 8);
      assert.strictEqual(frame.paddingRight, 8);
    }
  },
  {
    name: "applyAutoLayout: spaceEvenly padding simulation (HORIZONTAL)",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "HORIZONTAL", mainAxisAlignment: "spaceEvenly", itemSpacing: 16 });
      // spaceEvenly adds full spacing to left+right padding
      assert.strictEqual(frame.paddingLeft, 16);
      assert.strictEqual(frame.paddingRight, 16);
    }
  },
  {
    name: "applyAutoLayout: itemSpacing",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL", itemSpacing: 12 });
      assert.strictEqual(frame.itemSpacing, 12);
    }
  },
  {
    name: "applyAutoLayout: padding 4-way",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL", paddingTop: 10, paddingRight: 20, paddingBottom: 30, paddingLeft: 40 });
      assert.strictEqual(frame.paddingTop, 10);
      assert.strictEqual(frame.paddingRight, 20);
      assert.strictEqual(frame.paddingBottom, 30);
      assert.strictEqual(frame.paddingLeft, 40);
    }
  },
  {
    name: "applyAutoLayout: no layoutMode → NONE",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, {});
      assert.strictEqual(frame.layoutMode, "NONE");
    }
  },
  // ============================================================
  // applySizing
  // ============================================================
  {
    name: "applySizing: Image → FIXED",
    fn: function() {
      var figNode = { type: "RECTANGLE" };
      var jsonNode = { type: "Image", _sizingH: "HUG", _sizingV: "HUG", properties: {} };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FIXED");
      assert.strictEqual(figNode.layoutSizingVertical, "FIXED");
    }
  },
  {
    name: "applySizing: isIconBox → FIXED",
    fn: function() {
      var figNode = {};
      var jsonNode = { type: "Frame", _sizingH: "HUG", properties: { isIconBox: true } };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FIXED");
      assert.strictEqual(figNode.layoutSizingVertical, "FIXED");
    }
  },
  {
    name: "applySizing: HUG on non-Text/non-autoLayout Frame → FIXED",
    fn: function() {
      var figNode = { type: "FRAME" }; // no layoutMode → can't HUG
      var jsonNode = { type: "Frame", _sizingH: "HUG", _sizingV: "HUG", properties: {} };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FIXED");
    }
  },
  {
    name: "applySizing: HUG on TEXT → HUG preserved",
    fn: function() {
      var figNode = { type: "TEXT" };
      var jsonNode = { type: "Text", _sizingH: "HUG", _sizingV: "HUG", properties: {} };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "HUG");
      assert.strictEqual(figNode.layoutSizingVertical, "HUG");
    }
  },
  {
    name: "applySizing: FILL Frame → FILL",
    fn: function() {
      var figNode = { type: "FRAME" };
      var jsonNode = { type: "Frame", _sizingH: "FILL", _sizingV: "FIXED", properties: {} };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FILL");
      assert.strictEqual(figNode.layoutSizingVertical, "FIXED");
    }
  },
  {
    name: "applySizing: parentLayoutDir NONE → skip (no sizing applied)",
    fn: function() {
      var figNode = {};
      var jsonNode = { type: "Frame", _sizingH: "FILL", properties: {} };
      R.applySizing(figNode, jsonNode, "NONE");
      assert.strictEqual(figNode.layoutSizingHorizontal, undefined);
    }
  },
  {
    name: "applySizing: fixedSize + flexGrow → flex wins (not FIXED)",
    fn: function() {
      var figNode = {};
      var jsonNode = { type: "Frame", _sizingH: "FILL", properties: { fixedSize: true, flexGrow: 1 } };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      // flexGrow > 0 → fixedSize branch skipped
      assert.strictEqual(figNode.layoutSizingHorizontal, "FILL");
    }
  },
  // ============================================================
  // Missing: auto-layout edge cases
  // ============================================================
  {
    name: "applyAutoLayout: spaceAround VERTICAL padding simulation",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL", mainAxisAlignment: "spaceAround", itemSpacing: 20 });
      assert.strictEqual(frame.paddingTop, 10);
      assert.strictEqual(frame.paddingBottom, 10);
    }
  },
  {
    name: "applyAutoLayout: isStack + clipsContent",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { isStack: true, clipsContent: true });
      assert.strictEqual(frame.layoutMode, "NONE");
      assert.strictEqual(frame.clipsContent, true);
    }
  },
  {
    name: "applyAutoLayout: counterAxisSizingMode FIXED by default",
    fn: function() {
      var frame = {};
      R.applyAutoLayout(frame, { layoutMode: "VERTICAL" });
      assert.strictEqual(frame.counterAxisSizingMode, "FIXED");
    }
  },
  {
    name: "applySizing: isSvgBox → FIXED",
    fn: function() {
      var figNode = {};
      var jsonNode = { type: "Frame", _sizingH: "FILL", properties: { isSvgBox: true } };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FIXED");
    }
  },
  {
    name: "applySizing: isVectorCandidate → FIXED",
    fn: function() {
      var figNode = {};
      var jsonNode = { type: "Frame", _sizingH: "FILL", properties: { isVectorCandidate: true } };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "FIXED");
    }
  },
  {
    name: "applySizing: HUG on auto-layout Frame → HUG preserved",
    fn: function() {
      var figNode = { type: "FRAME", layoutMode: "VERTICAL" };
      var jsonNode = { type: "Frame", _sizingH: "HUG", _sizingV: "HUG", properties: {} };
      R.applySizing(figNode, jsonNode, "VERTICAL");
      assert.strictEqual(figNode.layoutSizingHorizontal, "HUG");
    }
  },
];
