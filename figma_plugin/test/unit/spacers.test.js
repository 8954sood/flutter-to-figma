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
    name: "isSpacer: layout-only props (sizingH/sizingV/flexGrow) → still true",
    fn: function() {
      var child = { type: "Frame",
        properties: { sizingH: "HUG", sizingV: "HUG", flexGrow: 0 },
        rect: { w: 8, h: 0 }, children: [] };
      assert.strictEqual(P.isSpacer(child, "HORIZONTAL"), true);
    }
  },
  {
    name: "isSpacer: non-empty props (visual) → false",
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
  // ============================================================
  // convertSpacersToItemSpacing: uniform vs mixed
  // ============================================================
  {
    name: "convertSpacersToItemSpacing: uniform spacers between all → itemSpacing + spacers removed",
    fn: function() {
      // [Text, Spacer(12), Text, Spacer(12), Text]
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 300, h: 40 },
        children: [
          { type: "Text", properties: { content: "A" }, rect: { x: 0, y: 10, w: 60, h: 20 } },
          { type: "Frame", properties: {}, rect: { x: 60, y: 20, w: 12, h: 0 }, children: [] },
          { type: "Text", properties: { content: "B" }, rect: { x: 72, y: 10, w: 60, h: 20 } },
          { type: "Frame", properties: {}, rect: { x: 132, y: 20, w: 12, h: 0 }, children: [] },
          { type: "Text", properties: { content: "C" }, rect: { x: 144, y: 10, w: 60, h: 20 } },
        ]
      };
      P.convertSpacersToItemSpacing(node);
      assert.strictEqual(node.properties.itemSpacing, 12);
      assert.strictEqual(node.children.length, 3); // spacers removed
      assert.strictEqual(node.children[0].properties.content, "A");
      assert.strictEqual(node.children[1].properties.content, "B");
      assert.strictEqual(node.children[2].properties.content, "C");
    }
  },
  {
    name: "convertSpacersToItemSpacing: mixed gaps (flexGrow + SizedBox) → spacers preserved",
    fn: function() {
      // [Text, Icon, FlexSpacer, Text, SizedBox(8), Bar, SizedBox(8), Text]
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 371, h: 53 },
        children: [
          { type: "Text", properties: { content: "Mon" }, rect: { x: 21, y: 16, w: 40, h: 21 } },
          { type: "Frame", properties: { isIconBox: true }, rect: { x: 69, y: 15, w: 22, h: 22 } },
          { type: "Frame", properties: { flexGrow: 1 }, rect: { x: 99, y: 26, w: 121, h: 0.01 }, children: [] },
          { type: "Text", properties: { content: "24" }, rect: { x: 224, y: 15, w: 25, h: 23 } },
          { type: "Frame", properties: {}, rect: { x: 250, y: 24, w: 8, h: 0 }, children: [] },
          { type: "Frame", properties: { borderRadius: 2 }, rect: { x: 258, y: 24, w: 80, h: 4 } },
          { type: "Frame", properties: {}, rect: { x: 338, y: 24, w: 8, h: 0 }, children: [] },
          { type: "Text", properties: { content: "16" }, rect: { x: 346, y: 15, w: 25, h: 23 } },
        ]
      };
      P.convertSpacersToItemSpacing(node);
      // Spacers not between every pair → should NOT convert
      assert.strictEqual(node.children.length, 8); // all preserved
      assert.strictEqual(node.properties.itemSpacing, undefined);
    }
  },
  {
    name: "convertSpacersToItemSpacing: VERTICAL uniform spacers",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        rect: { x: 0, y: 0, w: 200, h: 300 },
        children: [
          { type: "Text", properties: { content: "A" }, rect: { x: 0, y: 0, w: 200, h: 30 } },
          { type: "Frame", properties: {}, rect: { x: 0, y: 30, w: 0, h: 16 }, children: [] },
          { type: "Frame", properties: { backgroundColor: "#FF0000" }, rect: { x: 0, y: 46, w: 200, h: 80 } },
          { type: "Frame", properties: {}, rect: { x: 0, y: 126, w: 0, h: 16 }, children: [] },
          { type: "Frame", properties: { backgroundColor: "#00FF00" }, rect: { x: 0, y: 142, w: 200, h: 80 } },
        ]
      };
      P.convertSpacersToItemSpacing(node);
      assert.strictEqual(node.properties.itemSpacing, 16);
      assert.strictEqual(node.children.length, 3);
    }
  },
  {
    name: "convertSpacersToItemSpacing: spacer with sizingH/sizingV props → still recognized",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 200, h: 40 },
        children: [
          { type: "Text", properties: { content: "A" }, rect: { x: 0, y: 10, w: 60, h: 20 } },
          { type: "Frame", properties: { sizingH: "HUG", sizingV: "HUG" }, rect: { x: 60, y: 20, w: 8, h: 0 }, children: [] },
          { type: "Text", properties: { content: "B" }, rect: { x: 68, y: 10, w: 60, h: 20 } },
        ]
      };
      P.convertSpacersToItemSpacing(node);
      assert.strictEqual(node.properties.itemSpacing, 8);
      assert.strictEqual(node.children.length, 2);
    }
  },
  // ============================================================
  // recalcItemSpacing: spacer-aware gap calculation
  // ============================================================
  {
    name: "recalcItemSpacing: spacer removed when gaps > 0 (finance pattern)",
    fn: function() {
      // Column: [Title, SizedBox(h=16), Row, Row, Row] with 12px rect gaps between Rows
      var node = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        rect: { x: 0, y: 0, w: 371, h: 300 },
        children: [
          { type: "Text", properties: { content: "Title" }, rect: { x: 0, y: 0, w: 189, h: 29 } },
          { type: "Frame", properties: {}, rect: { x: 0, y: 29, w: 0, h: 16 }, children: [] },
          { type: "Frame", properties: { layoutMode: "HORIZONTAL", backgroundColor: "#14FFF" }, rect: { x: 0, y: 45, w: 371, h: 76 }, children: [] },
          { type: "Frame", properties: { layoutMode: "HORIZONTAL", backgroundColor: "#14FFF" }, rect: { x: 0, y: 133, w: 371, h: 76 }, children: [] },
          { type: "Frame", properties: { layoutMode: "HORIZONTAL", backgroundColor: "#14FFF" }, rect: { x: 0, y: 221, w: 371, h: 76 }, children: [] },
        ]
      };
      P.recalcItemSpacing(node);
      // gaps after spacer removal: [16, 12, 12] → mostCommon=12
      assert.strictEqual(node.properties.itemSpacing, 12);
      assert.strictEqual(node.children.length, 4); // spacer removed
    }
  },
  {
    name: "recalcItemSpacing: spacer preserved when gaps = 0 (weather pattern)",
    fn: function() {
      // Row: [Text, Icon, FlexSpacer, Text, SizedBox(8), Bar, SizedBox(8), Text]
      // All non-spacer gaps are 0
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 371, h: 53 },
        children: [
          { type: "Text", properties: { content: "Mon" }, rect: { x: 21, y: 16, w: 40, h: 21 } },
          { type: "Frame", properties: { isIconBox: true }, rect: { x: 61, y: 15, w: 22, h: 22 } },
          { type: "Frame", properties: { flexGrow: 1 }, rect: { x: 83, y: 26, w: 121, h: 0.01 }, children: [] },
          { type: "Text", properties: { content: "24" }, rect: { x: 204, y: 15, w: 25, h: 23 } },
          { type: "Frame", properties: {}, rect: { x: 229, y: 24, w: 8, h: 0 }, children: [] },
          { type: "Frame", properties: { borderRadius: 2 }, rect: { x: 237, y: 24, w: 80, h: 4 } },
          { type: "Frame", properties: {}, rect: { x: 317, y: 24, w: 8, h: 0 }, children: [] },
          { type: "Text", properties: { content: "16" }, rect: { x: 325, y: 15, w: 25, h: 23 } },
        ]
      };
      P.recalcItemSpacing(node);
      // Removing spacers gives gaps = [0,0,0,8,8] → mostCommon=0 → restore spacers
      assert.strictEqual(node.properties.itemSpacing, 0);
      assert.strictEqual(node.children.length, 8); // spacers restored
    }
  },
  {
    name: "recalcItemSpacing: all children are non-spacer → normal gap calc",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        rect: { x: 0, y: 0, w: 200, h: 200 },
        children: [
          { type: "Text", properties: { content: "A" }, rect: { x: 0, y: 0, w: 200, h: 20 } },
          { type: "Frame", properties: { backgroundColor: "#F00" }, rect: { x: 0, y: 28, w: 200, h: 40 }, children: [{ type: "Text", properties: {} }] },
          { type: "Text", properties: { content: "B" }, rect: { x: 0, y: 76, w: 200, h: 20 } },
        ]
      };
      P.recalcItemSpacing(node);
      assert.strictEqual(node.properties.itemSpacing, 8);
    }
  },
  {
    name: "recalcItemSpacing: only spacer children → itemSpacing=0",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 100, h: 40 },
        children: [
          { type: "Frame", properties: {}, rect: { x: 0, y: 20, w: 8, h: 0 }, children: [] },
          { type: "Frame", properties: {}, rect: { x: 10, y: 20, w: 8, h: 0 }, children: [] },
        ]
      };
      P.recalcItemSpacing(node);
      assert.strictEqual(node.properties.itemSpacing, 0);
    }
  },
  // ============================================================
  // removeEmptyLeaves: spacer preservation
  // ============================================================
  {
    name: "removeEmptyLeaves: middle spacer-sized HORIZONTAL Frame preserved for recalcItemSpacing",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 200, h: 40 },
        children: [
          { type: "Text", properties: { content: "L" }, rect: { x: 0, y: 10, w: 50, h: 20 } },
          { type: "Frame", properties: {}, rect: { x: 50, y: 20, w: 8, h: 0 }, children: [] },
          { type: "Text", properties: { content: "R" }, rect: { x: 58, y: 10, w: 50, h: 20 } },
        ]
      };
      P.removeEmptyLeaves(node);
      // Spacer preserved by removeEmptyLeaves (recalcItemSpacing will handle removal later)
      assert.strictEqual(node.children.length, 3);
      assert.strictEqual(node.children[1].type, "Frame");
    }
  },
  {
    name: "removeEmptyLeaves: middle spacer-sized VERTICAL Frame preserved for recalcItemSpacing",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        rect: { x: 0, y: 0, w: 200, h: 200 },
        children: [
          { type: "Text", properties: { content: "Top" }, rect: { x: 0, y: 0, w: 200, h: 20 } },
          { type: "Frame", properties: {}, rect: { x: 0, y: 20, w: 0, h: 16 }, children: [] },
          { type: "Text", properties: { content: "Bot" }, rect: { x: 0, y: 36, w: 200, h: 20 } },
        ]
      };
      P.removeEmptyLeaves(node);
      assert.strictEqual(node.children.length, 3);
    }
  },
  {
    name: "removeEmptyLeaves: large middle empty Frame removed (not spacer-sized)",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "HORIZONTAL" },
        rect: { x: 0, y: 0, w: 400, h: 200 },
        children: [
          { type: "Text", properties: { content: "L" }, rect: { x: 0, y: 0, w: 100, h: 20 } },
          { type: "Frame", properties: {}, rect: { x: 100, y: 0, w: 200, h: 200 }, children: [] },
          { type: "Text", properties: { content: "R" }, rect: { x: 300, y: 0, w: 100, h: 20 } },
        ]
      };
      P.removeEmptyLeaves(node);
      assert.strictEqual(node.children.length, 2); // large empty removed
    }
  },
  // ============================================================
  // Full pipeline: weather row pattern
  // ============================================================
  {
    name: "pipeline: weather row — SizedBox spacers preserved with flexGrow sibling",
    fn: function() {
      // Actual coordinates: all non-spacer children are contiguous (gap=0)
      // SizedBox spacers are the ONLY source of spacing between 24°↔Bar↔16°
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 371, h: 53 },
        visual: { backgroundColor: "#14FFFFFF" },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "max" },
        children: [
          { type: "Text", rect: { x: 21, y: 16, w: 40, h: 21 }, visual: { content: "Mon", fontSize: 15 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 61, y: 15, w: 22, h: 22 }, visual: { isIconBox: true }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 83, y: 26, w: 121, h: 0.01 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 1, sizingH: "FILL" }, children: [] },
          { type: "Text", rect: { x: 204, y: 15, w: 25, h: 23 }, visual: { content: "24", fontSize: 16 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 229, y: 24, w: 8, h: 0 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [] },
          { type: "Frame", rect: { x: 237, y: 24, w: 80, h: 4 }, layoutMode: "COLUMN", visual: { gradient: {"type":"linear"}, borderRadius: 2 }, containerLayout: {}, childLayout: { fixedWidth: true, fixedHeight: true, fixedSize: true } },
          { type: "Frame", rect: { x: 317, y: 24, w: 8, h: 0 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [] },
          { type: "Text", rect: { x: 325, y: 15, w: 25, h: 23 }, visual: { content: "16", fontSize: 16 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } }
        ]
      };
      var result = helpers.runPreprocess(input);
      // SizedBox spacers preserved (removing them would give itemSpacing=0, losing spacing)
      assert.strictEqual(result.children.length, 8, "All 8 children preserved");
      assert.strictEqual(result.properties.itemSpacing, 0, "itemSpacing=0, spacer Frames provide spacing");
      // SizedBox spacer frames at indices 4 and 6
      assert.strictEqual(result.children[4].type, "Frame");
      assert.strictEqual((result.children[4].rect || {}).w, 8);
      assert.strictEqual(result.children[6].type, "Frame");
      assert.strictEqual((result.children[6].rect || {}).w, 8);
      // FlexGrow spacer preserved
      assert.strictEqual((result.children[2].properties || {}).flexGrow, 1);
    }
  },
  {
    name: "pipeline: column with margin gaps — itemSpacing from rect gaps, SizedBox edge → padding",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 371, h: 300 },
        visual: {}, containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "start", mainAxisSize: "max" },
        children: [
          { type: "Text", rect: { x: 0, y: 0, w: 189, h: 29 }, visual: { content: "Title", fontSize: 20 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 0, y: 29, w: 0, h: 16 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [] },
          { type: "Frame", rect: { x: 0, y: 45, w: 371, h: 76 }, layoutMode: "ROW", visual: { backgroundColor: "#14FFFFFF" }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [
            { type: "Text", rect: { x: 17, y: 62, w: 68, h: 23 }, visual: { content: "Row1" }, containerLayout: {} }
          ] },
          { type: "Frame", rect: { x: 0, y: 133, w: 371, h: 76 }, layoutMode: "ROW", visual: { backgroundColor: "#14FFFFFF" }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [
            { type: "Text", rect: { x: 17, y: 150, w: 84, h: 23 }, visual: { content: "Row2" }, containerLayout: {} }
          ] },
          { type: "Frame", rect: { x: 0, y: 221, w: 371, h: 76 }, layoutMode: "ROW", visual: { backgroundColor: "#14FFFFFF" }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [
            { type: "Text", rect: { x: 17, y: 238, w: 59, h: 23 }, visual: { content: "Row3" }, containerLayout: {} }
          ] }
        ]
      };
      var result = helpers.runPreprocess(input);
      // Row-Row gaps = 12px (from rect coordinates: 133-121=12, 221-209=12)
      assert.strictEqual(result.properties.itemSpacing, 12, "itemSpacing from margin gaps");
      // SizedBox(h=16) removed by recalcItemSpacing, no spacer children remain
      assert.strictEqual(result.children.length, 4, "Title + 3 Rows");
      assert.strictEqual(result.children[0].type, "Text");
      assert.strictEqual(result.children[1].properties.backgroundColor, "#14FFFFFF");
    }
  },
  {
    name: "pipeline: uniform spacers → converted to itemSpacing, spacers removed",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 0, y: 0, w: 300, h: 40 },
        visual: {}, containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "max" },
        children: [
          { type: "Text", rect: { x: 0, y: 10, w: 60, h: 20 }, visual: { content: "A", fontSize: 14 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 60, y: 20, w: 12, h: 0 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [] },
          { type: "Text", rect: { x: 72, y: 10, w: 60, h: 20 }, visual: { content: "B", fontSize: 14 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } },
          { type: "Frame", rect: { x: 132, y: 20, w: 12, h: 0 }, layoutMode: "NONE", visual: {}, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" }, children: [] },
          { type: "Text", rect: { x: 144, y: 10, w: 60, h: 20 }, visual: { content: "C", fontSize: 14 }, containerLayout: {}, childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" } }
        ]
      };
      var result = helpers.runPreprocess(input);
      assert.strictEqual(result.properties.itemSpacing, 12, "Uniform spacers → itemSpacing=12");
      assert.strictEqual(result.children.length, 3, "Spacers removed, 3 children remain");
    }
  },
  // ============================================================
  // inferMissingLayout: empty Frame
  // ============================================================
  {
    name: "inferMissingLayout: 0 children → no layoutMode (spacer-safe)",
    fn: function() {
      var node = { type: "Frame", properties: {}, rect: { x: 0, y: 0, w: 8, h: 0 }, children: [] };
      P.inferMissingLayout(node);
      assert.strictEqual(node.properties.layoutMode, undefined, "Empty Frame should not get layoutMode");
    }
  },
  // ============================================================
  // Original tests continued
  // ============================================================
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
