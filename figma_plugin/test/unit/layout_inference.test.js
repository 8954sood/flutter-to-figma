var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  {
    name: "inferMissingLayout: horizontal children → HORIZONTAL",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 300, h: 50 },
        properties: {},
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 30 }, properties: {} },
          { type: "Text", rect: { x: 100, y: 10, w: 80, h: 30 }, properties: {} },
          { type: "Text", rect: { x: 200, y: 10, w: 80, h: 30 }, properties: {} },
        ]
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
    }
  },
  {
    name: "inferMissingLayout: vertical children → VERTICAL",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 300 },
        properties: {},
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 30 }, properties: {} },
          { type: "Text", rect: { x: 10, y: 50, w: 80, h: 30 }, properties: {} },
          { type: "Text", rect: { x: 10, y: 100, w: 80, h: 30 }, properties: {} },
        ]
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, "VERTICAL");
    }
  },
  {
    name: "inferMissingLayout: 0 children → no layoutMode (spacer-safe)",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: {},
        children: []
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, undefined);
    }
  },
  {
    name: "inferMissingLayout: 1 child → VERTICAL default",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: {},
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 20 }, properties: {} }
        ]
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, "VERTICAL");
    }
  },
  {
    name: "inferMissingLayout: Stack → skip",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: { isStack: true },
        children: [
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 30 }, properties: {} },
          { type: "Text", rect: { x: 10, y: 50, w: 80, h: 30 }, properties: {} },
        ]
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, undefined);
    }
  },
  {
    name: "inferMissingLayout: existing layoutMode preserved, children sorted",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 300, h: 50 },
        properties: { layoutMode: "HORIZONTAL" },
        children: [
          { type: "Text", rect: { x: 200, y: 10, w: 80, h: 30 }, properties: {}, _id: "c" },
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 30 }, properties: {}, _id: "a" },
          { type: "Text", rect: { x: 100, y: 10, w: 80, h: 30 }, properties: {}, _id: "b" },
        ]
      };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.children[0]._id, "a");
      assert.strictEqual(node.children[1]._id, "b");
      assert.strictEqual(node.children[2]._id, "c");
    }
  },
  {
    name: "inferMissingLayout: layoutWrap → no reorder",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 300, h: 100 },
        properties: { layoutMode: "HORIZONTAL", layoutWrap: true },
        children: [
          { type: "Text", rect: { x: 200, y: 50, w: 80, h: 30 }, properties: {}, _id: "second_row" },
          { type: "Text", rect: { x: 10, y: 10, w: 80, h: 30 }, properties: {}, _id: "first_row" },
        ]
      };
      P.inferMissingLayout(node);
      // wrap children should NOT be reordered
      assert.strictEqual(node.children[0]._id, "second_row");
      assert.strictEqual(node.children[1]._id, "first_row");
    }
  },
];
