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
  // ============================================================
  // handleBottomNavigationBar — unit tests
  // ============================================================
  {
    name: "handleBottomNavigationBar: sets HORIZONTAL + spaceAround + center",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [
          { type: "Frame", properties: {} },
          { type: "Frame", properties: {} },
        ]
      };
      P.handleBottomNavigationBar(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.properties.mainAxisAlignment, "spaceAround");
      assert.strictEqual(node.properties.crossAxisAlignment, "center");
    }
  },
  {
    name: "handleBottomNavigationBar: children get flexGrow=1 + FlexFit.tight",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [
          { type: "Frame", properties: {} },
          { type: "Frame", properties: {} },
          { type: "Frame", properties: {} },
        ]
      };
      P.handleBottomNavigationBar(node);
      for (var i = 0; i < node.children.length; i++) {
        assert.strictEqual(node.children[i].properties.flexGrow, 1);
        assert.strictEqual(node.children[i].properties.flexFit, "FlexFit.tight");
      }
    }
  },
  {
    name: "handleBottomNavigationBar: removes fixedWidth from children",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [
          { type: "Frame", properties: { fixedWidth: true } },
          { type: "Frame", properties: { fixedWidth: true, layoutMode: "VERTICAL" } },
        ]
      };
      P.handleBottomNavigationBar(node);
      for (var i = 0; i < node.children.length; i++) {
        assert.strictEqual(node.children[i].properties.fixedWidth, undefined);
      }
      // Other props preserved
      assert.strictEqual(node.children[1].properties.layoutMode, "VERTICAL");
    }
  },
  {
    name: "handleBottomNavigationBar: children get center alignment",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [
          { type: "Frame", properties: { crossAxisAlignment: "start" } },
          { type: "Frame", properties: {} },
        ]
      };
      P.handleBottomNavigationBar(node);
      for (var i = 0; i < node.children.length; i++) {
        assert.strictEqual(node.children[i].properties.crossAxisAlignment, "center");
        assert.strictEqual(node.children[i].properties.mainAxisAlignment, "center");
      }
    }
  },
  {
    name: "handleBottomNavigationBar: empty children array → no crash",
    fn: function() {
      var node = { type: "Frame", properties: {}, children: [] };
      P.handleBottomNavigationBar(node);
      assert.strictEqual(node.properties.layoutMode, "HORIZONTAL");
      assert.strictEqual(node.children.length, 0);
    }
  },
  // ============================================================
  // handleBottomNavigationBar — pipeline tests
  // ============================================================
  {
    name: "pipeline: BottomNavigationBar — 2 items with icon+label",
    fn: function() {
      var input = {
        type: "Frame",
        layoutMode: "ROW",
        rect: { x: 0, y: 834, w: 411, h: 80 },
        widgetName: "BottomNavigationBar",
        visual: { backgroundColor: "#FFFFFFFF" },
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 0, right: 0, bottom: 24, left: 0 } },
        children: [
          {
            type: "Frame", layoutMode: "COLUMN",
            rect: { x: 0, y: 841, w: 206, h: 58 },
            visual: {},
            containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 7, right: 0, bottom: 7, left: 0 } },
            childLayout: { flexGrow: 1 },
            children: [
              { type: "Frame", layoutMode: "COLUMN", rect: { x: 91, y: 848, w: 24, h: 24 },
                visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
                children: [
                  { type: "Frame", rect: { x: 91, y: 848, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {}, childLayout: { fixedWidth: true } }
                ]
              },
              { type: "Frame", layoutMode: "COLUMN", rect: { x: 83, y: 879, w: 40, h: 20 },
                visual: {}, containerLayout: { mainAxisAlignment: "end", crossAxisAlignment: "center" },
                children: [
                  { type: "Text", rect: { x: 83, y: 879, w: 40, h: 20 }, visual: { content: "Home", fontSize: 12, color: "#FF1A1A1A" }, containerLayout: {} }
                ]
              }
            ]
          },
          {
            type: "Frame", layoutMode: "COLUMN",
            rect: { x: 206, y: 841, w: 206, h: 58 },
            visual: {},
            containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 7, right: 0, bottom: 7, left: 0 } },
            childLayout: { flexGrow: 1 },
            children: [
              { type: "Frame", layoutMode: "COLUMN", rect: { x: 297, y: 848, w: 24, h: 24 },
                visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
                children: [
                  { type: "Frame", rect: { x: 297, y: 848, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {}, childLayout: { fixedWidth: true } }
                ]
              },
              { type: "Frame", layoutMode: "COLUMN", rect: { x: 284, y: 879, w: 51, h: 20 },
                visual: {}, containerLayout: { mainAxisAlignment: "end", crossAxisAlignment: "center" },
                children: [
                  { type: "Text", rect: { x: 284, y: 879, w: 51, h: 20 }, visual: { content: "Settings", fontSize: 12, color: "#FF666666" }, containerLayout: {} }
                ]
              }
            ]
          }
        ]
      };
      var result = helpers.runPreprocess(input);
      var p = result.properties || {};

      // Layout
      assert.strictEqual(p.layoutMode, "HORIZONTAL");
      assert.strictEqual(p.mainAxisAlignment, "spaceAround");
      assert.strictEqual(p.crossAxisAlignment, "center");

      // Bottom padding (safe area)
      assert.strictEqual(p.paddingBottom, 24);

      // Children: 2 items
      assert.strictEqual(result.children.length, 2);

      // Each child: flexGrow=1, center alignment
      for (var i = 0; i < result.children.length; i++) {
        var cp = result.children[i].properties || {};
        assert.strictEqual(cp.flexGrow, 1, "child[" + i + "] flexGrow=1");
        assert.strictEqual(cp.crossAxisAlignment, "center", "child[" + i + "] cross=center");
        assert.strictEqual(cp.mainAxisAlignment, "center", "child[" + i + "] main=center");
        assert.strictEqual(cp.fixedWidth, undefined, "child[" + i + "] fixedWidth removed");
      }

      // Labels exist
      var texts = [];
      function findTexts(n) {
        if (n.type === "Text") texts.push((n.properties || {}).content);
        var ch = n.children || [];
        for (var i = 0; i < ch.length; i++) findTexts(ch[i]);
      }
      findTexts(result);
      assert.ok(texts.indexOf("Home") !== -1, "Home label exists");
      assert.ok(texts.indexOf("Settings") !== -1, "Settings label exists");
    }
  },
  {
    name: "pipeline: BottomNavigationBar — 6 items (many tabs)",
    fn: function() {
      var items = [];
      var labels = ["Profile", "Finance", "Weather", "Settings", "Test", "AppBar"];
      for (var i = 0; i < labels.length; i++) {
        items.push({
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: i * 69, y: 841, w: 69, h: 58 },
          visual: {},
          containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 7, right: 0, bottom: 7, left: 0 } },
          childLayout: { flexGrow: 1 },
          children: [
            { type: "Frame", rect: { x: i * 69 + 22, y: 848, w: 24, h: 24 },
              visual: { isIconBox: true }, containerLayout: {}, childLayout: { fixedWidth: true } },
            { type: "Text", rect: { x: i * 69 + 10, y: 879, w: 50, h: 20 },
              visual: { content: labels[i], fontSize: 12 }, containerLayout: {} }
          ]
        });
      }
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 834, w: 411, h: 82 },
        widgetName: "BottomNavigationBar",
        visual: { backgroundColor: "#FFFEF7FF" },
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 0, right: 0, bottom: 24, left: 0 } },
        children: items
      };
      var result = helpers.runPreprocess(input);

      assert.strictEqual(result.children.length, 6, "All 6 tabs present");
      for (var i = 0; i < result.children.length; i++) {
        var cp = result.children[i].properties || {};
        assert.strictEqual(cp.flexGrow, 1, "tab[" + i + "] flexGrow=1");
      }

      // Verify all labels survived
      var texts = [];
      function findTexts(n) {
        if (n.type === "Text") texts.push((n.properties || {}).content);
        var ch = n.children || [];
        for (var i = 0; i < ch.length; i++) findTexts(ch[i]);
      }
      findTexts(result);
      for (var i = 0; i < labels.length; i++) {
        assert.ok(texts.indexOf(labels[i]) !== -1, "Label '" + labels[i] + "' exists");
      }
    }
  },
  {
    name: "pipeline: BottomNavigationBar — preserves bg color and bottom padding",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 400, h: 80 },
        widgetName: "BottomNavigationBar",
        visual: { backgroundColor: "#FFFFFFFF" },
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center", padding: { top: 0, right: 0, bottom: 34, left: 0 } },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 0, w: 200, h: 56 },
            visual: {}, containerLayout: {}, childLayout: { flexGrow: 1 },
            children: [
              { type: "Text", rect: { x: 90, y: 36, w: 20, h: 15 }, visual: { content: "A" }, containerLayout: {} }
            ] },
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 200, y: 0, w: 200, h: 56 },
            visual: {}, containerLayout: {}, childLayout: { flexGrow: 1 },
            children: [
              { type: "Text", rect: { x: 290, y: 36, w: 20, h: 15 }, visual: { content: "B" }, containerLayout: {} }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);
      var p = result.properties || {};

      assert.ok(p.backgroundColor && p.backgroundColor.toLowerCase() === "#ffffffff", "bg color preserved");
      assert.strictEqual(p.paddingBottom, 34, "bottom safe-area padding preserved");
    }
  },
  {
    name: "handleBottomNavigationBar: descendant Text gets sizingH=FILL + textAlign=center",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [{
          type: "Frame", properties: {},
          children: [
            { type: "Frame", properties: { isIconBox: true } },
            { type: "Text", properties: { content: "Tab Label", textAlign: "start" } },
          ]
        }]
      };
      P.handleBottomNavigationBar(node);
      // Walk to find Text
      var text = node.children[0].children[1];
      assert.strictEqual(text.properties.sizingH, "FILL",
        "BottomNav label text should be FILL");
      assert.strictEqual(text.properties.textAlign, "center",
        "BottomNav label text should be center-aligned");
    }
  },
  {
    name: "handleBottomNavigationBar: long label (Widget Test) gets FILL → truncates naturally",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        children: [{
          type: "Frame", properties: {},
          rect: { w: 69 },
          children: [
            { type: "Frame", properties: { isIconBox: true } },
            { type: "Text", properties: { content: "Widget Test", textAlign: "start" },
              rect: { w: 77 } }, // wider than parent!
          ]
        }]
      };
      P.handleBottomNavigationBar(node);
      var text = node.children[0].children[1];
      assert.strictEqual(text.properties.sizingH, "FILL",
        "Long label should be FILL (will truncate in Figma when parent is narrower)");
    }
  },
  {
    name: "pipeline: BottomNavigationBar — icon fixedWidth removed after processing",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 400, h: 80 },
        widgetName: "BottomNavigationBar",
        visual: {},
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center" },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 0, w: 200, h: 56 },
            visual: {}, containerLayout: {},
            childLayout: { flexGrow: 1, fixedWidth: true },
            children: [
              { type: "Frame", rect: { x: 88, y: 7, w: 24, h: 24 },
                visual: { isIconBox: true }, containerLayout: {},
                childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true } },
              { type: "Text", rect: { x: 90, y: 36, w: 20, h: 15 },
                visual: { content: "Tab" }, containerLayout: {} }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);
      assert.strictEqual(result.children.length, 1);
      var tabProps = result.children[0].properties || {};
      assert.strictEqual(tabProps.fixedWidth, undefined, "fixedWidth removed from tab item");
      assert.strictEqual(tabProps.flexGrow, 1, "flexGrow set");
    }
  },
];
