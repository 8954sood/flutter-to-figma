var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  {
    name: "classifyToolbarChildren: 3 children → leading/title/actions",
    fn: function() {
      var children = [
        { rect: { x: 0, y: 0, w: 48, h: 48 } },
        { rect: { x: 60, y: 0, w: 200, h: 48 } },
        { rect: { x: 350, y: 0, w: 40, h: 48 } },
      ];
      var result = P.classifyToolbarChildren(children, 400);
      assert.strictEqual(result.leading, children[0]);
      assert.strictEqual(result.title, children[1]);
      assert.strictEqual(result.actions, children[2]);
    }
  },
  {
    name: "classifyToolbarChildren: 2 children, right edge → title/actions",
    fn: function() {
      var children = [
        { rect: { x: 16, y: 0, w: 200, h: 48 } },
        { rect: { x: 330, y: 0, w: 60, h: 48 } }, // close to right edge (400)
      ];
      var result = P.classifyToolbarChildren(children, 400);
      assert.strictEqual(result.leading, null);
      assert.strictEqual(result.title, children[0]);
      assert.strictEqual(result.actions, children[1]);
    }
  },
  {
    name: "classifyToolbarChildren: 2 children, middle → leading/title",
    fn: function() {
      var children = [
        { rect: { x: 0, y: 0, w: 48, h: 48 } },
        { rect: { x: 60, y: 0, w: 200, h: 48 } }, // not near right edge
      ];
      var result = P.classifyToolbarChildren(children, 400);
      assert.strictEqual(result.leading, children[0]);
      assert.strictEqual(result.title, children[1]);
      assert.strictEqual(result.actions, null);
    }
  },
  {
    name: "classifyToolbarChildren: 1 child → title only",
    fn: function() {
      var children = [
        { rect: { x: 60, y: 0, w: 200, h: 48 } },
      ];
      var result = P.classifyToolbarChildren(children, 400);
      assert.strictEqual(result.leading, null);
      assert.strictEqual(result.title, children[0]);
      assert.strictEqual(result.actions, null);
    }
  },
  {
    name: "normalizeBackButton: 56px → 48px resize",
    fn: function() {
      var node = {
        widgetName: "BackButton",
        rect: { x: 4, y: 4, w: 56, h: 56 },
        properties: {}
      };
      var result = P.normalizeBackButton(node);
      assert.strictEqual(result, true);
      assert.strictEqual(node.rect.w, 48);
      assert.strictEqual(node.rect.h, 48);
      assert.strictEqual(node.rect.x, 8); // 4 + (56-48)/2
      assert.strictEqual(node.properties.fixedSize, true);
    }
  },
  {
    name: "normalizeBackButton: nested BackButton found",
    fn: function() {
      var inner = {
        widgetName: "BackButton",
        rect: { x: 0, y: 0, w: 48, h: 48 },
        properties: {}
      };
      var wrapper = { type: "Frame", properties: {}, children: [inner] };
      assert.strictEqual(P.normalizeBackButton(wrapper), true);
      assert.strictEqual(inner.properties.fixedSize, true);
    }
  },
  {
    name: "detectCenterTitle: centered → true, left → false",
    fn: function() {
      var title = { rect: { x: 140, y: 0, w: 120, h: 48 } }; // center=200, toolbar center=200
      assert.strictEqual(P.detectCenterTitle(title, 200, 400), true);

      var titleLeft = { rect: { x: 60, y: 0, w: 100, h: 48 } }; // center=110
      assert.strictEqual(P.detectCenterTitle(titleLeft, 200, 400), false);
    }
  },
  {
    name: "markTitleTruncation: Text gets ENDING",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [{ type: "Text", properties: {} }]
      };
      P.markTitleTruncation(node);
      assert.strictEqual(node.children[0].properties.textTruncate, "ENDING");
    }
  },
  {
    name: "filterChipChildren: empty STACK removed, Text kept",
    fn: function() {
      var children = [
        { type: "Frame", properties: { isStack: true }, children: [] }, // empty STACK
        { type: "Text", properties: { content: "chip" } },
        { type: "Frame", properties: {}, children: [] }, // empty Frame
      ];
      var result = P.filterChipChildren(children);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, "Text");
    }
  },
  {
    name: "filterChipChildren: Frame with visual kept",
    fn: function() {
      var children = [
        { type: "Frame", properties: { backgroundColor: "#FF0000FF" }, children: [] },
        { type: "Text", properties: {} },
      ];
      var result = P.filterChipChildren(children);
      assert.strictEqual(result.length, 2);
    }
  },
  {
    name: "groupChildrenByXRange: overlapping x → same group",
    fn: function() {
      var children = [
        { rect: { x: 60, y: 10, w: 200, h: 20 } },
        { rect: { x: 60, y: 35, w: 150, h: 16 } }, // same x range
        { rect: { x: 300, y: 10, w: 40, h: 40 } }, // different x range
      ];
      var groups = P.groupChildrenByXRange(children);
      assert.strictEqual(groups.length, 2);
      assert.strictEqual(groups[0].length, 2);
      assert.strictEqual(groups[1].length, 1);
    }
  },
  {
    name: "calculateBoundingPadding: correct padding from children rects",
    fn: function() {
      var children = [
        { rect: { x: 18, y: 8, w: 64, h: 16 } },
      ];
      var containerRect = { x: 10, y: 4, w: 80, h: 24 };
      var pad = P.calculateBoundingPadding(children, containerRect);
      assert.strictEqual(pad.left, 8);
      assert.strictEqual(pad.top, 4);
      assert.strictEqual(pad.right, 8); // 80 - (8+64) = 8
      assert.strictEqual(pad.bottom, 4); // 24 - (4+16) = 4
    }
  },
  {
    name: "getTitleFontMetrics: extracts fontSize and lineHeightMultiplier",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [{ type: "Text", properties: { fontSize: 20, lineHeightMultiplier: 1.2 } }]
      };
      var metrics = P.getTitleFontMetrics(node);
      assert.strictEqual(metrics.fontSize, 20);
      assert.strictEqual(metrics.lineHeightMultiplier, 1.2);
    }
  },
  {
    name: "getTitleFontMetrics: defaults when no Text found",
    fn: function() {
      var node = { type: "Frame", properties: {}, children: [] };
      var metrics = P.getTitleFontMetrics(node);
      assert.strictEqual(metrics.fontSize, 16);
      assert.strictEqual(metrics.lineHeightMultiplier, 1.4);
    }
  },
  {
    name: "markTitleCenter: Text gets center alignment",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [{ type: "Text", properties: {} }]
      };
      P.markTitleCenter(node);
      assert.strictEqual(node.children[0].properties.textAlign, "center");
      assert.strictEqual(node.children[0].properties.textAlignVertical, "center");
    }
  },
];
