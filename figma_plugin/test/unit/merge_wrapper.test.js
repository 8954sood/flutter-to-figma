var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  {
    name: "shouldStopChain: widgetName → stop",
    fn: function() {
      var current = { properties: {} };
      var next = { widgetName: "MyWidget", properties: {} };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: rotation → stop",
    fn: function() {
      var current = { properties: {} };
      var next = { properties: { rotation: 45 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: both visual → stop",
    fn: function() {
      var current = { properties: { backgroundColor: "#FF0000FF" } };
      var next = { properties: { backgroundColor: "#00FF00FF" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: center alignment mismatch → stop",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" } };
      var next = { properties: { mainAxisAlignment: "start", crossAxisAlignment: "start" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: next has visual, current doesn't → absorb",
    fn: function() {
      var current = { properties: {} };
      var next = { properties: { backgroundColor: "#FF0000FF" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), "absorb");
    }
  },
  {
    name: "shouldStopChain: no stop conditions → false",
    fn: function() {
      var current = { properties: {} };
      var next = { properties: {} };
      assert.strictEqual(P.shouldStopChain(current, next, false), false);
    }
  },
  {
    name: "calculateImplicitPadding: child coordinates → padding",
    fn: function() {
      var frame = {
        type: "Frame",
        rect: { x: 100, y: 100, w: 200, h: 100 },
        properties: {},
        children: [
          { type: "Text", rect: { x: 110, y: 110, w: 180, h: 80 }, properties: {} }
        ]
      };
      var pad = P.calculateImplicitPadding(frame);
      assert.deepStrictEqual(pad, { top: 10, left: 10, bottom: 10, right: 10 });
    }
  },
  {
    name: "calculateImplicitPadding: empty artifact skipped",
    fn: function() {
      var frame = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: {},
        children: [
          { type: "Frame", rect: { x: -50, y: -50, w: 10, h: 10 }, properties: {}, children: [] }, // empty artifact
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 80 }, properties: {} }
        ]
      };
      var pad = P.calculateImplicitPadding(frame);
      assert.strictEqual(pad.left, 10);
      assert.strictEqual(pad.top, 10);
    }
  },
  {
    name: "calculateImplicitPadding: rotated child → null",
    fn: function() {
      var frame = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: {},
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 80 }, properties: { rotation: 90 } }
        ]
      };
      var pad = P.calculateImplicitPadding(frame);
      assert.strictEqual(pad, null);
    }
  },
  {
    name: "calculateImplicitPadding: has layoutMode → null",
    fn: function() {
      var frame = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 80 }, properties: {} }
        ]
      };
      assert.strictEqual(P.calculateImplicitPadding(frame), null);
    }
  },
  {
    name: "mergePropsInto: padding addition",
    fn: function() {
      var target = { paddingTop: 5 };
      var source = { paddingTop: 10, paddingLeft: 8 };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.paddingTop, 15);
      assert.strictEqual(target.paddingLeft, 8);
    }
  },
  {
    name: "mergePropsInto: sizingH outermost priority",
    fn: function() {
      var target = { sizingH: "HUG" };
      var source = { sizingH: "FILL" };
      P.mergePropsInto(target, source, true); // isOutermost
      assert.strictEqual(target.sizingH, "FILL"); // outermost wins
    }
  },
  {
    name: "mergePropsInto: sizingH non-outermost → no override",
    fn: function() {
      var target = { sizingH: "HUG" };
      var source = { sizingH: "FILL" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.sizingH, "HUG"); // inner preserved
    }
  },
  {
    name: "mergePropsInto: backgroundColor inner priority (transparent excluded)",
    fn: function() {
      var target = { backgroundColor: "#FF0000FF" };
      var source = { backgroundColor: "#00FF00FF" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.backgroundColor, "#FF0000FF"); // inner preserved

      var target2 = { backgroundColor: "#00000000" }; // transparent (alpha=00)
      var source2 = { backgroundColor: "#FF00FF00" }; // opaque green (alpha=FF)
      P.mergePropsInto(target2, source2, false);
      assert.strictEqual(target2.backgroundColor, "#FF00FF00"); // non-transparent wins
    }
  },
  {
    name: "mergeWrapperChains: single-child chain merges",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 300, h: 200 },
        properties: { paddingTop: 5 },
        children: [{
          type: "Frame",
          rect: { x: 10, y: 10, w: 280, h: 180 },
          properties: { layoutMode: "VERTICAL", paddingTop: 3 },
          children: [
            { type: "Text", rect: { x: 20, y: 20, w: 100, h: 20 }, properties: { content: "hello" } }
          ]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Should merge outer into inner
      assert.strictEqual(result.properties.layoutMode, "VERTICAL");
      assert.strictEqual(result.properties.paddingTop, 3 + 5); // padding added
      assert.strictEqual(result.rect.w, 300); // outer rect
    }
  },
];
