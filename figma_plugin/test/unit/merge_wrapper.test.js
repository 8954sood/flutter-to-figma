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
  // ============================================================
  // Padding wrapper + decorated container (filter field pattern)
  // ============================================================
  {
    name: "mergeWrapperChains: padding wrapper + visual child (size diff) — chain stopped, wrapper preserved",
    fn: function() {
      // Padding(16) wrapping Container(bg, border, radius, padding 9/13)
      // outer rect: 411x70 (full parent), inner rect: 379x38 (actual content)
      // Should NOT merge — padding wrapper stays as separate Frame
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 96, w: 411, h: 70 },
        properties: { paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 },
        children: [{
          type: "Frame",
          rect: { x: 16, y: 96, w: 379, h: 38 },
          properties: {
            backgroundColor: "#FFF8F8F8",
            borderRadius: 8,
            hasBorder: true,
            borderColor: "#FFE0E0E0",
            borderWidth: 1,
            paddingTop: 9, paddingRight: 13, paddingBottom: 9, paddingLeft: 13,
            layoutMode: "HORIZONTAL",
          },
          children: [
            { type: "Frame", rect: { x: 29, y: 105, w: 20, h: 20 }, properties: { isIconBox: true } },
            { type: "Text", rect: { x: 57, y: 105, w: 53, h: 20 }, properties: { content: "Filter" } },
          ]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Wrapper preserved: result is the outer padding Frame
      assert.strictEqual(result.rect.w, 411, "outer wrapper preserved");
      assert.strictEqual(result.properties.paddingTop, 16, "outer padding preserved");
      // Inner visual child is still a child, not merged
      assert.strictEqual(result.children.length, 1);
      var inner = result.children[0];
      assert.strictEqual(inner.rect.w, 379, "inner container keeps its rect");
      assert.strictEqual(inner.properties.backgroundColor, "#FFF8F8F8");
      assert.strictEqual(inner.properties.paddingTop, 9, "inner padding not accumulated");
    }
  },
  {
    name: "mergeWrapperChains: same-size wrapper + visual child — absorb merge OK",
    fn: function() {
      // Wrapper and child have same size → absorb merge works
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 200, h: 100 },
        properties: { paddingTop: 5 },
        children: [{
          type: "Frame",
          rect: { x: 0, y: 0, w: 200, h: 100 },
          properties: { backgroundColor: "#FFFF0000", layoutMode: "VERTICAL" },
          children: [{ type: "Text", rect: { x: 10, y: 10, w: 100, h: 20 }, properties: { content: "x" } }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      assert.strictEqual(result.rect.w, 200); // same size, outer rect OK
      assert.strictEqual(result.properties.paddingTop, 5); // padding merged
      assert.strictEqual(result.properties.backgroundColor, "#FFFF0000"); // visual absorbed
    }
  },
  {
    name: "pipeline: Padding(16) + Container(bg,border,radius) → wrapper preserved with padding",
    fn: function() {
      // Full pipeline test for the filter field pattern
      var input = {
        type: "Frame",
        layoutMode: "COLUMN",
        rect: { x: 0, y: 80, w: 411, h: 754 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "start", mainAxisSize: "max" },
        children: [
          {
            type: "Frame",
            layoutMode: "COLUMN",
            rect: { x: 0, y: 80, w: 411, h: 70 },
            visual: {},
            containerLayout: { padding: { top: 16, right: 16, bottom: 16, left: 16 } },
            children: [{
              type: "Frame",
              layoutMode: "ROW",
              rect: { x: 16, y: 96, w: 379, h: 38 },
              visual: {
                backgroundColor: "#FFF8F8F8",
                borderRadius: 8,
                border: { color: "#FFE0E0E0", width: 1 },
              },
              containerLayout: {
                crossAxisAlignment: "center",
                padding: { top: 9, right: 13, bottom: 9, left: 13 },
              },
              children: [
                { type: "Frame", rect: { x: 29, y: 105, w: 20, h: 20 }, visual: { isIconBox: true }, containerLayout: {} },
                { type: "Frame", rect: { x: 49, y: 115, w: 8, h: 0 }, visual: {}, containerLayout: {}, children: [] },
                { type: "Text", rect: { x: 57, y: 105, w: 53, h: 20 }, visual: { content: "필터 검색", fontSize: 14, color: "#FF999999" }, containerLayout: {} },
              ]
            }]
          },
          {
            type: "Frame",
            layoutMode: "COLUMN",
            rect: { x: 0, y: 150, w: 411, h: 600 },
            visual: {},
            containerLayout: { padding: { top: 8, right: 16, bottom: 0, left: 16 } },
            children: [
              { type: "Frame", rect: { x: 16, y: 158, w: 379, h: 106 }, layoutMode: "COLUMN",
                visual: { backgroundColor: "#FFFFFFFF", border: { color: "#FFE0E0E0", width: 1 }, borderRadius: 12 },
                containerLayout: { padding: { top: 17, right: 17, bottom: 17, left: 17 } },
                children: [{ type: "Text", rect: { x: 33, y: 175, w: 86, h: 23 }, visual: { content: "Meeting 1" }, containerLayout: {} }]
              },
            ]
          },
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find the filter field node (has backgroundColor #FFF8F8F8)
      var filterNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).backgroundColor === "#fff8f8f8" ||
               (n.properties || {}).backgroundColor === "#FFF8F8F8";
      });
      assert.notStrictEqual(filterNode, null, "Filter field should exist");

      // Filter field should have inner dimensions (wrapper not merged)
      var fw = (filterNode.rect || {}).w || 0;
      assert.ok(fw < 400, "Filter width should be ~379 (inner), not 411 (outer). Got: " + fw);

      // Padding should be the inner padding only (outer padding on wrapper)
      var padL = filterNode.properties.paddingLeft || 0;
      assert.ok(padL <= 16, "paddingLeft should be inner (13), not accumulated (29). Got: " + padL);

      // Find the padding wrapper parent
      var wrapperNode = helpers.findNode(result, function(n) {
        var ch = n.children || [];
        return ch.some(function(c) {
          return (c.properties || {}).backgroundColor === "#fff8f8f8" ||
                 (c.properties || {}).backgroundColor === "#FFF8F8F8";
        });
      });
      if (wrapperNode) {
        var wp = wrapperNode.properties || {};
        assert.ok((wp.paddingTop || 0) > 0 || (wp.paddingLeft || 0) > 0,
          "Wrapper should have padding (outer padding preserved)");
      }
    }
  },
];
