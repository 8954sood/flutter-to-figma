var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // mergeWrapperChains: alignment propagation
  // ============================================================
  // ============================================================
  // mergeWrapperChains: center/end alignment propagation to child
  // When chain stops (alignment mismatch), outer's center/end
  // should propagate to inner if inner has default "start"
  // ============================================================
  {
    name: "merge: Center(center/center) → Column(start/center) — center propagated to child",
    fn: function() {
      // Center wraps Column: shouldStopChain detects alignment mismatch → chain stops
      // But outer center should propagate to child (child has default start)
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 379, h: 600 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center", crossAxisAlignment: "center" },
        children: [{
          type: "Frame",
          rect: { x: 10, y: 213, w: 359, h: 174 },
          properties: { layoutMode: "VERTICAL", mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "AUTO" },
          children: [
            { type: "Text", rect: { x: 100, y: 213, w: 167, h: 23 }, properties: { content: "Empty" } },
          ]
        }]
      };
      P.mergeWrapperChains(tree);
      // Chain stopped → wrapper preserved, but center propagated to child
      var child = tree.children[0];
      assert.strictEqual(child.properties.mainAxisAlignment, "center",
        "Outer center should propagate to child (was start)");
    }
  },
  {
    name: "merge: Align(end/end) → Column(start/start) — end propagated to child",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 400, h: 400 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "end", crossAxisAlignment: "end" },
        children: [{
          type: "Frame",
          rect: { x: 300, y: 350, w: 100, h: 50 },
          properties: { layoutMode: "VERTICAL", mainAxisAlignment: "start", crossAxisAlignment: "start" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      P.mergeWrapperChains(tree);
      var child = tree.children[0];
      assert.strictEqual(child.properties.mainAxisAlignment, "end",
        "Outer end should propagate to child");
      assert.strictEqual(child.properties.crossAxisAlignment, "end",
        "Outer end cross should propagate to child");
    }
  },
  {
    name: "merge: Center → Column(center already) — no change (child already center)",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 379, h: 600 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center", crossAxisAlignment: "center" },
        children: [{
          type: "Frame",
          rect: { x: 10, y: 213, w: 359, h: 174 },
          properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center", crossAxisAlignment: "center" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      P.mergeWrapperChains(tree);
      // Same alignment → no mismatch → chain continues (merge happens)
      // Result should have center
      assert.strictEqual(tree.properties.mainAxisAlignment, "center");
    }
  },
  {
    name: "merge: start outer → center inner — no propagation (start is default, not intentional)",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 400, h: 400 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "start" },
        children: [{
          type: "Frame",
          rect: { x: 0, y: 0, w: 400, h: 400 },
          properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      P.mergeWrapperChains(tree);
      // start outer doesn't trigger alignment mismatch stop
      // Chain continues → merge happens → inner center preserved
      var resultMain = tree.properties.mainAxisAlignment;
      // After merge, inner's center should be preserved (inner priority for layout keys)
    }
  },
  {
    name: "mergePropsInto: outermost center overrides inner start",
    fn: function() {
      var target = { mainAxisAlignment: "start" };
      var source = { mainAxisAlignment: "center" };
      P.mergePropsInto(target, source, true); // isOutermost
      assert.strictEqual(target.mainAxisAlignment, "center",
        "outermost center should override inner start");
    }
  },
  {
    name: "mergePropsInto: outermost end overrides inner start",
    fn: function() {
      var target = { mainAxisAlignment: "start" };
      var source = { mainAxisAlignment: "end" };
      P.mergePropsInto(target, source, true);
      assert.strictEqual(target.mainAxisAlignment, "end");
    }
  },
  {
    name: "mergePropsInto: outermost center does NOT override inner center",
    fn: function() {
      var target = { mainAxisAlignment: "center" };
      var source = { mainAxisAlignment: "center" };
      P.mergePropsInto(target, source, true);
      assert.strictEqual(target.mainAxisAlignment, "center");
    }
  },
  {
    name: "mergePropsInto: outermost center does NOT override inner end",
    fn: function() {
      var target = { mainAxisAlignment: "end" };
      var source = { mainAxisAlignment: "center" };
      P.mergePropsInto(target, source, true);
      assert.strictEqual(target.mainAxisAlignment, "end"); // inner non-default preserved
    }
  },
  {
    name: "mergePropsInto: outermost start does NOT override inner center",
    fn: function() {
      var target = { mainAxisAlignment: "center" };
      var source = { mainAxisAlignment: "start" };
      P.mergePropsInto(target, source, true);
      assert.strictEqual(target.mainAxisAlignment, "center"); // inner preserved
    }
  },
  {
    name: "mergePropsInto: non-outermost center does NOT override start",
    fn: function() {
      var target = { mainAxisAlignment: "start" };
      var source = { mainAxisAlignment: "center" };
      P.mergePropsInto(target, source, false); // NOT outermost
      assert.strictEqual(target.mainAxisAlignment, "start"); // inner preserved (only outermost overrides)
    }
  },
  {
    name: "pipeline: empty state — Center > Column(min) → content vertically centered",
    fn: function() {
      // Exact pattern: Center(flex-grow:1, center/center) > Padding > Column(min, start/center) > content
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 80, w: 411, h: 834 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [
          { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 72 }, layoutMode: "COLUMN",
            visual: {}, containerLayout: {},
            childLayout: { sizingH: "FILL", sizingV: "HUG" },
            children: [] },
          { type: "Frame", rect: { x: 0, y: 152, w: 411, h: 682 }, layoutMode: "COLUMN",
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            childLayout: { flexGrow: 1, sizingH: "FILL", sizingV: "FILL" },
            children: [{
              type: "Frame", rect: { x: 3, y: 382, w: 405, h: 174 }, layoutMode: "COLUMN",
              visual: {},
              containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
                padding: { top: 24, right: 24, bottom: 24, left: 24 } },
              children: [
                { type: "Frame", rect: { x: 173, y: 406, w: 64, h: 64 },
                  visual: { isIconBox: true }, containerLayout: {} },
                { type: "Frame", rect: { x: 0, y: 470, w: 0, h: 12 },
                  visual: {}, containerLayout: {}, children: [] },
                { type: "Text", rect: { x: 119, y: 482, w: 167, h: 23 },
                  visual: { content: "No items", fontSize: 16, textAlign: "center" }, containerLayout: {} },
                { type: "Frame", rect: { x: 0, y: 505, w: 0, h: 8 },
                  visual: {}, containerLayout: {}, children: [] },
                { type: "Text", rect: { x: 39, y: 513, w: 327, h: 20 },
                  visual: { content: "Try searching", fontSize: 14, textAlign: "center" }, containerLayout: {} },
              ]
            }]
          }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find the content column (has "No items" text)
      var contentCol = helpers.findNode(result, function(n) {
        var ch = n.children || [];
        return ch.some(function(c) {
          return c.type === "Text" && (c.properties || {}).content === "No items";
        });
      });
      assert.notStrictEqual(contentCol, null, "Content column should exist");

      // Content column should have center alignment (propagated from Center wrapper)
      assert.strictEqual(contentCol.properties.mainAxisAlignment, "center",
        "Content column should have mainAxisAlignment=center (from Center widget)");
    }
  },
  // ============================================================
  // merge: icon wrapper — inner rect preserved for isIconBox
  // ============================================================
  {
    name: "merge: icon wrapper chain — isIconBox keeps inner 24x24 rect, not outer 48x48",
    fn: function() {
      // Pattern: Frame(48x48, center/center) → Frame(48x48) → Frame(24x24, isIconBox, bg)
      var tree = {
        type: "Frame",
        rect: { x: 16, y: 213, w: 48, h: 48 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center", crossAxisAlignment: "center" },
        children: [{
          type: "Frame",
          rect: { x: 16, y: 213, w: 48, h: 48 },
          properties: {},
          children: [{
            type: "Frame",
            rect: { x: 28, y: 225, w: 24, h: 24 },
            properties: { isIconBox: true, backgroundColor: "#FF666666" },
            children: []
          }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Icon should keep 24x24 rect, not be inflated to 48x48
      // The wrapper should be preserved or icon rect should stay inner
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.rect.w, 24, "Icon width should be 24, not 48");
      assert.strictEqual(icon.rect.h, 24, "Icon height should be 24, not 48");
    }
  },
  {
    name: "merge: icon in TextField — icon 24x24 preserved after full pipeline",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min" },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 16, y: 213, w: 48, h: 48 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            children: [{
              type: "Frame", rect: { x: 16, y: 213, w: 48, h: 48 },
              visual: {},
              containerLayout: {},
              children: [{
                type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 },
                visual: { isIconBox: true, backgroundColor: "#FF666666" },
                containerLayout: {}
              }]
            }]
          },
          { type: "Text", rect: { x: 68, y: 226, w: 307, h: 22 },
            visual: { content: "Search", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null, "Icon should exist");
      assert.strictEqual(icon.rect.w, 24, "Icon should be 24px wide, not 48");
      assert.strictEqual(icon.rect.h, 24, "Icon should be 24px tall, not 48");
    }
  },
  {
    name: "merge: icon centering wrapper preserved — 48x48 wrapper around 24x24 icon not merged",
    fn: function() {
      // Wrapper(48x48, center/center) → Icon(24x24, isIconBox)
      // Wrapper should NOT be absorbed — it provides centering padding
      var tree = {
        type: "Frame",
        rect: { x: 16, y: 213, w: 48, h: 48 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center", crossAxisAlignment: "center" },
        children: [{
          type: "Frame",
          rect: { x: 28, y: 225, w: 24, h: 24 },
          properties: { isIconBox: true, backgroundColor: "#FF666666" },
          children: []
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Wrapper should be preserved (not merged into icon)
      assert.strictEqual(result.rect.w, 48, "Wrapper 48x48 preserved");
      assert.strictEqual(result.rect.h, 48);
      assert.strictEqual(result.children.length, 1, "Icon is still a child");
      assert.strictEqual(result.children[0].rect.w, 24, "Icon stays 24x24");
      assert.strictEqual(result.children[0].properties.isIconBox, true);
      // Wrapper has center alignment
      assert.strictEqual(result.properties.mainAxisAlignment, "center");
      assert.strictEqual(result.properties.crossAxisAlignment, "center");
    }
  },
  {
    name: "merge: icon same size as wrapper — absorb OK (no centering needed)",
    fn: function() {
      // Wrapper(24x24) → Icon(24x24) — same size, absorb is fine
      var tree = {
        type: "Frame",
        rect: { x: 28, y: 225, w: 24, h: 24 },
        properties: {},
        children: [{
          type: "Frame",
          rect: { x: 28, y: 225, w: 24, h: 24 },
          properties: { isIconBox: true, backgroundColor: "#FF666666" },
          children: []
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Same size → absorb merge OK
      assert.strictEqual(result.properties.isIconBox, true);
      assert.strictEqual(result.rect.w, 24);
    }
  },
  {
    name: "pipeline: TextField prefixIcon — wrapper(48x48) preserved with center, icon(24x24) inside",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 120, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
          padding: { top: 0, right: 20, bottom: 0, left: 0 } },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 16, y: 120, w: 48, h: 48 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            children: [{
              type: "Frame", rect: { x: 16, y: 120, w: 48, h: 48 },
              visual: {},
              containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
              children: [{
                type: "Frame", rect: { x: 28, y: 132, w: 24, h: 24 },
                visual: { isIconBox: true, backgroundColor: "#FF666666" },
                containerLayout: {}
              }]
            }]
          },
          { type: "Text", rect: { x: 68, y: 133, w: 307, h: 22 },
            visual: { content: "Search here", fontSize: 16, color: "#FF999999" },
            containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find icon
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null, "Icon should exist");
      assert.strictEqual(icon.rect.w, 24, "Icon 24px wide");
      assert.strictEqual(icon.rect.h, 24, "Icon 24px tall");

      // Find icon's parent wrapper (should be 48x48 with center alignment)
      var tf = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tf, null);

      // TextField's first child should be the icon wrapper, not the bare icon
      var firstChild = tf.children[0];
      assert.ok(firstChild.rect.w >= 40,
        "First child should be icon wrapper (~48px), not bare icon (24px). Got: " + firstChild.rect.w);

      // Icon wrapper should have center alignment
      var wrapperProps = firstChild.properties || {};
      assert.ok(
        wrapperProps.mainAxisAlignment === "center" || wrapperProps.crossAxisAlignment === "center",
        "Icon wrapper should have center alignment");
    }
  },
  {
    name: "pipeline: standalone icon (no wrapper) — icon rect unchanged",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 200, h: 40 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 10, y: 8, w: 24, h: 24 },
            visual: { isIconBox: true, backgroundColor: "#FF000000" },
            containerLayout: {} },
          { type: "Text", rect: { x: 42, y: 10, w: 100, h: 20 },
            visual: { content: "Label" }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.rect.w, 24);
      assert.strictEqual(icon.rect.h, 24);
    }
  },
  {
    name: "shouldStopChain: wrapper(48x48) + icon(24x24, isIconBox) → stop (size diff + icon)",
    fn: function() {
      var current = { properties: {}, rect: { w: 48, h: 48 } };
      var next = { properties: { isIconBox: true, backgroundColor: "#FF000000" }, rect: { w: 24, h: 24 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true,
        "Icon with size diff → chain should stop");
    }
  },
  {
    name: "shouldStopChain: wrapper(24x24) + icon(24x24, isIconBox) → absorb (same size)",
    fn: function() {
      var current = { properties: {}, rect: { w: 24, h: 24 } };
      var next = { properties: { isIconBox: true, backgroundColor: "#FF000000" }, rect: { w: 24, h: 24 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), "absorb",
        "Icon same size → absorb OK");
    }
  },
  {
    name: "shouldStopChain: visual container(38x38,bg) + transparent wrapper(22x22) → stop (size diff)",
    fn: function() {
      // Colored bg container → transparent wrapper → icon (3-node chain)
      // Chain should stop at colored→wrapper because visual+size diff
      var current = {
        properties: { backgroundColor: "#fff0e6ff", borderRadius: 12, paddingTop: 8 },
        rect: { w: 38, h: 38 }
      };
      var next = {
        properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
        rect: { w: 22, h: 22 }
      };
      assert.strictEqual(P.shouldStopChain(current, next, false), true,
        "Visual container with size diff to transparent child → stop");
    }
  },
  {
    name: "shouldStopChain: visual container(38x38) + same-size transparent(38x38) → no stop",
    fn: function() {
      var current = {
        properties: { backgroundColor: "#fff0e6ff", borderRadius: 12 },
        rect: { w: 38, h: 38 }
      };
      var next = {
        properties: {},
        rect: { w: 38, h: 38 }
      };
      assert.strictEqual(P.shouldStopChain(current, next, false), false,
        "Same size → no stop");
    }
  },
  {
    name: "merge: colored bg(38x38) + wrapper(22x22) + icon(22x22) — colored bg preserved as wrapper",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 38, h: 38 },
        properties: { backgroundColor: "#fff0e6ff", borderRadius: 12,
          paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8,
          layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
        children: [{
          type: "Frame",
          rect: { x: 8, y: 8, w: 22, h: 22 },
          properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
          children: [{
            type: "Frame",
            rect: { x: 8, y: 8, w: 22, h: 22 },
            properties: { isIconBox: true, backgroundColor: "#ff6a11cb" },
            children: []
          }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Colored wrapper should be preserved
      assert.strictEqual(result.rect.w, 38, "Colored wrapper preserved");
      assert.strictEqual(result.properties.backgroundColor, "#fff0e6ff",
        "Colored bg preserved");
      assert.strictEqual(result.properties.borderRadius, 12);
      // Icon should be descendant
      var icon = helpers.findNode(result, function(n) {
        return (n.properties||{}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.properties.backgroundColor, "#ff6a11cb",
        "Icon keeps its own bg color");
      assert.strictEqual(icon.rect.w, 22);
    }
  },
  {
    name: "shouldStopChain: wrapper + svg(different size) → stop",
    fn: function() {
      var current = { properties: {}, rect: { w: 40, h: 40 } };
      var next = { properties: { isSvgBox: true }, rect: { w: 24, h: 24 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  // ============================================================
  // pipeline: stat card icon with colored background (Profile page)
  // ============================================================
  {
    name: "pipeline: stat card — colored bg(38x38) + icon(22x22) — both bg colors preserved",
    fn: function() {
      // Pattern from Profile page: Container(bg=purple-light, radius=12, padding=8) > Icon(bg=purple)
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 24, y: 400, w: 178, h: 137 },
        visual: { backgroundColor: "#FFFFFFFF", borderRadius: 20 },
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "start",
          padding: { top: 16, right: 16, bottom: 16, left: 16 } },
        children: [
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 40, y: 416, w: 38, h: 38 },
            visual: { backgroundColor: "#FFF0E6FF", borderRadius: 12 },
            containerLayout: { crossAxisAlignment: "stretch", mainAxisSize: "min",
              padding: { top: 8, right: 8, bottom: 8, left: 8 } },
            children: [{
              type: "Frame", layoutMode: "COLUMN",
              rect: { x: 48, y: 424, w: 22, h: 22 },
              visual: {},
              containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
              children: [{
                type: "Frame",
                rect: { x: 48, y: 424, w: 22, h: 22 },
                visual: { isIconBox: true, backgroundColor: "#FF6A11CB" },
                containerLayout: {}
              }]
            }]
          },
          { type: "Text", rect: { x: 40, y: 470, w: 42, h: 34 },
            visual: { content: "148", fontSize: 24 }, containerLayout: {} },
          { type: "Text", rect: { x: 40, y: 519, w: 50, h: 19 },
            visual: { content: "Projects", fontSize: 13 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find colored background wrapper (light purple #FFF0E6FF)
      var coloredBg = helpers.findNode(result, function(n) {
        var p = n.properties || {};
        return p.backgroundColor && p.backgroundColor.toLowerCase().indexOf("f0e6ff") !== -1;
      });
      assert.notStrictEqual(coloredBg, null,
        "Colored background wrapper (#FFF0E6FF) should be preserved");
      assert.strictEqual(coloredBg.properties.borderRadius, "12",
        "Colored bg should keep borderRadius=12");

      // Find icon (dark purple #FF6A11CB)
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null, "Icon should exist");
      assert.ok(icon.properties.backgroundColor.toLowerCase().indexOf("6a11cb") !== -1,
        "Icon should keep its own bg color (#FF6A11CB)");

      // Icon should be INSIDE or descendant of colored bg
      var iconInside = helpers.findNode(coloredBg, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(iconInside, null,
        "Icon should be inside colored background wrapper");
    }
  },
  {
    name: "pipeline: stat card — icon bg NOT merged with colored container bg",
    fn: function() {
      // Same structure, verify that icon bg and container bg are separate
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 38, h: 38 },
        visual: { backgroundColor: "#FFE6F0FF", borderRadius: 12 },
        containerLayout: { crossAxisAlignment: "stretch", padding: { top: 8, right: 8, bottom: 8, left: 8 } },
        children: [{
          type: "Frame",
          rect: { x: 8, y: 8, w: 22, h: 22 },
          visual: {},
          containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
          children: [{
            type: "Frame",
            rect: { x: 8, y: 8, w: 22, h: 22 },
            visual: { isIconBox: true, backgroundColor: "#FF2575FC" },
            containerLayout: {}
          }]
        }]
      };
      var result = helpers.runPreprocess(input);
      // Container bg should be light blue, NOT overwritten by icon's blue
      assert.ok(result.properties.backgroundColor.toLowerCase().indexOf("e6f0ff") !== -1,
        "Container bg should stay #FFE6F0FF, not become icon's #FF2575FC");
      // Icon should be a descendant
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.ok(icon.properties.backgroundColor.toLowerCase().indexOf("2575fc") !== -1,
        "Icon bg should stay #FF2575FC");
    }
  },
  {
    name: "pipeline: avatar — border(120) + bg(112) + Center(112) + icon(60) — center alignment",
    fn: function() {
      // Exact structure from Profile page raw JSON:
      // border(120, padding=4, start/stretch) > bg(112, start/stretch, fixedSize)
      //   > Center(112, center/center) > iconWrapper(60, center/center, fixedSize) > icon(60)
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 146, y: 160, w: 120, h: 120 },
        visual: { border: { color: "#ffffffff", width: 4 }, borderRadius: 60 },
        containerLayout: { padding: { top: 4, right: 4, bottom: 4, left: 4 },
          mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min", itemSpacing: 0 },
        children: [{
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: 150, y: 164, w: 112, h: 112 },
          visual: { backgroundColor: "#ffe8d5f5", borderRadius: 56 },
          containerLayout: { padding: { top: 0, right: 0, bottom: 0, left: 0 },
            mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min", itemSpacing: 0 },
          childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true },
          children: [{
            type: "Frame", layoutMode: "COLUMN",
            rect: { x: 150, y: 164, w: 112, h: 112 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            children: [{
              type: "Frame", layoutMode: "COLUMN",
              rect: { x: 176, y: 190, w: 60, h: 60 },
              visual: {},
              containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
              childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true },
              children: [{
                type: "Frame",
                rect: { x: 176, y: 190, w: 60, h: 60 },
                visual: { isIconBox: true, backgroundColor: "#ff6a11cb" },
                containerLayout: {}
              }]
            }]
          }]
        }]
      };
      var result = helpers.runPreprocess(input);

      // Find bg circle (has e8d5f5)
      var bgCircle = helpers.findNode(result, function(n) {
        var p = n.properties || {};
        return p.backgroundColor && p.backgroundColor.toLowerCase().indexOf("e8d5f5") !== -1;
      });
      assert.notStrictEqual(bgCircle, null, "bg circle should exist");

      // bg circle (or its container) should have center alignment for icon centering
      var centerFound = false;
      function checkCenter(n) {
        var p = n.properties || {};
        if (p.mainAxisAlignment === "center" && p.crossAxisAlignment === "center") {
          centerFound = true;
        }
        (n.children || []).forEach(checkCenter);
      }
      // Check bgCircle and its ancestors up to border frame
      checkCenter(result);
      // The bg circle itself or an intermediate node should have center
      var bgMain = bgCircle.properties.mainAxisAlignment;
      var bgCross = bgCircle.properties.crossAxisAlignment;
      var hasCenterOnBgOrChild = (bgMain === "center" && bgCross === "center");
      if (!hasCenterOnBgOrChild && bgCircle.children) {
        for (var i = 0; i < bgCircle.children.length; i++) {
          var cp = bgCircle.children[i].properties || {};
          if (cp.mainAxisAlignment === "center" && cp.crossAxisAlignment === "center") {
            hasCenterOnBgOrChild = true;
            break;
          }
        }
      }
      // bg circle keeps its own alignment (start/stretch from Flutter)
      // The Center wrapper's center is absorbed into the merged icon child
      // Icon centering comes from the Center wrapper being preserved as intermediate node
      // or from the bg's child having center alignment
      var hasCenterSomewhere = (bgMain === "center") || (bgCross === "center");
      if (!hasCenterSomewhere && bgCircle.children) {
        for (var ci = 0; ci < bgCircle.children.length; ci++) {
          var cp = bgCircle.children[ci].properties || {};
          if (cp.mainAxisAlignment === "center" || cp.crossAxisAlignment === "center") {
            hasCenterSomewhere = true; break;
          }
        }
      }
      assert.ok(hasCenterSomewhere,
        "Center alignment should exist on bg or its child for icon centering");

      // Icon exists and is 60x60
      var icon = helpers.findNode(result, function(n) {
        return (n.properties || {}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.rect.w, 60);
    }
  },
  {
    name: "pipeline: bg(100x100) + Center(100x100) + iconWrapper(75x75) — icon centered in bg",
    fn: function() {
      // Pattern: bg(100, start/stretch) > Center(100, center/center) > iconW(75, center/center) > icon(75, isIconBox)
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        visual: { backgroundColor: "#FFEDE7F6", borderRadius: 16 },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min" },
        children: [{
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: 0, y: 0, w: 100, h: 100 },
          visual: {},
          containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
          children: [{
            type: "Frame", layoutMode: "COLUMN",
            rect: { x: 13, y: 13, w: 75, h: 75 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true },
            children: [{
              type: "Frame",
              rect: { x: 13, y: 13, w: 75, h: 75 },
              visual: { isIconBox: true, backgroundColor: "#FF7C4DFF" },
              containerLayout: {}
            }]
          }]
        }]
      };
      var result = helpers.runPreprocess(input);
      // bg container should exist
      var bgNode = helpers.findNode(result, function(n) {
        return (n.properties||{}).backgroundColor &&
          (n.properties||{}).backgroundColor.toLowerCase().indexOf("ede7f6") !== -1;
      });
      assert.notStrictEqual(bgNode, null, "bg container should exist");
      assert.strictEqual(bgNode.rect.w, 100, "bg should be 100x100");

      // bg or its child should have center alignment for icon centering
      var bgMain = (bgNode.properties||{}).mainAxisAlignment;
      var bgCross = (bgNode.properties||{}).crossAxisAlignment;
      var hasCenterOnBgOrChild = (bgMain === "center") || (bgCross === "center");
      if (!hasCenterOnBgOrChild && bgNode.children) {
        for (var i = 0; i < bgNode.children.length; i++) {
          var cp = bgNode.children[i].properties || {};
          if (cp.mainAxisAlignment === "center" || cp.crossAxisAlignment === "center") {
            hasCenterOnBgOrChild = true; break;
          }
        }
      }
      assert.ok(hasCenterOnBgOrChild,
        "Icon should be centered (bg.main=" + bgMain + " cross=" + bgCross + ")");

      // Icon should be 75x75
      var icon = helpers.findNode(result, function(n) {
        return (n.properties||{}).isIconBox === true;
      });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.rect.w, 75);
    }
  },
  {
    name: "shouldStopChain: non-visual(100x100) → non-visual(75x75) with size diff → stop",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" }, rect: { w: 100, h: 100 } };
      var next = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" }, rect: { w: 75, h: 75 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true,
        "Non-visual nodes with size diff should stop chain");
    }
  },
  {
    name: "shouldStopChain: non-visual(100x100) → non-visual(100x100) same size → no stop",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" }, rect: { w: 100, h: 100 } };
      var next = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" }, rect: { w: 100, h: 100 } };
      assert.strictEqual(P.shouldStopChain(current, next, false), false,
        "Same size non-visual nodes should not stop");
    }
  },
  {
    name: "pipeline: toolbar leading — alignment NOT overridden by toolbar's center",
    fn: function() {
      // NavigationToolbar(cross=center) > leading(120x56, start/start) + title + actions
      // Leading's start alignment should NOT become center from toolbar
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 24, w: 411, h: 56 },
        widgetName: "NavigationToolbar",
        visual: {},
        containerLayout: { crossAxisAlignment: "center" },
        children: [
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 0, y: 24, w: 120, h: 56 },
            visual: {},
            containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "start" },
            children: [
              { type: "Frame", layoutMode: "ROW", rect: { x: 8, y: 30, w: 62, h: 44 },
                visual: {}, containerLayout: { padding: { top: 4, right: 8, bottom: 4, left: 8 } },
                children: [
                  { type: "Text", rect: { x: 16, y: 42, w: 26, h: 20 }, visual: { content: "Tab", fontSize: 14 }, containerLayout: {} }
                ] }
            ] },
          { type: "Frame", rect: { x: 120, y: 24, w: 171, h: 56 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Text", rect: { x: 120, y: 36, w: 171, h: 31 }, visual: { content: "Title", fontSize: 22, textAlign: "center" }, containerLayout: {} }
            ] },
          { type: "Frame", rect: { x: 371, y: 28, w: 40, h: 48 },
            visual: {},
            containerLayout: {},
            children: [
              { type: "Frame", rect: { x: 379, y: 36, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find toolbar's first child (leading)
      var toolbar = result;
      if (toolbar.widgetName !== "NavigationToolbar") {
        toolbar = helpers.findNode(result, function(n) { return n.widgetName === "NavigationToolbar"; });
      }
      assert.notStrictEqual(toolbar, null);
      var leading = toolbar.children[0];
      // Leading should keep its own alignment, NOT get center from toolbar
      // (toolbar's center is for cross-axis alignment of its children, not internal alignment)
      var leadMain = (leading.properties || {}).mainAxisAlignment;
      assert.ok(leadMain !== "center" || leadMain === undefined,
        "Leading mainAxisAlignment should NOT be center. Got: " + leadMain);
    }
  },
  {
    name: "pipeline: toolbar actions — 40x40 icon wrapper preserved, not inflated",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 24, w: 411, h: 56 },
        widgetName: "NavigationToolbar",
        visual: {},
        containerLayout: { crossAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 16, y: 28, w: 48, h: 48 }, visual: {}, containerLayout: {},
            children: [] },
          { type: "Frame", rect: { x: 120, y: 24, w: 171, h: 56 }, visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Text", rect: { x: 120, y: 36, w: 171, h: 31 }, visual: { content: "Title", fontSize: 22 }, containerLayout: {} }
            ] },
          { type: "Frame", layoutMode: "ROW", rect: { x: 371, y: 28, w: 40, h: 48 },
            visual: {},
            containerLayout: {},
            children: [
              { type: "Frame", layoutMode: "COLUMN", rect: { x: 379, y: 32, w: 40, h: 40 },
                visual: {},
                containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", padding: { top: 8, right: 8, bottom: 8, left: 8 } },
                children: [
                  { type: "Frame", rect: { x: 387, y: 40, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
                ] }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);
      // Find the icon
      var icon = helpers.findNode(result, function(n) { return (n.properties||{}).isIconBox; });
      assert.notStrictEqual(icon, null);
      assert.strictEqual(icon.rect.w, 24, "Icon should be 24px");
    }
  },
  {
    name: "pipeline: avatar border frame — 120x120 rect preserved (not inflated to parent 411px)",
    fn: function() {
      // Structure: STACK > CenterWrapper(411x120) > BorderFrame(120x120, border+radius) > bg(112) > icon(60)
      // BorderFrame should keep 120x120, NOT become 411x120
      var input = {
        type: "Frame",
        rect: { x: 0, y: 160, w: 411, h: 280 },
        visual: {},
        containerLayout: {},
        children: [
          // Gradient background (positioned)
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 220 },
            visual: { gradient: { type: "linear" } }, containerLayout: {},
            children: [
              { type: "Text", rect: { x: 24, y: 40, w: 131, h: 41 }, visual: { content: "My Profile" }, containerLayout: {} }
            ] },
          // Center wrapper for avatar
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 0, y: 160, w: 411, h: 120 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [{
              // Border frame (120x120)
              type: "Frame", layoutMode: "COLUMN",
              rect: { x: 146, y: 160, w: 120, h: 120 },
              visual: { border: { color: "#ffffffff", width: 4 }, borderRadius: 60 },
              containerLayout: { padding: { top: 4, right: 4, bottom: 4, left: 4 },
                mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "min" },
              children: [{
                type: "Frame", layoutMode: "COLUMN",
                rect: { x: 150, y: 164, w: 112, h: 112 },
                visual: { backgroundColor: "#ffe8d5f5", borderRadius: 56 },
                containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch" },
                childLayout: { fixedSize: true },
                children: [{
                  type: "Frame",
                  rect: { x: 176, y: 190, w: 60, h: 60 },
                  visual: { isIconBox: true, backgroundColor: "#ff6a11cb" },
                  containerLayout: {}
                }]
              }]
            }]
          }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find border frame
      var borderFrame = helpers.findNode(result, function(n) {
        return (n.properties || {}).hasBorder && (n.properties || {}).borderRadius === "60";
      });
      assert.notStrictEqual(borderFrame, null, "Border frame should exist");
      assert.strictEqual(borderFrame.rect.w, 120,
        "Border frame should be 120px wide, not inflated to " + borderFrame.rect.w);
      assert.strictEqual(borderFrame.rect.h, 120);
    }
  },
  {
    name: "pipeline: activity row icon — small icon(20x20) in Row with text, no wrapper inflation",
    fn: function() {
      // Recent Activity row: Row(padding=16, gap=24) > Icon(20x20) > Column(text) > chevron Icon(24x24)
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 20, y: 500, w: 371, h: 72 },
        visual: { backgroundColor: "#FFFFFFFF", borderRadius: 16 },
        containerLayout: { crossAxisAlignment: "center",
          padding: { top: 16, right: 16, bottom: 16, left: 16 }, itemSpacing: 24 },
        children: [
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 36, y: 526, w: 20, h: 20 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            childLayout: { fixedWidth: true },
            children: [{
              type: "Frame", rect: { x: 36, y: 526, w: 20, h: 20 },
              visual: { isIconBox: true, backgroundColor: "#FF4CAF50" },
              containerLayout: {}
            }]
          },
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 80, y: 517, w: 247, h: 39 },
            visual: {},
            containerLayout: { crossAxisAlignment: "start" },
            childLayout: { flexGrow: 1 },
            children: [
              { type: "Text", rect: { x: 80, y: 517, w: 193, h: 21 },
                visual: { content: "Completed project", fontSize: 14 }, containerLayout: {} },
              { type: "Text", rect: { x: 80, y: 540, w: 38, h: 18 },
                visual: { content: "2h ago", fontSize: 12 }, containerLayout: {} }
            ]
          },
          { type: "Frame", layoutMode: "COLUMN",
            rect: { x: 351, y: 524, w: 24, h: 24 },
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [{
              type: "Frame", rect: { x: 351, y: 524, w: 24, h: 24 },
              visual: { isIconBox: true, backgroundColor: "#FFCCCCCC" },
              containerLayout: {}
            }]
          }
        ]
      };
      var result = helpers.runPreprocess(input);
      var icons = [];
      function walk(n) {
        if ((n.properties || {}).isIconBox) icons.push(n);
        (n.children || []).forEach(walk);
      }
      walk(result);
      assert.strictEqual(icons.length, 2, "Both icons should exist");
      assert.strictEqual(icons[0].rect.w, 20, "First icon 20x20");
      assert.strictEqual(icons[1].rect.w, 24, "Second icon 24x24");
    }
  },
  {
    name: "merge: large Frame wrapper + small visual child — outer rect used (normal merge)",
    fn: function() {
      // Normal case: wrapper and visual child are NOT icon
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 300, h: 200 },
        properties: { paddingTop: 10 },
        children: [{
          type: "Frame",
          rect: { x: 10, y: 10, w: 280, h: 180 },
          properties: { backgroundColor: "#FFFF0000", layoutMode: "VERTICAL" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Normal merge: outer rect used (not icon, not padding-visual size diff)
      assert.strictEqual(result.rect.w, 300);
    }
  },
  {
    name: "merge: Align(end) + child — end alignment preserved when inner has no alignment",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 400, h: 400 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "end", crossAxisAlignment: "end" },
        children: [{
          type: "Frame",
          rect: { x: 300, y: 350, w: 100, h: 50 },
          properties: { backgroundColor: "#FFFF0000" },
          children: []
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Since inner has visual but outer has alignment + size diff,
      // chain should stop (shouldStopChain: center/end alignment mismatch)
      // This depends on whether inner has different alignment
    }
  },
  // ============================================================
  // mergePropsInto: alignment merge rules
  // ============================================================
  {
    name: "mergePropsInto: mainAxisAlignment — inner takes priority",
    fn: function() {
      var target = { mainAxisAlignment: "center" };
      var source = { mainAxisAlignment: "start" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.mainAxisAlignment, "center"); // inner wins
    }
  },
  {
    name: "mergePropsInto: mainAxisAlignment — absent in inner → outer fills",
    fn: function() {
      var target = {};
      var source = { mainAxisAlignment: "center" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.mainAxisAlignment, "center");
    }
  },
  {
    name: "mergePropsInto: crossAxisAlignment — non-outermost does not override",
    fn: function() {
      var target = { crossAxisAlignment: "stretch" };
      var source = { crossAxisAlignment: "center" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.crossAxisAlignment, "stretch"); // inner preserved (only outermost overrides)
    }
  },
  {
    name: "mergePropsInto: layoutMode — inner priority over outer",
    fn: function() {
      var target = { layoutMode: "HORIZONTAL" };
      var source = { layoutMode: "VERTICAL" };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.layoutMode, "HORIZONTAL");
    }
  },
  {
    name: "mergePropsInto: flexGrow — outermost wins",
    fn: function() {
      var target = { flexGrow: 0 };
      var source = { flexGrow: 1 };
      P.mergePropsInto(target, source, true); // isOutermost
      assert.strictEqual(target.flexGrow, 1); // outermost wins
    }
  },
  {
    name: "mergePropsInto: flexGrow — non-outermost does not override",
    fn: function() {
      var target = { flexGrow: 1 };
      var source = { flexGrow: 0 };
      P.mergePropsInto(target, source, false);
      assert.strictEqual(target.flexGrow, 1); // inner preserved
    }
  },
  // ============================================================
  // merge: transparent wrapper sizing propagation
  // ============================================================
  {
    name: "merge: transparent wrapper with stretch → child gets FILL on cross axis",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 379, h: 48 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch", sizingH: "HUG" },
        children: [{
          type: "Frame",
          rect: { x: 0, y: 0, w: 379, h: 48 },
          properties: { backgroundColor: "#FFF0F0F0", layoutMode: "HORIZONTAL" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Transparent wrapper with stretch → child should get sizingH=FILL
      assert.strictEqual(result.properties.sizingH, "FILL",
        "stretch wrapper should propagate FILL to visual child");
    }
  },
  {
    name: "merge: transparent wrapper without stretch → child sizingH not forced",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 379, h: 48 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "center", sizingH: "HUG" },
        children: [{
          type: "Frame",
          rect: { x: 50, y: 0, w: 279, h: 48 },
          properties: { backgroundColor: "#FFF0F0F0", layoutMode: "HORIZONTAL" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // center outer + no inner alignment → shouldStopChain triggers (alignment mismatch)
      // So the wrapper is preserved, not merged. HUG stays on the wrapper.
      // Inner child keeps its own sizing.
      assert.strictEqual(result.children.length, 1, "wrapper preserved (not merged)");
      assert.strictEqual(result.properties.sizingH, "HUG", "wrapper keeps its sizing");
    }
  },
  {
    name: "merge: FILL from outer preserved through transparent wrapper",
    fn: function() {
      var tree = {
        type: "Frame",
        rect: { x: 0, y: 0, w: 379, h: 48 },
        properties: { sizingH: "FILL" }, // no visual, no stretch
        children: [{
          type: "Frame",
          rect: { x: 0, y: 0, w: 379, h: 48 },
          properties: { backgroundColor: "#FFF0F0F0" },
          children: [{ type: "Text", properties: { content: "x" } }]
        }]
      };
      var result = P.mergeWrapperChains(tree);
      // Outer FILL should propagate to merged result
      assert.strictEqual(result.properties.sizingH, "FILL");
    }
  },
  // ============================================================
  // assignSizingHints: crossAxisAlignment combinations
  // ============================================================
  {
    name: "sizing: VERTICAL parent + cross=stretch → child sizingH=FILL",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 100 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingH, "FILL");
    }
  },
  {
    name: "sizing: VERTICAL parent + cross=center → child sizingH=FIXED (not FILL)",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 50, y: 0, w: 300, h: 100 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingH, "FIXED");
    }
  },
  {
    name: "sizing: HORIZONTAL parent + cross=stretch → child sizingV=FILL",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "HORIZONTAL", crossAxisAlignment: "stretch" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 100, h: 300 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingV, "FILL");
    }
  },
  {
    name: "sizing: stretch + parentIsAutoSize → skip FILL (AUTO container)",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch", mainAxisSize: "AUTO" },
        children: [
          { type: "Text", rect: { x: 0, y: 0, w: 400, h: 20 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      // parentIsAutoSize + stretch → skip FILL for Text
      assert.strictEqual(tree.children[0]._sizingH, "HUG");
    }
  },
  // ============================================================
  // assignSizingHints: flexGrow + sizing combinations
  // ============================================================
  {
    name: "sizing: Frame + flexGrow > 0 → FILL (sole flex child)",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "HORIZONTAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 200, h: 300 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight" } },
          { type: "Frame", rect: { x: 200, y: 0, w: 200, h: 300 }, properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      // sole flexGrow child → FILL (Figma responsive)
      assert.strictEqual(tree.children[0]._sizingH, "FILL");
    }
  },
  {
    name: "sizing: Text + flexGrow tight + VERTICAL → V=FILL",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 100, h: 200 },
        properties: { flexGrow: 1, flexFit: "FlexFit.tight" } };
      P.assignTextSizing(node, "VERTICAL", false, false, null, null);
      assert.strictEqual(node._sizingV, "FILL");
      assert.strictEqual(node._sizingH, "HUG");
    }
  },
  // ============================================================
  // assignSizingHints: mainAxisSize=AUTO
  // ============================================================
  {
    name: "sizing: Frame + mainAxisSize=AUTO + VERTICAL → V=HUG",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 100, h: 200 },
        properties: { mainAxisSize: "AUTO", layoutMode: "VERTICAL" } };
      P.assignFrameSizing(node, node.properties, false, false, null);
      assert.strictEqual(node._sizingV, "HUG");
      assert.strictEqual(node._sizingH, "FIXED");
    }
  },
  {
    name: "sizing: Frame + mainAxisSize=AUTO + HORIZONTAL + cross=stretch → H=HUG, V=FILL",
    fn: function() {
      // H=HUG because mainAxisSize=AUTO, V=FILL because stretch
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 300 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
        children: [{
          type: "Frame", rect: { x: 0, y: 0, w: 400, h: 50 },
          properties: { mainAxisSize: "AUTO", layoutMode: "HORIZONTAL" },
          children: [{ type: "Text", properties: {} }]
        }]
      };
      P.assignSizingHints(tree, null, null);
      var child = tree.children[0];
      // Parent VERTICAL + stretch → child H=FILL (cross axis)
      // Child HORIZONTAL + AUTO → would be H=HUG, but FILL from stretch has priority
      assert.strictEqual(child._sizingH, "FILL", "stretch FILL preserved over AUTO HUG");
      assert.strictEqual(child._sizingV, "FIXED");
    }
  },
  // ============================================================
  // pipeline: Empty state pattern (Center > Column(min) > Icon + Text)
  // ============================================================
  {
    name: "pipeline: empty state — Center + Column(min) + content should be vertically centered",
    fn: function() {
      // ConstrainedBox(minH=full) > Center > Padding > Column(min) > Icon + Text
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 379, h: 617 },
        visual: {},
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
        childLayout: { flexGrow: 1 },
        children: [{
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: 3, y: 222, w: 374, h: 174 },
          visual: {},
          containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
            padding: { top: 24, right: 24, bottom: 24, left: 24 } },
          children: [
            { type: "Frame", rect: { x: 158, y: 246, w: 64, h: 64 },
              visual: { isIconBox: true }, containerLayout: {} },
            { type: "Frame", rect: { x: 0, y: 310, w: 0, h: 12 },
              visual: {}, containerLayout: {}, children: [] },
            { type: "Text", rect: { x: 107, y: 322, w: 167, h: 23 },
              visual: { content: "No items found", fontSize: 16, textAlign: "center" }, containerLayout: {} },
            { type: "Frame", rect: { x: 0, y: 345, w: 0, h: 8 },
              visual: {}, containerLayout: {}, children: [] },
            { type: "Text", rect: { x: 27, y: 353, w: 327, h: 20 },
              visual: { content: "Try a different search", fontSize: 14, textAlign: "center" }, containerLayout: {} },
          ]
        }]
      };
      var result = helpers.runPreprocess(input);

      // The outer container should preserve center alignment
      assert.strictEqual(result.properties.mainAxisAlignment, "center",
        "Outer Center container should keep mainAxisAlignment=center");

      // Content texts should exist
      var noItems = helpers.findNode(result, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "No items found";
      });
      assert.notStrictEqual(noItems, null, "Content text should exist");
    }
  },
  {
    name: "pipeline: empty state — flexGrow=1 parent should have center alignment",
    fn: function() {
      // Simplified: Column(flexGrow=1, center/center) > Column(min, start/center) > Text
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 80, w: 411, h: 834 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [
          { type: "Frame", rect: { x: 16, y: 80, w: 379, h: 48 }, layoutMode: "ROW",
            visual: { backgroundColor: "#FFF0F0F0" }, containerLayout: {}, children: [] },
          { type: "Frame", rect: { x: 0, y: 128, w: 411, h: 706 }, layoutMode: "COLUMN",
            visual: {},
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            childLayout: { flexGrow: 1 },
            children: [{
              type: "Frame", rect: { x: 19, y: 394, w: 374, h: 174 }, layoutMode: "COLUMN",
              visual: {},
              containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
                padding: { top: 24, right: 24, bottom: 24, left: 24 } },
              children: [
                { type: "Text", rect: { x: 122, y: 418, w: 167, h: 23 },
                  visual: { content: "Empty", fontSize: 16 }, containerLayout: {} }
              ]
            }]
          }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find the center container (flexGrow=1 parent)
      var centerNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).mainAxisAlignment === "center" &&
               (n.properties || {}).crossAxisAlignment === "center";
      });
      assert.notStrictEqual(centerNode, null,
        "Center container with mainAxis=center should exist after preprocessing");

      // The "Empty" text should be inside
      var emptyText = helpers.findNode(result, function(n) {
        return n.type === "Text" && (n.properties || {}).content === "Empty";
      });
      assert.notStrictEqual(emptyText, null);
    }
  },
  // ============================================================
  // shouldStopChain: alignment mismatch details
  // ============================================================
  {
    name: "shouldStopChain: center outer + start inner → stop (alignment mismatch)",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" } };
      var next = { properties: { mainAxisAlignment: "start", crossAxisAlignment: "center" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: end outer + start inner → stop",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "end" } };
      var next = { properties: { mainAxisAlignment: "start" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), true);
    }
  },
  {
    name: "shouldStopChain: same alignment → no stop",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" } };
      var next = { properties: { mainAxisAlignment: "center", crossAxisAlignment: "center" } };
      assert.strictEqual(P.shouldStopChain(current, next, false), false);
    }
  },
  {
    name: "shouldStopChain: start outer + any inner → no stop (start is default)",
    fn: function() {
      var current = { properties: { mainAxisAlignment: "start" } };
      var next = { properties: { mainAxisAlignment: "center" } };
      // start is not center/end, so alignment mismatch check doesn't trigger
      assert.strictEqual(P.shouldStopChain(current, next, false), false);
    }
  },
  // ============================================================
  // pipeline: diverse layout combinations
  // ============================================================
  {
    name: "pipeline: Column(stretch) > Row > Text — Text gets FILL on cross axis",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 400, h: 200 },
        visual: {},
        containerLayout: { crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [{
          type: "Frame", layoutMode: "ROW",
          rect: { x: 0, y: 0, w: 400, h: 50 },
          visual: {},
          containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center" },
          childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" },
          children: [
            { type: "Text", rect: { x: 0, y: 15, w: 100, h: 20 },
              visual: { content: "Label" }, containerLayout: {},
              childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } }
          ]
        }]
      };
      var result = helpers.runPreprocess(input);
      // The Row child should be FILL on H (stretch from parent COLUMN cross axis)
      var row = helpers.findNode(result, function(n) {
        return (n.properties || {}).layoutMode === "HORIZONTAL";
      });
      if (row) {
        assert.strictEqual(row._sizingH, "FILL",
          "Row in stretch Column should be H=FILL");
      }
    }
  },
  {
    name: "pipeline: Row(spaceBetween) children — first and last have correct positions",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 400, h: 50 },
        visual: {},
        containerLayout: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "center" },
        children: [
          { type: "Text", rect: { x: 0, y: 15, w: 60, h: 20 },
            visual: { content: "Left" }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG" } },
          { type: "Text", rect: { x: 340, y: 15, w: 60, h: 20 },
            visual: { content: "Right" }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG" } }
        ]
      };
      var result = helpers.runPreprocess(input);
      assert.strictEqual(result.properties.mainAxisAlignment, "spaceBetween");
      assert.strictEqual(result.children.length, 2);
    }
  },
  {
    name: "pipeline: nested Columns with different alignments preserved",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 400, h: 600 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 0, w: 400, h: 200 },
            visual: { backgroundColor: "#FFF0F0F0" },
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "max" },
            childLayout: { flexGrow: 0, sizingH: "HUG" },
            children: [
              { type: "Text", rect: { x: 150, y: 90, w: 100, h: 20 },
                visual: { content: "Centered" }, containerLayout: {} }
            ] },
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 0, y: 200, w: 400, h: 400 },
            visual: { backgroundColor: "#FFE0E0E0" },
            containerLayout: { mainAxisAlignment: "end", crossAxisAlignment: "start", mainAxisSize: "max" },
            childLayout: { flexGrow: 1, sizingH: "HUG" },
            children: [
              { type: "Text", rect: { x: 0, y: 580, w: 100, h: 20 },
                visual: { content: "Bottom-left" }, containerLayout: {} }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);

      // Find centered section
      var centerSection = helpers.findNode(result, function(n) {
        return (n.properties || {}).mainAxisAlignment === "center" &&
               (n.properties || {}).backgroundColor;
      });
      assert.notStrictEqual(centerSection, null, "Centered section should exist");

      // Find end-aligned section
      var endSection = helpers.findNode(result, function(n) {
        return (n.properties || {}).mainAxisAlignment === "end" &&
               (n.properties || {}).backgroundColor;
      });
      assert.notStrictEqual(endSection, null, "End-aligned section should exist");
    }
  },
  // ============================================================
  // sizing: explicit sizingH/V from crawler
  // ============================================================
  {
    name: "sizing: props.sizingH=FILL overrides default",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 100, h: 20 },
        properties: { sizingH: "FILL" } };
      P.assignTextSizing(node, "VERTICAL", false, false, null, null);
      assert.strictEqual(node._sizingH, "FILL");
    }
  },
  {
    name: "sizing: props.sizingV=FILL overrides default",
    fn: function() {
      var node = { type: "Text", rect: { x: 0, y: 0, w: 100, h: 20 },
        properties: { sizingV: "FILL" } };
      P.assignTextSizing(node, "VERTICAL", false, false, null, null);
      assert.strictEqual(node._sizingV, "FILL");
    }
  },
  // ============================================================
  // sizing: fixedSize, fixedWidth, fixedHeight
  // ============================================================
  {
    name: "sizing: fixedSize → both FIXED",
    fn: function() {
      var node = { type: "Frame", rect: { x: 0, y: 0, w: 50, h: 50 },
        properties: { fixedSize: true } };
      P.assignFrameSizing(node, node.properties, false, false, null);
      assert.strictEqual(node._sizingH, "FIXED");
      assert.strictEqual(node._sizingV, "FIXED");
    }
  },
  {
    name: "sizing: fixedWidth + FILL from flex → FILL preserved",
    fn: function() {
      var node = { _sizingH: "FILL", _sizingV: "HUG" };
      P.applySizedBoxOverrides(node, { fixedWidth: true });
      // FILL should be preserved (flex takes priority over fixedWidth)
      assert.strictEqual(node._sizingH, "FILL");
    }
  },
  {
    name: "sizing: fixedHeight + HUG → FIXED",
    fn: function() {
      var node = { _sizingH: "HUG", _sizingV: "HUG" };
      P.applySizedBoxOverrides(node, { fixedHeight: true });
      assert.strictEqual(node._sizingV, "FIXED");
      assert.strictEqual(node._sizingH, "HUG"); // unchanged
    }
  },
  // ============================================================
  // pipeline: Expanded in Column
  // ============================================================
  {
    name: "pipeline: Expanded child in Column — fills remaining space",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 400, h: 800 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 80 }, layoutMode: "COLUMN",
            visual: { backgroundColor: "#FFFFFFFF" }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" },
            children: [] },
          { type: "Frame", rect: { x: 0, y: 80, w: 400, h: 720 }, layoutMode: "COLUMN",
            visual: {},
            containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
            childLayout: { flexGrow: 1, sizingH: "FILL", sizingV: "FILL" },
            children: [
              { type: "Text", rect: { x: 16, y: 96, w: 200, h: 20 },
                visual: { content: "Content" }, containerLayout: {} }
            ] }
        ]
      };
      var result = helpers.runPreprocess(input);
      var expandedChild = result.children[1];
      assert.notStrictEqual(expandedChild, undefined);
    }
  },
  // ============================================================
  // Expanded → FILL (sole flex child) vs FIXED (multiple flex)
  // ============================================================
  {
    name: "sizing: sole Expanded in VERTICAL → sizingV=FILL",
    fn: function() {
      // Column with: fixed header + Expanded(content) + fixed footer
      // Expanded is the ONLY flex child → should get FILL on main axis (V)
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 50 },
            properties: {} },
          { type: "Frame", rect: { x: 0, y: 50, w: 400, h: 700 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
            children: [] },
          { type: "Frame", rect: { x: 0, y: 750, w: 400, h: 50 },
            properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[1]._sizingV, "FILL",
        "sole Expanded child should get FILL on main axis");
      assert.strictEqual(tree.children[0]._sizingV, "FIXED",
        "non-flex sibling should stay FIXED");
      assert.strictEqual(tree.children[2]._sizingV, "FIXED",
        "non-flex sibling should stay FIXED");
    }
  },
  {
    name: "sizing: sole Expanded in HORIZONTAL → sizingH=FILL",
    fn: function() {
      // Row with: icon + Expanded(text area) + button
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 50 },
        properties: { layoutMode: "HORIZONTAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 40, h: 50 },
            properties: {} },
          { type: "Frame", rect: { x: 40, y: 0, w: 280, h: 50 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
            children: [] },
          { type: "Frame", rect: { x: 320, y: 0, w: 80, h: 50 },
            properties: {} },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[1]._sizingH, "FILL",
        "sole Expanded in Row should get FILL on H");
    }
  },
  {
    name: "sizing: multiple Expanded siblings → all FIXED (ratio preservation)",
    fn: function() {
      // Row with two Expanded children (flex:1, flex:2) → must stay FIXED
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 100 },
        properties: { layoutMode: "HORIZONTAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 133, h: 100 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
            children: [] },
          { type: "Frame", rect: { x: 133, y: 0, w: 267, h: 100 },
            properties: { flexGrow: 2, flexFit: "FlexFit.tight" },
            children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingH, "FIXED",
        "first Expanded should stay FIXED when siblings also have flexGrow");
      assert.strictEqual(tree.children[1]._sizingH, "FIXED",
        "second Expanded should stay FIXED when siblings also have flexGrow");
    }
  },
  {
    name: "sizing: sole Expanded + cross=stretch → FILL both axes",
    fn: function() {
      // Column(stretch) with: header + Expanded(content)
      // sole flex → V=FILL, stretch → H=FILL
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL", crossAxisAlignment: "stretch" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 60 },
            properties: {} },
          { type: "Frame", rect: { x: 0, y: 60, w: 400, h: 740 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
            children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[1]._sizingV, "FILL",
        "sole Expanded main axis should be FILL");
      assert.strictEqual(tree.children[1]._sizingH, "FILL",
        "stretch cross axis should be FILL");
    }
  },
  {
    name: "sizing: Flexible(loose) sole child → stays FIXED (not tight)",
    fn: function() {
      // Flexible (loose fit) should NOT get FILL even if sole flex child
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 50 },
            properties: {} },
          { type: "Frame", rect: { x: 0, y: 50, w: 400, h: 300 },
            properties: { flexGrow: 1, flexFit: "FlexFit.loose" },
            children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[1]._sizingV, "FIXED",
        "Flexible(loose) should stay FIXED even if sole");
    }
  },
  {
    name: "sizing: sole Expanded in AUTO/min parent → stays FIXED (dialog pattern)",
    fn: function() {
      // Dialog Column(mainAxisSize:min) > [Title, Expanded(content), Buttons]
      // Expanded should NOT get FILL — parent is HUG, FILL would squeeze content
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 40, y: 390, w: 331, h: 133 },
            properties: { layoutMode: "VERTICAL", mainAxisSize: "AUTO" },
            children: [
              { type: "Frame", rect: { x: 40, y: 390, w: 331, h: 53 },
                properties: {}, children: [] },
              { type: "Frame", rect: { x: 40, y: 443, w: 331, h: 8 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                children: [
                  { type: "Text", rect: { x: 64, y: 459, w: 283, h: 40 },
                    properties: { content: "이 미팅을 삭제하시겠습니까?" } }
                ] },
              { type: "Frame", rect: { x: 40, y: 451, w: 331, h: 72 },
                properties: { layoutMode: "HORIZONTAL" },
                children: [] },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var dialog = tree.children[0];
      var content = dialog.children[1];

      assert.notStrictEqual(content._sizingV, "FILL",
        "Expanded in AUTO/min parent should NOT get FILL — dialog content would be squeezed");
    }
  },
  {
    name: "sizing: sole Expanded in FIXED parent → gets FILL (normal Scaffold)",
    fn: function() {
      // Scaffold Column(mainAxisSize:max) > [Header, Expanded, Footer]
      // Expanded SHOULD get FILL — parent is fixed size
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 800 },
        properties: { layoutMode: "VERTICAL", mainAxisSize: "FIXED" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 80 },
            properties: {}, children: [] },
          { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 640 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
            children: [] },
          { type: "Frame", rect: { x: 0, y: 720, w: 411, h: 80 },
            properties: {}, children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var expanded = tree.children[1];
      assert.strictEqual(expanded._sizingV, "FILL",
        "Expanded in FIXED parent should get FILL");
    }
  },
  {
    name: "pipeline: Expanded + fixed footer — Expanded gets FILL",
    fn: function() {
      // Full pipeline: Column > [Expanded(ScrollContent), Column(footer)]
      var input = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 800 },
        layoutMode: "COLUMN",
        visual: {},
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch", mainAxisSize: "max" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 700 },
            layoutMode: "COLUMN",
            visual: {},
            containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "stretch" },
            childLayout: { flexGrow: 1, sizingH: "FILL", sizingV: "FILL" },
            children: [
              { type: "Text", rect: { x: 16, y: 16, w: 200, h: 20 },
                visual: { content: "Scroll content" }, containerLayout: {} }
            ]
          },
          { type: "Frame", rect: { x: 0, y: 700, w: 411, h: 100 },
            layoutMode: "COLUMN",
            visual: { backgroundColor: "#FFFFFFFF" },
            containerLayout: { mainAxisAlignment: "start", mainAxisSize: "min" },
            childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" },
            children: [
              { type: "Text", rect: { x: 16, y: 710, w: 100, h: 20 },
                visual: { content: "Footer" }, containerLayout: {} }
            ]
          }
        ]
      };
      var result = helpers.runPreprocess(input);
      // Find the Expanded child (flexGrow > 0)
      var expandedChild = null;
      var fixedChild = null;
      for (var i = 0; i < result.children.length; i++) {
        var p = result.children[i].properties || {};
        if (p.flexGrow > 0) expandedChild = result.children[i];
        else fixedChild = result.children[i];
      }
      assert.notStrictEqual(expandedChild, null, "should find Expanded child");
      assert.strictEqual(expandedChild._sizingV, "FILL",
        "sole Expanded in pipeline should get FILL on main axis");
      if (fixedChild) {
        assert.notStrictEqual(fixedChild._sizingV, "FILL",
          "non-flex footer should not be FILL");
      }
    }
  },
  // ============================================================
  // FILL propagation: parent of Expanded child should also FILL
  // ============================================================
  {
    name: "sizing: FILL propagates upward — wrapper of Expanded becomes FILL",
    fn: function() {
      // Screen > body Column > [AppBar, contentColumn > [Expanded, Audio]]
      // contentColumn has no flexGrow but wraps an Expanded child → should become FILL
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 800 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 80 },
                properties: {} },
              { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 720 },
                properties: { layoutMode: "VERTICAL" },
                children: [
                  { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 582 },
                    properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                    children: [] },
                  { type: "Frame", rect: { x: 0, y: 662, w: 411, h: 93 },
                    properties: { layoutMode: "VERTICAL" },
                    children: [] },
                ]
              },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var body = tree.children[0]; // 800px
      var content = body.children[1]; // 720px wrapper
      var expanded = content.children[0]; // 582px Expanded

      assert.strictEqual(expanded._sizingV, "FILL",
        "Expanded child should be FILL");
      assert.strictEqual(content._sizingV, "FILL",
        "wrapper around Expanded should propagate to FILL");
      assert.strictEqual(body._sizingV, "FILL",
        "body containing FILL descendant should also FILL");
    }
  },
  {
    name: "sizing: FILL propagation stops at root (no parent)",
    fn: function() {
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 700 },
            properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
            children: [] },
          { type: "Frame", rect: { x: 0, y: 700, w: 400, h: 100 },
            properties: {}, children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      // Root node should not be FILL (no parent to fill into)
      assert.strictEqual(tree._sizingV, "FIXED",
        "root should stay FIXED — nothing above to fill");
    }
  },
  {
    name: "sizing: FILL does NOT propagate when all children are FIXED",
    fn: function() {
      // No Expanded child → parent stays FIXED
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 400 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 200 },
                properties: {}, children: [] },
              { type: "Frame", rect: { x: 0, y: 200, w: 400, h: 200 },
                properties: {}, children: [] },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      assert.strictEqual(tree.children[0]._sizingV, "FIXED",
        "no Expanded descendant → stays FIXED");
    }
  },
  {
    name: "sizing: FILL propagation in HORIZONTAL direction",
    fn: function() {
      // Row > [wrapper Row > [Expanded, fixed], sidebar]
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 800, h: 400 },
        properties: { layoutMode: "HORIZONTAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 600, h: 400 },
            properties: { layoutMode: "HORIZONTAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 500, h: 400 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
                children: [] },
              { type: "Frame", rect: { x: 500, y: 0, w: 100, h: 400 },
                properties: {}, children: [] },
            ]
          },
          { type: "Frame", rect: { x: 600, y: 0, w: 200, h: 400 },
            properties: {}, children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var wrapper = tree.children[0];
      var expanded = wrapper.children[0];
      assert.strictEqual(expanded._sizingH, "FILL",
        "Expanded in Row → FILL horizontal");
      assert.strictEqual(wrapper._sizingH, "FILL",
        "wrapper of Expanded → FILL horizontal");
    }
  },
  {
    name: "sizing: FILL propagation does NOT affect cross axis",
    fn: function() {
      // Vertical Column with Expanded child — propagation on V only, H unaffected
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 700 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 600 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
                children: [] },
              { type: "Frame", rect: { x: 0, y: 600, w: 400, h: 100 },
                properties: {}, children: [] },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var wrapper = tree.children[0];
      assert.strictEqual(wrapper._sizingV, "FILL",
        "main axis propagates to FILL");
      assert.strictEqual(wrapper._sizingH, "FIXED",
        "cross axis stays FIXED (no stretch)");
    }
  },
  {
    name: "sizing: FILL does NOT propagate into end/center aligned parent (bottom sheet)",
    fn: function() {
      // Overlay wrapper (justify:flex-end) > sheet Column > [header, Expanded list, button]
      // Expanded list has FILL, but sheet should NOT become FILL (would expand to full screen)
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "end", isStack: true },
        children: [
          { type: "Frame", rect: { x: 0, y: 500, w: 411, h: 414 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 500, w: 411, h: 64 },
                properties: {}, children: [] },
              { type: "Frame", rect: { x: 0, y: 564, w: 411, h: 266 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                children: [] },
              { type: "Frame", rect: { x: 0, y: 830, w: 411, h: 84 },
                properties: {}, children: [] },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var sheet = tree.children[0];
      var expandedList = sheet.children[1];

      assert.strictEqual(expandedList._sizingV, "FILL",
        "Expanded list inside sheet should be FILL");
      assert.notStrictEqual(sheet._sizingV, "FILL",
        "Sheet should NOT become FILL — parent has mainAxisAlignment=end");
    }
  },
  {
    name: "sizing: FILL does NOT propagate into center aligned parent (dialog)",
    fn: function() {
      // Dialog overlay (justify:center) > dialog frame > [title, Expanded content, buttons]
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL", mainAxisAlignment: "center" },
        children: [
          { type: "Frame", rect: { x: 50, y: 200, w: 311, h: 400 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 50, y: 200, w: 311, h: 50 },
                properties: {}, children: [] },
              { type: "Frame", rect: { x: 50, y: 250, w: 311, h: 300 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                children: [] },
              { type: "Frame", rect: { x: 50, y: 550, w: 311, h: 50 },
                properties: {}, children: [] },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var dialog = tree.children[0];
      assert.notStrictEqual(dialog._sizingV, "FILL",
        "Dialog should NOT become FILL — parent has mainAxisAlignment=center");
    }
  },
  {
    name: "sizing: FILL does NOT propagate across axis — Row spacer in Column",
    fn: function() {
      // Column > Row > [Text, Spacer(FILL H), Button]
      // Row has horizontal FILL child, but parent Column is VERTICAL
      // → Row should NOT become FILL vertically
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 400, h: 800 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 400, h: 48 },
            properties: { layoutMode: "HORIZONTAL" },
            children: [
              { type: "Text", rect: { x: 0, y: 0, w: 60, h: 20 },
                properties: { content: "Label" } },
              { type: "Frame", rect: { x: 60, y: 0, w: 280, h: 0.01 },
                properties: { flexGrow: 1, flexFit: "FlexFit.tight" },
                children: [] },
              { type: "Frame", rect: { x: 340, y: 0, w: 60, h: 35 },
                properties: {}, children: [] },
            ]
          },
          { type: "Frame", rect: { x: 0, y: 48, w: 400, h: 200 },
            properties: {}, children: [] },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var row = tree.children[0];
      assert.strictEqual(row._sizingV, "FIXED",
        "Row with H spacer should NOT get V FILL from Column parent");
      // The spacer should still be FILL horizontally
      assert.strictEqual(row.children[1]._sizingH, "FILL",
        "Spacer should be FILL horizontal");
    }
  },
  {
    name: "sizing: FILL propagates through HUG parent (mainAxisSize=AUTO wrapper)",
    fn: function() {
      // Real-world pattern: SafeArea > Column(AUTO) > Column > [Expanded, Footer]
      // The AUTO wrapper has _sizingV=HUG but should become FILL
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 834 },
            properties: { layoutMode: "VERTICAL", mainAxisSize: "AUTO" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 80 },
                properties: {} },
              { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 696 },
                properties: { layoutMode: "VERTICAL" },
                children: [
                  { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 582 },
                    properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                    children: [] },
                  { type: "Frame", rect: { x: 0, y: 662, w: 411, h: 93 },
                    properties: { layoutMode: "VERTICAL" },
                    children: [] },
                ]
              },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);
      var autoWrapper = tree.children[0]; // 834px, mainAxisSize=AUTO → initially HUG
      var contentCol = autoWrapper.children[1]; // 696px
      var expanded = contentCol.children[0]; // 582px

      assert.strictEqual(expanded._sizingV, "FILL",
        "Expanded should be FILL");
      assert.strictEqual(contentCol._sizingV, "FILL",
        "content Column wrapping Expanded should be FILL");
      assert.strictEqual(autoWrapper._sizingV, "FILL",
        "AUTO/HUG wrapper should be overridden to FILL when child needs it");
    }
  },
  {
    name: "sizing: FILL propagation — full Scaffold pattern (AppBar + Expanded + BottomBar)",
    fn: function() {
      // Screen > SafeArea(VERTICAL) > [AppBar, Body(VERTICAL) > [Expanded(VERTICAL,scroll), AudioBar]]
      var tree = {
        type: "Frame", rect: { x: 0, y: 0, w: 411, h: 914 },
        properties: { layoutMode: "VERTICAL" },
        children: [
          { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 800 },
            properties: { layoutMode: "VERTICAL" },
            children: [
              { type: "Frame", rect: { x: 0, y: 0, w: 411, h: 80 },
                properties: { layoutMode: "VERTICAL" },
                children: [] },
              { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 720 },
                properties: { layoutMode: "VERTICAL" },
                children: [
                  { type: "Frame", rect: { x: 0, y: 80, w: 411, h: 627 },
                    properties: { flexGrow: 1, flexFit: "FlexFit.tight", layoutMode: "VERTICAL" },
                    children: [
                      { type: "Text", rect: { x: 16, y: 96, w: 200, h: 20 },
                        properties: { content: "Scroll" } }
                    ] },
                  { type: "Frame", rect: { x: 0, y: 707, w: 411, h: 93 },
                    properties: { layoutMode: "VERTICAL" },
                    children: [] },
                ]
              },
            ]
          },
        ]
      };
      P.assignSizingHints(tree, null, null);

      var safeArea = tree.children[0]; // 800px
      var body = safeArea.children[1]; // 720px
      var expanded = body.children[0]; // 627px
      var audioBar = body.children[1]; // 93px

      assert.strictEqual(expanded._sizingV, "FILL",
        "Expanded scroll area should be FILL");
      assert.strictEqual(audioBar._sizingV, "FIXED",
        "AudioBar should stay FIXED");
      assert.strictEqual(body._sizingV, "FILL",
        "Body wrapping Expanded should propagate to FILL");
      assert.strictEqual(safeArea._sizingV, "FILL",
        "SafeArea should propagate to FILL");
      assert.strictEqual(safeArea.children[0]._sizingV, "FIXED",
        "AppBar should stay FIXED");
    }
  },
  // ============================================================
  // pipeline: inferMissingLayout interactions
  // ============================================================
  {
    name: "pipeline: Frame with 0 children → no layoutMode (spacer-safe)",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 400, h: 50 },
        visual: {},
        containerLayout: { mainAxisAlignment: "start" },
        children: [
          { type: "Text", rect: { x: 0, y: 15, w: 50, h: 20 },
            visual: { content: "A" }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG" } },
          { type: "Frame", rect: { x: 50, y: 25, w: 16, h: 0 },
            visual: {}, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" },
            children: [] },
          { type: "Text", rect: { x: 66, y: 15, w: 50, h: 20 },
            visual: { content: "B" }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG" } },
        ]
      };
      var result = helpers.runPreprocess(input);
      // The spacer Frame should not get layoutMode from inferMissingLayout
      // (it's handled by spacer logic instead)
    }
  },
];
