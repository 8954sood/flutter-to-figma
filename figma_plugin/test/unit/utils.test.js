var helpers = require("../helpers");
var P = helpers.loadPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // parseFlutterColor
  // ============================================================
  {
    name: "parseFlutterColor: #AARRGGBB → {r,g,b,a}",
    fn: function() {
      var c = P.parseFlutterColor("#FF00FF00");
      assert.strictEqual(c.r, 0);
      assert.strictEqual(c.g, 1);
      assert.strictEqual(c.b, 0);
      assert.strictEqual(c.a, 1);
    }
  },
  {
    name: "parseFlutterColor: 6-digit hex",
    fn: function() {
      var c = P.parseFlutterColor("#FF0000");
      assert.strictEqual(c.r, 1);
      assert.strictEqual(c.g, 0);
      assert.strictEqual(c.b, 0);
      assert.strictEqual(c.a, 1);
    }
  },
  {
    name: "parseFlutterColor: null → black",
    fn: function() {
      var c = P.parseFlutterColor(null);
      assert.strictEqual(c.r, 0);
      assert.strictEqual(c.a, 1);
    }
  },
  {
    name: "parseFlutterColor: semi-transparent",
    fn: function() {
      var c = P.parseFlutterColor("#80FF0000");
      assert.ok(Math.abs(c.a - 0.502) < 0.01);
      assert.strictEqual(c.r, 1);
    }
  },
  // ============================================================
  // isTransparent
  // ============================================================
  {
    name: "isTransparent: #00000000 → true",
    fn: function() {
      assert.strictEqual(P.isTransparent("#00000000"), true);
    }
  },
  {
    name: "isTransparent: #00FF0000 (alpha=0) → true",
    fn: function() {
      assert.strictEqual(P.isTransparent("#00FF0000"), true);
    }
  },
  {
    name: "isTransparent: #FFFF0000 (opaque) → false",
    fn: function() {
      assert.strictEqual(P.isTransparent("#FFFF0000"), false);
    }
  },
  {
    name: "isTransparent: null → true",
    fn: function() {
      assert.strictEqual(P.isTransparent(null), true);
    }
  },
  // ============================================================
  // isEmptyProps
  // ============================================================
  {
    name: "isEmptyProps: {} → true",
    fn: function() {
      assert.strictEqual(P.isEmptyProps({}), true);
    }
  },
  {
    name: "isEmptyProps: null → true",
    fn: function() {
      assert.strictEqual(P.isEmptyProps(null), true);
    }
  },
  {
    name: "isEmptyProps: {layoutMode:'VERTICAL'} → false",
    fn: function() {
      assert.strictEqual(P.isEmptyProps({ layoutMode: "VERTICAL" }), false);
    }
  },
  // ============================================================
  // mapTextAlign
  // ============================================================
  {
    name: "mapTextAlign: center → CENTER",
    fn: function() {
      assert.strictEqual(P.mapTextAlign("TextAlign.center"), "CENTER");
    }
  },
  {
    name: "mapTextAlign: end → RIGHT",
    fn: function() {
      assert.strictEqual(P.mapTextAlign("TextAlign.end"), "RIGHT");
    }
  },
  {
    name: "mapTextAlign: start → LEFT",
    fn: function() {
      assert.strictEqual(P.mapTextAlign("TextAlign.start"), "LEFT");
    }
  },
  // ============================================================
  // mapMainAxisAlign / mapCrossAxisAlign
  // ============================================================
  {
    name: "mapMainAxisAlign: center → CENTER",
    fn: function() {
      assert.strictEqual(P.mapMainAxisAlign("MainAxisAlignment.center"), "CENTER");
    }
  },
  {
    name: "mapMainAxisAlign: spaceBetween → SPACE_BETWEEN",
    fn: function() {
      assert.strictEqual(P.mapMainAxisAlign("MainAxisAlignment.spaceBetween"), "SPACE_BETWEEN");
    }
  },
  {
    name: "mapMainAxisAlign: start → MIN",
    fn: function() {
      assert.strictEqual(P.mapMainAxisAlign("MainAxisAlignment.start"), "MIN");
    }
  },
  {
    name: "mapCrossAxisAlign: center → CENTER",
    fn: function() {
      assert.strictEqual(P.mapCrossAxisAlign("CrossAxisAlignment.center"), "CENTER");
    }
  },
  {
    name: "mapCrossAxisAlign: stretch → MIN (Figma handles via child FILL)",
    fn: function() {
      assert.strictEqual(P.mapCrossAxisAlign("CrossAxisAlignment.stretch"), "MIN");
    }
  },
  // ============================================================
  // mapImageFit / mapBoxFitToScaleMode
  // ============================================================
  {
    name: "mapImageFit: contain → FIT, cover → FILL",
    fn: function() {
      assert.strictEqual(P.mapImageFit("contain"), "FIT");
      assert.strictEqual(P.mapImageFit("cover"), "FILL");
      assert.strictEqual(P.mapImageFit("fill"), "FILL");
      assert.strictEqual(P.mapImageFit("none"), "FIT");
    }
  },
  {
    name: "mapBoxFitToScaleMode: contain → FIT, cover → FILL",
    fn: function() {
      assert.strictEqual(P.mapBoxFitToScaleMode("contain"), "FIT");
      assert.strictEqual(P.mapBoxFitToScaleMode("cover"), "FILL");
      assert.strictEqual(P.mapBoxFitToScaleMode("fill"), "FILL");
    }
  },
  // ============================================================
  // generateNodeName
  // ============================================================
  {
    name: "generateNodeName: Text → content truncated to 20",
    fn: function() {
      var node = { type: "Text", properties: { content: "Hello World" } };
      assert.strictEqual(P.generateNodeName(node), "Hello World");
      var long = { type: "Text", properties: { content: "A very long text that exceeds twenty characters" } };
      assert.ok(P.generateNodeName(long).length <= 22); // 20 + "…"
    }
  },
  {
    name: "generateNodeName: Frame with layoutMode → Row/Column",
    fn: function() {
      assert.strictEqual(P.generateNodeName({ type: "Frame", properties: { layoutMode: "HORIZONTAL" } }), "Row");
      assert.strictEqual(P.generateNodeName({ type: "Frame", properties: { layoutMode: "VERTICAL" } }), "Column");
    }
  },
  {
    name: "generateNodeName: icon → Icon",
    fn: function() {
      assert.strictEqual(P.generateNodeName({ type: "Frame", properties: { isIconBox: true } }), "Icon");
    }
  },
  // ============================================================
  // parseBorderRadius
  // ============================================================
  {
    name: "parseBorderRadius: number → number",
    fn: function() {
      assert.strictEqual(P.parseBorderRadius(8), 8);
    }
  },
  {
    name: "parseBorderRadius: string '12.5' → 12.5",
    fn: function() {
      assert.strictEqual(P.parseBorderRadius("12.5"), 12.5);
    }
  },
  {
    name: "parseBorderRadius: 'zero' → 0",
    fn: function() {
      assert.strictEqual(P.parseBorderRadius("BorderRadius.zero"), 0);
    }
  },
  {
    name: "parseBorderRadius: null → 0",
    fn: function() {
      assert.strictEqual(P.parseBorderRadius(null), 0);
    }
  },
  // ============================================================
  // mostCommonValue
  // ============================================================
  {
    name: "mostCommonValue: [8,8,12] → 8",
    fn: function() {
      assert.strictEqual(P.mostCommonValue([8, 8, 12]), 8);
    }
  },
  {
    name: "mostCommonValue: [12,12,12,8] → 12",
    fn: function() {
      assert.strictEqual(P.mostCommonValue([12, 12, 12, 8]), 12);
    }
  },
  {
    name: "mostCommonValue: [0,0,8,8,8] → 8 (not 0)",
    fn: function() {
      assert.strictEqual(P.mostCommonValue([0, 0, 8, 8, 8]), 8);
    }
  },
  {
    name: "mostCommonValue: single → that value",
    fn: function() {
      assert.strictEqual(P.mostCommonValue([16]), 16);
    }
  },
  // ============================================================
  // sortChildrenByAxis / isMonotonicallyIncreasing
  // ============================================================
  {
    name: "sortChildrenByAxis: sorts by y",
    fn: function() {
      var children = [
        { rect: { y: 30 }, _id: "c" },
        { rect: { y: 10 }, _id: "a" },
        { rect: { y: 20 }, _id: "b" },
      ];
      var sorted = P.sortChildrenByAxis(children, "y");
      assert.strictEqual(sorted[0]._id, "a");
      assert.strictEqual(sorted[1]._id, "b");
      assert.strictEqual(sorted[2]._id, "c");
    }
  },
  {
    name: "isMonotonicallyIncreasing: sorted → true, unsorted → false",
    fn: function() {
      var sorted = [{ rect: { x: 0 } }, { rect: { x: 10 } }, { rect: { x: 20 } }];
      assert.strictEqual(P.isMonotonicallyIncreasing(sorted, "x"), true);
      var unsorted = [{ rect: { x: 20 } }, { rect: { x: 10 } }, { rect: { x: 30 } }];
      assert.strictEqual(P.isMonotonicallyIncreasing(unsorted, "x"), false);
    }
  },
  // ============================================================
  // flattenEmptyWrappers
  // ============================================================
  {
    name: "flattenEmptyWrappers: empty props + 1 child → child promoted",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        rect: { x: 0, y: 0, w: 100, h: 50 },
        children: [{ type: "Text", properties: { content: "hello" }, rect: { x: 5, y: 5, w: 90, h: 20 } }]
      };
      var result = P.flattenEmptyWrappers(node);
      assert.strictEqual(result.type, "Text");
      assert.strictEqual(result.properties.content, "hello");
    }
  },
  {
    name: "flattenEmptyWrappers: empty props + 0 children, large → null",
    fn: function() {
      var node = { type: "Frame", properties: {}, rect: { x: 0, y: 0, w: 200, h: 200 }, children: [] };
      assert.strictEqual(P.flattenEmptyWrappers(node), null);
    }
  },
  {
    name: "flattenEmptyWrappers: empty props + 0 children, small → spacer kept",
    fn: function() {
      var node = { type: "Frame", properties: {}, rect: { x: 0, y: 0, w: 16, h: 0 }, children: [] };
      var result = P.flattenEmptyWrappers(node);
      assert.notStrictEqual(result, null);
    }
  },
  {
    name: "flattenEmptyWrappers: non-empty props → no flatten",
    fn: function() {
      var node = {
        type: "Frame", properties: { layoutMode: "VERTICAL" },
        rect: { x: 0, y: 0, w: 100, h: 50 },
        children: [{ type: "Text", properties: { content: "x" } }]
      };
      var result = P.flattenEmptyWrappers(node);
      assert.strictEqual(result.type, "Frame");
      assert.strictEqual(result.properties.layoutMode, "VERTICAL");
    }
  },
  {
    name: "flattenEmptyWrappers: widgetName propagated to child",
    fn: function() {
      var node = {
        type: "Frame", properties: {},
        widgetName: "MyWidget",
        children: [{ type: "Frame", properties: { layoutMode: "VERTICAL" } }]
      };
      var result = P.flattenEmptyWrappers(node);
      assert.strictEqual(result.widgetName, "MyWidget");
    }
  },
  // ============================================================
  // mergeChainIntoInnermost
  // ============================================================
  {
    name: "mergeChainIntoInnermost: rect from outermost, props merged",
    fn: function() {
      var chain = [
        { rect: { x: 0, y: 0, w: 300, h: 200 }, properties: { paddingTop: 5 } },
        { rect: { x: 10, y: 10, w: 280, h: 180 }, properties: { layoutMode: "VERTICAL", paddingTop: 3 },
          children: [{ type: "Text" }] },
      ];
      var result = P.mergeChainIntoInnermost(chain);
      assert.strictEqual(result.rect.w, 300); // outermost rect
      assert.strictEqual(result.properties.paddingTop, 8); // 5+3
      assert.strictEqual(result.properties.layoutMode, "VERTICAL");
    }
  },
  // ============================================================
  // applyAlignByLayoutDir
  // ============================================================
  {
    name: "applyAlignByLayoutDir: VERTICAL → main=v, cross=h",
    fn: function() {
      var props = { layoutMode: "VERTICAL" };
      P.applyAlignByLayoutDir(props, "center", "end");
      assert.strictEqual(props.mainAxisAlignment, "end");
      assert.strictEqual(props.crossAxisAlignment, "center");
    }
  },
  {
    name: "applyAlignByLayoutDir: HORIZONTAL → main=h, cross=v",
    fn: function() {
      var props = { layoutMode: "HORIZONTAL" };
      P.applyAlignByLayoutDir(props, "center", "end");
      assert.strictEqual(props.mainAxisAlignment, "center");
      assert.strictEqual(props.crossAxisAlignment, "end");
    }
  },
];
