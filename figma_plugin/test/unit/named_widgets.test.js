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
  // ============================================================
  // TextField layout direction (preprocessing level)
  // ============================================================
  {
    name: "pipeline: TextField in multi-child parent — inner wrapper HUG should not block FILL from grandparent",
    fn: function() {
      // Structure: Column(5 children, cross=start) → [0]: Column(3 children) → InnerWrapper(HUG) → TF
      // InnerWrapper has sizingH=HUG from childLayout, but grandparent context is FILL
      // The inner wrapper is a transparent pass-through and should not force HUG on TF
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 379, h: 72 },
        visual: {},
        containerLayout: { crossAxisAlignment: "start" },
        childLayout: { sizingH: "FILL" },
        children: [
          {
            type: "Frame", layoutMode: "COLUMN",
            rect: { x: 0, y: 12, w: 379, h: 48 },
            visual: {},
            containerLayout: { crossAxisAlignment: "stretch" },
            childLayout: { sizingH: "HUG" },
            children: [{
              type: "Frame", layoutMode: "ROW",
              rect: { x: 0, y: 12, w: 379, h: 48 },
              visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
              containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min" },
              children: [
                { type: "Frame", rect: { x: 0, y: 12, w: 48, h: 48 }, visual: {}, containerLayout: {},
                  children: [{ type: "Frame", rect: { x: 12, y: 24, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }] },
                { type: "Text", rect: { x: 48, y: 25, w: 200, h: 22 }, visual: { content: "Hint" }, containerLayout: {} }
              ]
            }]
          }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null);
      // TextField should be FILL — the inner wrapper's HUG should not override
      // because it's a transparent wrapper with same size as TF
      assert.strictEqual(tfNode._sizingH, "FILL",
        "TextField should be FILL despite inner wrapper HUG. Got: " + tfNode._sizingH);
    }
  },
  {
    name: "pipeline: TextField in Padding wrapper — sizingH=FILL propagated from parent",
    fn: function() {
      // Structure: Padding(FILL) → Inner(HUG) → TextField(isTextField)
      // After merge: Padding preserved, Inner+TextField merge
      // TextField should inherit FILL from Padding wrapper's childLayout
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 201, w: 411, h: 72 },
        visual: {},
        containerLayout: { crossAxisAlignment: "start", padding: { top: 12, right: 16, bottom: 12, left: 16 } },
        childLayout: { flexGrow: 0, sizingH: "FILL", sizingV: "HUG", alignSelf: "STRETCH" },
        children: [{
          type: "Frame", layoutMode: "COLUMN",
          rect: { x: 16, y: 213, w: 379, h: 48 },
          visual: {},
          containerLayout: { crossAxisAlignment: "stretch" },
          childLayout: { flexGrow: 0, sizingH: "HUG", sizingV: "HUG" },
          children: [{
            type: "Frame", layoutMode: "ROW",
            rect: { x: 16, y: 213, w: 379, h: 48 },
            visual: { backgroundColor: "#FFF8F8F8", border: { color: "#FFE0E0E0", width: 1 }, borderRadius: 8, isTextField: true },
            containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "min",
              padding: { top: 0, right: 4, bottom: 0, left: 0 } },
            children: [
              { type: "Frame", rect: { x: 16, y: 213, w: 48, h: 48 },
                visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
                children: [
                  { type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
                ] },
              { type: "Text", rect: { x: 68, y: 226, w: 307, h: 22 },
                visual: { content: "Search", fontSize: 16 }, containerLayout: {} }
            ]
          }]
        }]
      };
      var result = helpers.runPreprocess(input);

      // Find TextField
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null, "TextField should exist");

      // TextField should be FILL (inherited from padding wrapper's FILL)
      var sizH = tfNode._sizingH || (tfNode.properties || {}).sizingH;
      assert.strictEqual(sizH, "FILL",
        "TextField should be FILL (from parent wrapper), got " + sizH);
    }
  },
  {
    name: "pipeline: TextField with prefixIcon + hint — ROW layout preserved",
    fn: function() {
      // Crawler now outputs ROW + start alignment for TextField with prefixIcon
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", border: { color: "#FFE0E0E0", width: 1 }, borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
          padding: { top: 0, right: 4, bottom: 0, left: 0 } },
        children: [
          { type: "Frame", layoutMode: "COLUMN", rect: { x: 16, y: 213, w: 48, h: 48 },
            visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
          { type: "Text", rect: { x: 68, y: 226, w: 307, h: 22 },
            visual: { content: "Search here", fontSize: 16, color: "#FF999999" }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null, "TextField node should exist");

      // layoutMode should be HORIZONTAL (children are side by side)
      assert.strictEqual(tfNode.properties.layoutMode, "HORIZONTAL",
        "TextField with prefixIcon should be ROW/HORIZONTAL, not COLUMN");

      // mainAxisAlignment should be start (icon left, text right), NOT center
      assert.strictEqual(tfNode.properties.mainAxisAlignment, "start",
        "TextField ROW should have mainAxisAlignment=start, not center");

      // crossAxisAlignment should be center (vertically centered)
      assert.strictEqual(tfNode.properties.crossAxisAlignment, "center",
        "TextField ROW should have crossAxisAlignment=center");

      // paddingRight should be reasonable, not 331px
      var padR = tfNode.properties.paddingRight || 0;
      assert.ok(padR < 50, "paddingRight should be reasonable, not " + padR);
    }
  },
  {
    name: "pipeline: TextField without icon — VERTICAL + mainAxis=center",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 16, y: 100, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "start", mainAxisSize: "min",
          padding: { top: 13, right: 20, bottom: 13, left: 20 } },
        children: [
          { type: "Text", rect: { x: 36, y: 113, w: 100, h: 22 },
            visual: { content: "Enter name", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true;
      });
      assert.notStrictEqual(tfNode, null);
      assert.strictEqual(tfNode.properties.layoutMode, "VERTICAL");
      // COLUMN TextField: mainAxisAlignment=center (vertically centered text)
      assert.strictEqual(tfNode.properties.mainAxisAlignment, "center",
        "COLUMN TextField should keep mainAxisAlignment=center");
    }
  },
  {
    name: "pipeline: TextField with prefixIcon — text should be FILL (expand to fill remaining space)",
    fn: function() {
      // In a ROW TextField, the hint text should fill remaining space after icon
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min",
          padding: { top: 0, right: 4, bottom: 0, left: 0 } },
        children: [
          { type: "Frame", rect: { x: 16, y: 213, w: 48, h: 48 },
            visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
          { type: "Text", rect: { x: 68, y: 226, w: 307, h: 22 },
            visual: { content: "Search", fontSize: 16 }, containerLayout: {},
            childLayout: { flexGrow: 0, sizingH: "HUG" } }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null);
      // Verify children exist
      assert.ok(tfNode.children.length >= 2, "Should have icon + text children");
    }
  },
  {
    name: "pipeline: TextField isTextField flag preserved after merge",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 16, y: 100, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true, border: { color: "#FFE0E0E0", width: 1 } },
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "start", mainAxisSize: "min",
          padding: { top: 13, right: 20, bottom: 13, left: 20 } },
        children: [
          { type: "Text", rect: { x: 36, y: 113, w: 100, h: 22 },
            visual: { content: "Hint", fontSize: 16, color: "#FF999999" }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true;
      });
      assert.notStrictEqual(tfNode, null, "isTextField should be preserved after preprocessing");
      assert.ok(tfNode.properties.backgroundColor.toLowerCase().indexOf("f8f8f8") !== -1, "bg preserved");
      assert.strictEqual(tfNode.properties.hasBorder, true);
    }
  },
  {
    name: "pipeline: TextField visual props (bg, border, radius) preserved",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFFAFAFA", border: { color: "#FFCCCCCC", width: 2 }, borderRadius: 12, isTextField: true },
        containerLayout: { mainAxisAlignment: "start", crossAxisAlignment: "center", mainAxisSize: "min" },
        children: [
          { type: "Text", rect: { x: 36, y: 226, w: 200, h: 22 },
            visual: { content: "Type here", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true;
      });
      assert.notStrictEqual(tfNode, null);
      assert.ok(tfNode.properties.backgroundColor.toLowerCase().indexOf("fafafa") !== -1, "bg preserved");
      assert.strictEqual(tfNode.properties.hasBorder, true, "border preserved");
      assert.strictEqual(tfNode.properties.borderRadius, "12", "borderRadius preserved");
    }
  },
  {
    name: "pipeline: TextField padding symmetry — vertical centered, horizontal correct",
    fn: function() {
      // TextField(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12))
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 0, y: 0, w: 300, h: 48 },
        visual: { backgroundColor: "#FFF0F0F0", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "start", mainAxisSize: "min",
          padding: { top: 12, right: 16, bottom: 12, left: 16 } },
        children: [
          { type: "Text", rect: { x: 16, y: 12, w: 150, h: 24 },
            visual: { content: "Value", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true;
      });
      assert.notStrictEqual(tfNode, null);
      assert.strictEqual(tfNode.properties.paddingTop, 12);
      assert.strictEqual(tfNode.properties.paddingBottom, 12);
      assert.strictEqual(tfNode.properties.paddingLeft, 16);
      assert.strictEqual(tfNode.properties.paddingRight, 16);
    }
  },
  {
    name: "pipeline: TextField with prefixIcon — icon and text both preserved",
    fn: function() {
      var input = {
        type: "Frame", layoutMode: "COLUMN",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "start", mainAxisSize: "min" },
        children: [
          { type: "Frame", rect: { x: 16, y: 213, w: 48, h: 48 },
            visual: {}, containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center" },
            children: [
              { type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
          { type: "Text", rect: { x: 68, y: 226, w: 200, h: 22 },
            visual: { content: "Hint", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null);

      var icons = [], texts = [];
      function walk(n) {
        if ((n.properties || {}).isIconBox) icons.push(n);
        if (n.type === "Text") texts.push(n);
        (n.children || []).forEach(walk);
      }
      walk(tfNode);
      assert.ok(icons.length >= 1, "Icon preserved");
      assert.ok(texts.length >= 1, "Text preserved");
    }
  },
  {
    name: "pipeline: TextField padding — bounding box based, reasonable values",
    fn: function() {
      // Crawler now computes padding from bounding box of ALL children
      // Icon at x=16 w=48, Text at x=68 w=307 → bbox: x=16..375, w covers most of container
      var input = {
        type: "Frame", layoutMode: "ROW",
        rect: { x: 16, y: 213, w: 379, h: 48 },
        visual: { backgroundColor: "#FFF8F8F8", borderRadius: 8, isTextField: true },
        containerLayout: { mainAxisAlignment: "center", crossAxisAlignment: "center", mainAxisSize: "min",
          padding: { top: 0, right: 4, bottom: 0, left: 0 } },
        children: [
          { type: "Frame", rect: { x: 16, y: 213, w: 48, h: 48 },
            visual: {}, containerLayout: {},
            children: [
              { type: "Frame", rect: { x: 28, y: 225, w: 24, h: 24 }, visual: { isIconBox: true }, containerLayout: {} }
            ] },
          { type: "Text", rect: { x: 68, y: 226, w: 307, h: 22 },
            visual: { content: "Search", fontSize: 16 }, containerLayout: {} }
        ]
      };
      var result = helpers.runPreprocess(input);
      var tfNode = helpers.findNode(result, function(n) {
        return (n.properties || {}).isTextField === true ||
               ((n.properties || {}).backgroundColor || "").toLowerCase().indexOf("f8f8f8") !== -1;
      });
      assert.notStrictEqual(tfNode, null);
      // paddingRight should be small (content fills most of width)
      var padR = tfNode.properties.paddingRight || 0;
      assert.ok(padR < 30, "paddingRight should be based on bounding box, got " + padR);
    }
  },
];
