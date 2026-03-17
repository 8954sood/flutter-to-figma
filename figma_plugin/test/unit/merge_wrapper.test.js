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
  // ============================================================
  // mergeChainIntoInnermost: stretch → FILL vs center alignment
  // ============================================================
  {
    name: "mergeChainIntoInnermost: stretch wrappers + center innermost → sizingH NOT FILL",
    fn: function() {
      // Dialog pattern: stretch(L2) → stretch(L3) → stretch(L4) → center(L5) → visual dialog(L6)
      // L5 stops the chain. Chain=[L2,L3,L4,L5]. L5 has crossAxisAlignment=center.
      // L2/L3/L4 have crossAxisAlignment=stretch → set sizingH=FILL.
      // But final merged crossAxisAlignment should be center, so sizingH should NOT be FILL.
      var chain = [
        { rect: { x: 0, y: 0, w: 411, h: 914 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch", mainAxisSize: "AUTO" } },
        { rect: { x: 0, y: 0, w: 411, h: 914 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch", paddingTop: 24, paddingBottom: 24 } },
        { rect: { x: 0, y: 24, w: 411, h: 866 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch", paddingLeft: 40, paddingRight: 40, paddingTop: 24, paddingBottom: 24 } },
        { rect: { x: 40, y: 48, w: 331, h: 818 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "center", mainAxisAlignment: "center", mainAxisSize: "FIXED" },
          children: [{ type: "Frame", rect: { x: 65, y: 354, w: 280, h: 205 }, properties: { backgroundColor: "#ffffffff" } }] },
      ];
      var result = P.mergeChainIntoInnermost(chain);
      var rp = result.properties;

      // crossAxisAlignment should be center (from innermost L5, or outermost if it had center)
      assert.strictEqual(rp.crossAxisAlignment, "center",
        "merged crossAxisAlignment should be center");
      // sizingH should NOT be FILL — center alignment means child has its own width
      assert.notStrictEqual(rp.sizingH, "FILL",
        "sizingH should NOT be FILL when final crossAxisAlignment is center");
    }
  },
  {
    name: "mergeChainIntoInnermost: stretch wrappers + stretch innermost → sizingH FILL preserved",
    fn: function() {
      // Normal case: all stretch → sizingH=FILL should be preserved
      var chain = [
        { rect: { x: 0, y: 0, w: 411, h: 800 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" } },
        { rect: { x: 0, y: 0, w: 411, h: 800 },
          properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
          children: [{ type: "Text", properties: {} }] },
      ];
      var result = P.mergeChainIntoInnermost(chain);
      assert.strictEqual(result.properties.sizingH, "FILL",
        "stretch + stretch → sizingH should be FILL");
    }
  },
  {
    name: "mergePropsInto: outermost stretch does NOT override inner center for crossAxisAlignment",
    fn: function() {
      var target = { crossAxisAlignment: "center", layoutMode: "VERTICAL" };
      var source = { crossAxisAlignment: "stretch", sizingH: "FILL" };
      P.mergePropsInto(target, source, true);
      // stretch is not center/end, so it should not override center
      assert.strictEqual(target.crossAxisAlignment, "center",
        "outermost stretch should NOT override inner center");
    }
  },
  {
    name: "pipeline: dialog centering — dialog keeps 280px width, not stretched to 331px",
    fn: function() {
      // Full pipeline: overlay → padding wrappers (stretch) → center container → dialog (280px)
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 411, h: 914 },
        visual: { backgroundColor: "#ffffffff" },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [{
          type: "Frame", layoutMode: "NONE",
          rect: { x: 0, y: 0, w: 411, h: 914 },
          visual: {}, containerLayout: {},
          children: [
            // transparent frame
            { type: "Frame", layoutMode: "NONE",
              rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: { backgroundColor: "#00000000" }, containerLayout: {}, children: [] },
            // ModalBarrier (route)
            { type: "Frame", layoutMode: "NONE",
              rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: {}, containerLayout: {}, children: [], widgetName: "ModalBarrier" },
            // Main page (Scaffold)
            { type: "Frame", layoutMode: "COLUMN",
              rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: { backgroundColor: "#ffffffff" }, containerLayout: {},
              children: [{ type: "Text", rect: { x: 16, y: 100, w: 200, h: 20 },
                visual: { content: "Page" }, containerLayout: {} }],
              widgetName: "Scaffold" },
            // ModalBarrier (dialog)
            { type: "Frame", layoutMode: "NONE",
              rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: { backgroundColor: "#8a000000" }, containerLayout: {}, children: [],
              widgetName: "ModalBarrier" },
            // Dialog overlay
            { type: "Frame", layoutMode: "COLUMN",
              rect: { x: 0, y: 0, w: 411, h: 914 },
              visual: { opacity: 1.0 },
              containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min" },
              children: [{
                // SafeArea padding wrapper
                type: "Frame", layoutMode: "COLUMN",
                rect: { x: 0, y: 0, w: 411, h: 914 },
                visual: {},
                containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min", padding: { top: 24, right: 0, bottom: 24, left: 0 } },
                children: [{
                  // Dialog inset padding
                  type: "Frame", layoutMode: "COLUMN",
                  rect: { x: 0, y: 24, w: 411, h: 866 },
                  visual: {},
                  containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min", padding: { top: 24, right: 40, bottom: 24, left: 40 } },
                  children: [{
                    // Center container
                    type: "Frame", layoutMode: "COLUMN",
                    rect: { x: 40, y: 48, w: 331, h: 818 },
                    visual: {},
                    containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
                    children: [{
                      // The actual dialog
                      type: "Frame", layoutMode: "COLUMN",
                      rect: { x: 65.71, y: 354.64, w: 280, h: 205 },
                      visual: { backgroundColor: "#ffffffff", shadow: { elevation: 6.0 }, borderRadius: 28.0 },
                      containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min" },
                      children: [
                        { type: "Frame", layoutMode: "COLUMN",
                          rect: { x: 65.71, y: 354.64, w: 280, h: 53 },
                          visual: {}, containerLayout: { padding: { top: 24, right: 24, bottom: 0, left: 24 } },
                          children: [
                            { type: "Text", rect: { x: 89.71, y: 378.64, w: 89, h: 29 },
                              visual: { content: "미팅 삭제", fontSize: 24, fontWeight: "FontWeight.w600" }, containerLayout: {} }
                          ] },
                        { type: "Frame", layoutMode: "COLUMN",
                          rect: { x: 65.71, y: 407.64, w: 280, h: 80 },
                          visual: {}, containerLayout: { padding: { top: 16, right: 24, bottom: 24, left: 24 } },
                          childLayout: { flexGrow: 1, sizingH: "FILL", sizingV: "FILL" },
                          children: [
                            { type: "Text", rect: { x: 89.71, y: 423.64, w: 232, h: 40 },
                              visual: { content: "이 미팅을 삭제하시겠습니까?" }, containerLayout: {} }
                          ] },
                        { type: "Frame", layoutMode: "ROW",
                          rect: { x: 65.71, y: 487.64, w: 280, h: 72 },
                          visual: {},
                          containerLayout: { mainAxisAlignment: "end", crossAxisAlignment: "center", padding: { top: 0, right: 24, bottom: 24, left: 24 } },
                          children: [
                            { type: "Frame", rect: { x: 144.71, y: 487.64, w: 64, h: 44 },
                              visual: { borderRadius: 12.0 }, containerLayout: {},
                              children: [{ type: "Text", rect: { x: 160.71, y: 499.64, w: 25, h: 20 },
                                visual: { content: "취소" }, containerLayout: {} }] },
                            { type: "Frame", rect: { x: 220.71, y: 487.64, w: 64, h: 44 },
                              visual: { borderRadius: 12.0 }, containerLayout: {},
                              children: [{ type: "Text", rect: { x: 236.71, y: 499.64, w: 25, h: 20 },
                                visual: { content: "삭제", color: "#ffD32F2F" }, containerLayout: {} }] },
                          ] },
                      ]
                    }]
                  }]
                }]
              }]
            }
          ]
        }]
      };

      var result = helpers.runPreprocess(input);

      // Find the dialog node (has borderRadius 28 and backgroundColor)
      var dialogNode = helpers.findNode(result, function(n) {
        var p = n.properties || {};
        return p.borderRadius === "28" && p.backgroundColor === "#ffffffff" &&
          p.elevation === 6;
      });

      if (!dialogNode) {
        // Try finding by shadow
        dialogNode = helpers.findNode(result, function(n) {
          var p = n.properties || {};
          return p.borderRadius === "28" || (p.borderRadius && String(p.borderRadius) === "28");
        });
      }

      assert.notStrictEqual(dialogNode, null, "dialog node should exist");

      if (dialogNode) {
        var dr = dialogNode.rect || {};
        // Dialog width should be 280, NOT 331
        assert.ok(dr.w <= 290,
          "dialog width should be ~280 (not stretched to 331). Got: " + dr.w);
      }
    }
  },
];
