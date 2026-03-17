var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // isScrimNode
  // ============================================================
  {
    name: "isScrimNode: widgetName=ModalBarrier + full screen → true",
    fn: function() {
      var child = {
        type: "Frame", widgetName: "ModalBarrier",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { backgroundColor: "#8a000000" },
        children: []
      };
      var parentRect = { x: 0, y: 0, w: 411, h: 914 };
      assert.strictEqual(P.isScrimNode(child, parentRect), true);
    }
  },
  {
    name: "isScrimNode: no widgetName → false",
    fn: function() {
      var child = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { backgroundColor: "#8a000000" },
        children: []
      };
      assert.strictEqual(P.isScrimNode(child, { w: 411, h: 914 }), false);
    }
  },
  {
    name: "isScrimNode: widgetName=ModalBarrier but small frame → false",
    fn: function() {
      var child = {
        type: "Frame", widgetName: "ModalBarrier",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        properties: {},
        children: []
      };
      assert.strictEqual(P.isScrimNode(child, { w: 411, h: 914 }), false);
    }
  },
  {
    name: "isScrimNode: widgetName=ModalBarrier + close size match → true",
    fn: function() {
      var child = {
        type: "Frame", widgetName: "ModalBarrier",
        rect: { x: 0, y: 0, w: 408, h: 912 }, // within 10px
        properties: {},
        children: []
      };
      assert.strictEqual(P.isScrimNode(child, { w: 411, h: 914 }), true);
    }
  },
  // ============================================================
  // detectOverlays: bottom sheet pattern
  // ============================================================
  {
    name: "detectOverlays: bottom sheet pattern → STACK with end alignment",
    fn: function() {
      // Simulates: [empty, empty, Scaffold, ModalBarrier, BottomSheet]
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: {},
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {}, children: [] }, // empty
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {}, children: [] }, // empty
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { layoutMode: "VERTICAL" },
            widgetName: "Scaffold",
            children: [{ type: "Text", properties: { content: "Main" } }] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { backgroundColor: "#8a000000" },
            widgetName: "ModalBarrier", children: [] }, // scrim
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {},
            children: [{
              type: "Frame", rect: { x: 0, y: 137, w: 411, h: 777 }, // bottom sheet (y > 10%)
              properties: { layoutMode: "VERTICAL", backgroundColor: "#FFFFFFFF", borderRadius: 28 },
              children: [{ type: "Text", properties: { content: "Sheet" } }]
            }] },
        ]
      };
      P.detectOverlays(node);

      // Parent should be STACK
      assert.strictEqual(node.properties.isStack, true, "Parent should be STACK");
      assert.strictEqual(node.properties.clipsContent, true, "Parent should clip");

      // Should have 3 children: main, scrim, overlay
      assert.strictEqual(node.children.length, 3, "Should have main + scrim + overlay");

      // [0] = main content (Scaffold)
      assert.strictEqual(node.children[0].widgetName, "Scaffold", "First child should be Scaffold");

      // [1] = scrim (ModalBarrier)
      assert.strictEqual(node.children[1].widgetName, "ModalBarrier", "Second child should be scrim");

      // [2] = overlay container with end alignment (bottom sheet)
      var overlay = node.children[2];
      assert.strictEqual(overlay.properties.mainAxisAlignment, "end",
        "Bottom sheet overlay should be end-aligned");
    }
  },
  {
    name: "detectOverlays: dialog pattern → STACK with center alignment",
    fn: function() {
      // Dialog: overlay child is centered vertically
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: {},
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { layoutMode: "VERTICAL" },
            widgetName: "Scaffold",
            children: [{ type: "Text", properties: { content: "Main" } }] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { backgroundColor: "#8a000000" },
            widgetName: "ModalBarrier", children: [] }, // scrim
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {},
            children: [{
              type: "Frame", rect: { x: 50, y: 307, w: 311, h: 300 }, // centered (914-300)/2 ≈ 307
              properties: { layoutMode: "VERTICAL", backgroundColor: "#FFFFFFFF", borderRadius: 16 },
              children: [{ type: "Text", properties: { content: "Dialog" } }]
            }] },
        ]
      };
      P.detectOverlays(node);

      assert.strictEqual(node.properties.isStack, true);
      assert.strictEqual(node.children.length, 3);

      var overlay = node.children[2];
      assert.strictEqual(overlay.properties.mainAxisAlignment, "center",
        "Dialog overlay should be center-aligned");
    }
  },
  {
    name: "detectOverlays: no ModalBarrier → no change",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Text", rect: { x: 0, y: 0, w: 100, h: 20 }, properties: { content: "A" } },
          { type: "Text", rect: { x: 0, y: 30, w: 100, h: 20 }, properties: { content: "B" } },
        ]
      };
      P.detectOverlays(node);

      // No change
      assert.strictEqual(node.properties.layoutMode, "VERTICAL");
      assert.strictEqual(node.properties.isStack, undefined);
      assert.strictEqual(node.children.length, 2);
    }
  },
  {
    name: "detectOverlays: empty frames before scrim are filtered",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: {},
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { backgroundColor: "#00000000" }, children: [] }, // empty transparent
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {}, children: [] }, // empty
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {},
            widgetName: "Scaffold",
            children: [{ type: "Text", properties: { content: "Page" } }] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
            widgetName: "ModalBarrier", properties: { backgroundColor: "#8a000000" }, children: [] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {},
            children: [{ type: "Frame", rect: { x: 0, y: 200, w: 411, h: 714 }, properties: {} }] },
        ]
      };
      P.detectOverlays(node);

      // Empty frames should be filtered — only Scaffold in main
      assert.strictEqual(node.children.length, 3);
      assert.strictEqual(node.children[0].widgetName, "Scaffold", "Only Scaffold should remain in main");
    }
  },
  {
    name: "detectOverlays: rect preserved at screen size",
    fn: function() {
      var node = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: {},
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: { layoutMode: "VERTICAL" },
            children: [{ type: "Text", properties: { content: "Page" } }] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
            widgetName: "ModalBarrier", properties: {}, children: [] },
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, properties: {},
            children: [] },
        ]
      };
      P.detectOverlays(node);

      assert.strictEqual(node.rect.w, 411);
      assert.strictEqual(node.rect.h, 914);
    }
  },
  // ============================================================
  // Pipeline integration test
  // ============================================================
  {
    name: "pipeline: bottom sheet → STACK with main + scrim + overlay",
    fn: function() {
      // Minimal bottom sheet structure matching real crawler output
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        visual: { backgroundColor: "#FFFFFFFF" },
        containerLayout: {},
        children: [{
          type: "Frame", layoutMode: "NONE",
          rect: { x: 0, y: 0, w: 411, h: 914 },
          visual: {},
          containerLayout: {},
          children: [
            // Empty overlay placeholders
            { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, visual: { backgroundColor: "#00000000" }, containerLayout: {}, children: [] },
            { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 }, visual: {}, containerLayout: {}, children: [] },
            // Main content (Scaffold)
            { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 0, w: 411, h: 914 },
              widgetName: "Scaffold",
              visual: { backgroundColor: "#FFFFFFFF" },
              containerLayout: { mainAxisAlignment: "start" },
              children: [
                { type: "Text", rect: { x: 16, y: 100, w: 200, h: 30 },
                  visual: { content: "Main Page", fontSize: 20 }, containerLayout: {} }
              ]
            },
            // Scrim
            { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
              widgetName: "ModalBarrier",
              visual: { backgroundColor: "#8a000000" },
              containerLayout: {},
              children: [] },
            // Bottom sheet container
            { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: {},
              containerLayout: {},
              children: [{
                type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 137, w: 411, h: 777 },
                visual: { backgroundColor: "#FFFFFFFF", borderRadius: 28 },
                containerLayout: { padding: { top: 16, right: 16, bottom: 28, left: 16 } },
                children: [
                  { type: "Text", rect: { x: 16, y: 153, w: 100, h: 23 },
                    visual: { content: "Sheet Title", fontSize: 16 }, containerLayout: {} }
                ]
              }]
            },
          ]
        }]
      };

      var result = helpers.runPreprocess(input);

      // Find the STACK node
      var stackNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isStack === true;
      });
      assert.notStrictEqual(stackNode, null, "Should have a STACK node");
      assert.strictEqual(stackNode.properties.clipsContent, true);

      // Verify main content exists
      var mainText = helpers.findNode(stackNode, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Main Page";
      });
      assert.notStrictEqual(mainText, null, "Main page text should exist");

      // Verify sheet content exists
      var sheetText = helpers.findNode(stackNode, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Sheet Title";
      });
      assert.notStrictEqual(sheetText, null, "Sheet title should exist");

      // Verify screen-size rect
      assert.strictEqual(stackNode.rect.w, 411);
      assert.strictEqual(stackNode.rect.h, 914);
    }
  },
];
