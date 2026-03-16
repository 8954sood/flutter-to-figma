var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  {
    name: "isSpacer: HORIZONTAL + w>0,h≤1 → true",
    fn: function() {
      var child = { type: "Frame", properties: {}, rect: { w: 16, h: 1 }, children: [] };
      // isEmptyProps needs empty properties object to return false...
      // Actually isSpacer checks isEmptyProps — {} has 0 keys → true
      assert.strictEqual(P.isSpacer(child, "HORIZONTAL"), true);
    }
  },
  {
    name: "isSpacer: VERTICAL + h>0,w≤1 → true",
    fn: function() {
      var child = { type: "Frame", properties: {}, rect: { w: 1, h: 16 }, children: [] };
      assert.strictEqual(P.isSpacer(child, "VERTICAL"), true);
    }
  },
  {
    name: "isSpacer: non-empty props → false",
    fn: function() {
      var child = { type: "Frame", properties: { backgroundColor: "#FF0000FF" },
        rect: { w: 16, h: 1 }, children: [] };
      assert.strictEqual(P.isSpacer(child, "HORIZONTAL"), false);
    }
  },
  {
    name: "isSpacer: has children → false",
    fn: function() {
      var child = { type: "Frame", properties: {}, rect: { w: 16, h: 1 },
        children: [{ type: "Text" }] };
      assert.strictEqual(P.isSpacer(child, "HORIZONTAL"), false);
    }
  },
  {
    name: "isEmptyLeaf: flexGrow>0 → false (preserved)",
    fn: function() {
      var c = { type: "Frame", properties: { flexGrow: 1 }, children: [] };
      assert.strictEqual(P.isEmptyLeaf(c), false);
    }
  },
  {
    name: "isEmptyLeaf: empty Frame → true",
    fn: function() {
      var c = { type: "Frame", properties: {}, children: [] };
      assert.strictEqual(P.isEmptyLeaf(c), true);
    }
  },
  {
    name: "isEmptyLeaf: Frame with visual → false",
    fn: function() {
      var c = { type: "Frame", properties: { backgroundColor: "#FF0000FF" }, children: [] };
      assert.strictEqual(P.isEmptyLeaf(c), false);
    }
  },
  {
    name: "isEmptyLeaf: Frame with children → false",
    fn: function() {
      var c = { type: "Frame", properties: {},
        children: [{ type: "Text", properties: {} }] };
      assert.strictEqual(P.isEmptyLeaf(c), false);
    }
  },
  {
    name: "convertEdgeEmptyFramesToPadding: leading/trailing → padding",
    fn: function() {
      var props = { paddingTop: 0, paddingBottom: 0 };
      var children = [
        { type: "Frame", properties: {}, rect: { h: 8, w: 0 }, children: [] },
        { type: "Text", properties: { content: "hello" }, rect: { h: 20, w: 100 } },
        { type: "Frame", properties: {}, rect: { h: 12, w: 0 }, children: [] },
      ];
      P.convertEdgeEmptyFramesToPadding(props, children, true);
      assert.strictEqual(props.paddingTop, 8);
      assert.strictEqual(props.paddingBottom, 12);
      assert.strictEqual(children.length, 1); // only Text remains
      assert.strictEqual(children[0].type, "Text");
    }
  },
  {
    name: "convertEdgeEmptyFramesToPadding: horizontal leading/trailing",
    fn: function() {
      var props = {};
      var children = [
        { type: "Frame", properties: {}, rect: { w: 16, h: 0 }, children: [] },
        { type: "Text", properties: {}, rect: { w: 100, h: 20 } },
        { type: "Frame", properties: {}, rect: { w: 24, h: 0 }, children: [] },
      ];
      P.convertEdgeEmptyFramesToPadding(props, children, false);
      assert.strictEqual(props.paddingLeft, 16);
      assert.strictEqual(props.paddingRight, 24);
      assert.strictEqual(children.length, 1);
    }
  },
  {
    name: "capPaddingToRect: padding+content > rect → proportional cap",
    fn: function() {
      var props = { paddingTop: 30, paddingBottom: 20 };
      var node = {
        rect: { h: 100 },
        children: [
          { rect: { h: 60 } },
        ]
      };
      // contentH=60 ≤ rectH=100, totalPad=50, 50+60=110 > 100
      // avail=40, ratio=30/50=0.6, paddingTop=round(24)=24, paddingBottom=16
      P.capPaddingToRect(node, props, true);
      assert.strictEqual(props.paddingTop, 24);
      assert.strictEqual(props.paddingBottom, 16);
    }
  },
  {
    name: "capPaddingToRect: content > rect (ScrollView) → skip",
    fn: function() {
      var props = { paddingTop: 10, paddingBottom: 10 };
      var node = {
        rect: { h: 100 },
        children: [
          { rect: { h: 120 } }, // content exceeds rect
        ]
      };
      P.capPaddingToRect(node, props, true);
      // Should not cap — content > rect means ScrollView
      assert.strictEqual(props.paddingTop, 10);
      assert.strictEqual(props.paddingBottom, 10);
    }
  },
  {
    name: "capPaddingToRect: horizontal cap",
    fn: function() {
      var props = { paddingLeft: 20, paddingRight: 30 };
      var node = {
        rect: { w: 100 },
        children: [
          { rect: { w: 60 } },
        ]
      };
      // contentW=60 ≤ rectW=100, totalPad=50, 50+60=110 > 100
      // avail=40, ratio=20/50=0.4, paddingLeft=round(16)=16, paddingRight=24
      P.capPaddingToRect(node, props, false);
      assert.strictEqual(props.paddingLeft, 16);
      assert.strictEqual(props.paddingRight, 24);
    }
  },
];
