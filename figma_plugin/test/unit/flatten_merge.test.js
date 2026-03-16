var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // normalizeSchemaV2 (pipeline entry)
  // ============================================================
  {
    name: "normalizeSchemaV2: v2 fields → flat properties",
    fn: function() {
      var node = {
        type: "Frame",
        layoutMode: "ROW",
        visual: { backgroundColor: "#FF0000FF", borderRadius: 8 },
        containerLayout: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, mainAxisAlignment: "center" },
        childLayout: { flexGrow: 1, sizingH: "FILL" },
        children: []
      };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.properties.backgroundColor, "#FF0000FF");
      assert.strictEqual(node.properties.borderRadius, "8");
      assert.strictEqual(node.properties.paddingTop, 10);
      assert.strictEqual(node.properties.mainAxisAlignment, "center");
      assert.strictEqual(node.properties.flexGrow, 1);
      assert.strictEqual(node.properties.sizingH, "FILL");
      // v2 fields cleaned up
      assert.strictEqual(node.visual, undefined);
      assert.strictEqual(node.containerLayout, undefined);
    }
  },
  {
    name: "normalizeSchemaV2: STACK → isStack",
    fn: function() {
      var node = { type: "Frame", layoutMode: "STACK", visual: {}, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.isStack, true);
      assert.strictEqual(node.properties.layoutMode, undefined);
    }
  },
  {
    name: "normalizeSchemaV2: WRAP → layoutWrap + HORIZONTAL",
    fn: function() {
      var node = { type: "Frame", layoutMode: "WRAP", visual: {}, containerLayout: { itemSpacing: 8, runSpacing: 4 }, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.properties.layoutWrap, true);
      assert.strictEqual(node.properties.itemSpacing, 8);
      assert.strictEqual(node.properties.runSpacing, 4);
    }
  },
  {
    name: "normalizeSchemaV2: border object → hasBorder + borderColor + borderWidth",
    fn: function() {
      var node = { type: "Frame", visual: { border: { color: "#FF000000", width: 2 } }, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.hasBorder, true);
      assert.strictEqual(node.properties.borderColor, "#FF000000");
      assert.strictEqual(node.properties.borderWidth, 2);
    }
  },
  {
    name: "normalizeSchemaV2: per-side border widths",
    fn: function() {
      var node = { type: "Frame", visual: { border: { color: "#FF000000", topWidth: 1, rightWidth: 2, bottomWidth: 3, leftWidth: 4 } }, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.borderTopWidth, 1);
      assert.strictEqual(node.properties.borderRightWidth, 2);
      assert.strictEqual(node.properties.borderBottomWidth, 3);
      assert.strictEqual(node.properties.borderLeftWidth, 4);
    }
  },
  {
    name: "normalizeSchemaV2: shadow with elevation",
    fn: function() {
      var node = { type: "Frame", visual: { shadow: { elevation: 4 } }, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.elevation, 4);
    }
  },
  {
    name: "normalizeSchemaV2: shadow with color/offset",
    fn: function() {
      var node = { type: "Frame", visual: { shadow: { color: "#40000000", offsetX: 2, offsetY: 4, blurRadius: 10 } }, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.shadowColor, "#40000000");
      assert.strictEqual(node.properties.shadowOffsetX, 2);
      assert.strictEqual(node.properties.shadowBlurRadius, 10);
    }
  },
  {
    name: "normalizeSchemaV2: gradient preserved",
    fn: function() {
      var grad = { type: "linear", colors: ["#FF0000", "#0000FF"] };
      var node = { type: "Frame", visual: { gradient: grad }, containerLayout: {}, children: [] };
      P.normalizeSchemaV2(node);
      assert.deepStrictEqual(node.properties.gradient, grad);
    }
  },
  {
    name: "normalizeSchemaV2: childLayout fixedSize",
    fn: function() {
      var node = { type: "Frame", visual: {}, containerLayout: {}, childLayout: { fixedSize: true, fixedWidth: true, fixedHeight: true }, children: [] };
      P.normalizeSchemaV2(node);
      assert.strictEqual(node.properties.fixedSize, true);
      assert.strictEqual(node.properties.fixedWidth, true);
      assert.strictEqual(node.properties.fixedHeight, true);
    }
  },
  {
    name: "normalizeSchemaV2: mainAxisSize max → FIXED, min → AUTO",
    fn: function() {
      var nodeMax = { type: "Frame", visual: {}, containerLayout: { mainAxisSize: "max" }, children: [] };
      P.normalizeSchemaV2(nodeMax);
      assert.strictEqual(nodeMax.properties.mainAxisSize, "FIXED");

      var nodeMin = { type: "Frame", visual: {}, containerLayout: { mainAxisSize: "min" }, children: [] };
      P.normalizeSchemaV2(nodeMin);
      assert.strictEqual(nodeMin.properties.mainAxisSize, "AUTO");
    }
  },
  // ============================================================
  // findDecoNode / findNoneFrame
  // ============================================================
  {
    name: "findDecoNode: finds node with backgroundColor",
    fn: function() {
      var tree = {
        type: "Frame", properties: {},
        children: [{
          type: "Frame", properties: { backgroundColor: "#FFFF0000" },
          children: []
        }]
      };
      var result = P.findDecoNode(tree);
      assert.strictEqual(result.properties.backgroundColor, "#FFFF0000");
    }
  },
  {
    name: "findDecoNode: returns null if no visual",
    fn: function() {
      var tree = { type: "Frame", properties: {}, children: [] };
      assert.strictEqual(P.findDecoNode(tree), null);
    }
  },
  {
    name: "findNoneFrame: finds Frame without layoutMode/isStack",
    fn: function() {
      var tree = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        children: [{
          type: "Frame", properties: {},
          children: [{ type: "Text", properties: {} }]
        }]
      };
      var result = P.findNoneFrame(tree);
      assert.notStrictEqual(result, null);
      assert.strictEqual(result.properties.layoutMode, undefined);
    }
  },
  // ============================================================
  // assignFlexGrowToWidest
  // ============================================================
  {
    name: "assignFlexGrowToWidest: widest child gets flexGrow=1",
    fn: function() {
      var children = [
        { type: "Frame", rect: { w: 40 }, properties: {} },
        { type: "Frame", rect: { w: 200 }, properties: {} },
        { type: "Frame", rect: { w: 60 }, properties: {} },
      ];
      P.assignFlexGrowToWidest(children);
      assert.strictEqual(children[1].properties.flexGrow, 1);
      assert.strictEqual(children[0].properties.flexGrow, undefined);
    }
  },
  // ============================================================
  // buildGroupColumns
  // ============================================================
  {
    name: "buildGroupColumns: single-item groups → no wrapper",
    fn: function() {
      var groups = [
        [{ type: "Frame", rect: { x: 0, y: 0, w: 40, h: 40 }, properties: {} }],
        [{ type: "Frame", rect: { x: 60, y: 0, w: 40, h: 40 }, properties: {} }],
      ];
      var result = P.buildGroupColumns(groups);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].type, "Frame");
    }
  },
  {
    name: "buildGroupColumns: multi-item group → COLUMN wrapper",
    fn: function() {
      var groups = [[
        { type: "Text", rect: { x: 60, y: 10, w: 100, h: 20 }, properties: {} },
        { type: "Text", rect: { x: 60, y: 35, w: 80, h: 16 }, properties: {} },
      ]];
      var result = P.buildGroupColumns(groups);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].properties.layoutMode, "VERTICAL");
      assert.strictEqual(result[0].children.length, 2);
    }
  },
  // ============================================================
  // handleBottomNavigationBar
  // ============================================================
  {
    name: "handleBottomNavigationBar: children get flexGrow=1 + center",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [
          { type: "Frame", properties: { fixedWidth: true } },
          { type: "Frame", properties: { fixedWidth: true } },
          { type: "Frame", properties: { fixedWidth: true } },
        ]
      };
      P.handleBottomNavigationBar(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.properties.mainAxisAlignment, "spaceAround");
      for (var i = 0; i < node.children.length; i++) {
        assert.strictEqual(node.children[i].properties.flexGrow, 1);
        assert.strictEqual(node.children[i].properties.fixedWidth, undefined);
      }
    }
  },
];
