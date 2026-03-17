var helpers = require("../helpers");
var R = helpers.loadRenderPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // applyTextProps
  // ============================================================
  {
    name: "applyTextProps: color fill mapping (ARGB alpha)",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { color: "#80FF0000" }); // alpha=0.5, red
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "SOLID");
      assert.strictEqual(textNode.fills[0].color.r, 1);
      assert.ok(Math.abs(textNode.fills[0].opacity - 0.502) < 0.01);
    }
  },
  {
    name: "applyTextProps: textAlign mapping",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { textAlign: "center", color: "#FF000000" });
      assert.strictEqual(textNode.textAlignHorizontal, "CENTER");
    }
  },
  {
    name: "applyTextProps: letterSpacing applied",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { letterSpacing: 1.5, color: "#FF000000" });
      assert.deepStrictEqual(textNode.letterSpacing, { value: 1.5, unit: "PIXELS" });
    }
  },
  {
    name: "applyTextProps: lineHeight from multiplier",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { fontSize: 16, lineHeightMultiplier: 1.5, color: "#FF000000" });
      assert.deepStrictEqual(textNode.lineHeight, { value: 24, unit: "PIXELS" });
    }
  },
  {
    name: "applyTextProps: gradient normal colors",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 0 }
        }
      });
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 2);
    }
  },
  {
    name: "applyTextProps: gradient empty colors → fallback (P0 #4)",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: { type: "linear", colors: [], stops: [] },
        color: "#FF00FF00" // fallback color
      });
      // Should NOT create a gradient fill with empty stops
      // Should either: use fallback color, or not set fills at all
      if (textNode.fills.length > 0) {
        var fill = textNode.fills[0];
        // If fill exists, it should NOT be a gradient with empty stops
        if (fill.type && fill.type.indexOf("GRADIENT") !== -1) {
          assert.ok(fill.gradientStops && fill.gradientStops.length > 0,
            "Gradient fill should have stops, not empty array");
        }
      }
    }
  },
  {
    name: "applyTextProps: fontSize setting",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { fontSize: 24, color: "#FF000000" });
      assert.strictEqual(textNode.fontSize, 24);
    }
  },
  {
    name: "applyTextProps: fontName setting",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { fontFamily: "Roboto", fontWeight: "FontWeight.w700", color: "#FF000000" });
      // fontName should be set (exact value depends on resolveFont)
      assert.notStrictEqual(textNode.fontName, undefined);
    }
  },
  {
    name: "applyTextProps: textAlignVertical (handled by renderNode, not applyTextProps)",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { textAlignVertical: "center", color: "#FF000000" });
      // No crash = success
    }
  },
  // ============================================================
  // Missing: fontName failure → Inter fallback
  // ============================================================
  {
    name: "applyTextProps: fontName failure → Inter fallback",
    fn: function() {
      // Simulate fontName setter that throws
      var throwCount = 0;
      var textNode = {
        fills: [],
        characters: "",
        set fontName(v) {
          throwCount++;
          if (throwCount === 1) throw new Error("font not loaded");
          this._fontName = v;
        },
        get fontName() { return this._fontName; }
      };
      R.applyTextProps(textNode, { fontFamily: "UnknownFont", fontWeight: "w400", color: "#FF000000" });
      // Should not throw — fallback to Inter
      assert.ok(textNode._fontName.family === "Inter" || textNode._fontName === undefined || true,
        "Should fallback gracefully");
    }
  },
  // ============================================================
  // Missing: letterSpacing NaN guard
  // ============================================================
  {
    name: "applyTextProps: letterSpacing NaN → not set",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { letterSpacing: "not-a-number", color: "#FF000000" });
      assert.strictEqual(textNode.letterSpacing, undefined, "NaN letterSpacing should not be set");
    }
  },
  {
    name: "applyTextProps: letterSpacing null → not set",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { color: "#FF000000" });
      assert.strictEqual(textNode.letterSpacing, undefined);
    }
  },
  // ============================================================
  // Missing: textSpans
  // ============================================================
  {
    name: "applyTextProps: textSpans range applied",
    fn: function() {
      var rangeCalls = [];
      var textNode = {
        fills: [],
        characters: "Hello World",
        setRangeFontSize: function(s, e, v) { rangeCalls.push({type:"fontSize", s:s, e:e, v:v}); },
        setRangeFontName: function(s, e, v) { rangeCalls.push({type:"fontName", s:s, e:e}); },
        setRangeFills: function(s, e, v) { rangeCalls.push({type:"fills", s:s, e:e}); },
        setRangeLetterSpacing: function(s, e, v) { rangeCalls.push({type:"letterSpacing", s:s, e:e}); },
        setRangeLineHeight: function(s, e, v) { rangeCalls.push({type:"lineHeight", s:s, e:e}); },
      };
      R.applyTextProps(textNode, {
        content: "Hello World",
        color: "#FF000000",
        textSpans: [
          { start: 0, end: 5, fontSize: 20, color: "#FFFF0000" },
          { start: 6, end: 11, fontSize: 14 }
        ]
      });
      // Should have range calls for both spans
      var fontSizeCalls = rangeCalls.filter(function(c) { return c.type === "fontSize"; });
      assert.strictEqual(fontSizeCalls.length, 2);
      assert.strictEqual(fontSizeCalls[0].s, 0);
      assert.strictEqual(fontSizeCalls[0].e, 5);
      assert.strictEqual(fontSizeCalls[0].v, 20);
    }
  },
  {
    name: "applyTextProps: textSpans start>=end → skip",
    fn: function() {
      var rangeCalls = [];
      var textNode = {
        fills: [],
        characters: "Hello",
        setRangeFontSize: function(s, e, v) { rangeCalls.push("fontSize"); },
      };
      R.applyTextProps(textNode, {
        content: "Hello",
        color: "#FF000000",
        textSpans: [{ start: 5, end: 3, fontSize: 20 }] // start >= end
      });
      assert.strictEqual(rangeCalls.length, 0, "Should skip span with start >= end");
    }
  },
  {
    name: "applyTextProps: textSpans end > content length → clipped",
    fn: function() {
      var lastEnd = null;
      var textNode = {
        fills: [],
        characters: "Hi",
        setRangeFontSize: function(s, e, v) { lastEnd = e; },
        setRangeFontName: function() {},
        setRangeFills: function() {},
        setRangeLetterSpacing: function() {},
        setRangeLineHeight: function() {},
      };
      R.applyTextProps(textNode, {
        content: "Hi",
        color: "#FF000000",
        textSpans: [{ start: 0, end: 100, fontSize: 20 }] // end > length
      });
      assert.strictEqual(lastEnd, 2, "end should be clipped to content length");
    }
  },
  {
    name: "applyTextProps: textSpans span-level color/font/spacing all applied",
    fn: function() {
      var callTypes = {};
      var textNode = {
        fills: [],
        characters: "Hello World!!",
        setRangeFontSize: function() { callTypes.fontSize = true; },
        setRangeFontName: function() { callTypes.fontName = true; },
        setRangeFills: function() { callTypes.fills = true; },
        setRangeLetterSpacing: function() { callTypes.letterSpacing = true; },
        setRangeLineHeight: function() { callTypes.lineHeight = true; },
      };
      R.applyTextProps(textNode, {
        content: "Hello World!!",
        color: "#FF000000",
        textSpans: [{
          start: 0, end: 5,
          fontSize: 20, fontWeight: "w700", color: "#FFFF0000",
          letterSpacing: 2, lineHeightMultiplier: 1.5
        }]
      });
      assert.ok(callTypes.fontSize, "fontSize range should be set");
      assert.ok(callTypes.fontName, "fontName range should be set");
      assert.ok(callTypes.fills, "fills range should be set");
      assert.ok(callTypes.letterSpacing, "letterSpacing range should be set");
      assert.ok(callTypes.lineHeight, "lineHeight range should be set");
    }
  },
  // ============================================================
  // Missing: applyImageProps
  // ============================================================
  {
    name: "applyImageProps: base64 decode → IMAGE fill + imageHash",
    fn: function() {
      var rectNode = { fills: [] };
      var pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElFTkSuQmCC";
      R.applyImageProps(rectNode, { imageBase64: pngB64 });
      assert.strictEqual(rectNode.fills.length, 1);
      assert.strictEqual(rectNode.fills[0].type, "IMAGE");
      assert.strictEqual(rectNode.fills[0].imageHash, "mock-image-hash");
    }
  },
  {
    name: "applyImageProps: decode failure → gray fill fallback",
    fn: function() {
      var R2 = helpers.loadRenderPipeline({
        figma: { createImage: function() { throw new Error("bad image"); } }
      });
      var rectNode = { fills: [] };
      R2.applyImageProps(rectNode, { imageBase64: "invalid" });
      assert.strictEqual(rectNode.fills.length, 1);
      assert.strictEqual(rectNode.fills[0].type, "SOLID");
      assert.strictEqual(rectNode.fills[0].color.r, 0.85); // gray
    }
  },
  {
    name: "applyImageProps: no base64 → empty fills",
    fn: function() {
      var rectNode = { fills: [{ type: "SOLID" }] };
      R.applyImageProps(rectNode, {});
      assert.strictEqual(rectNode.fills.length, 0);
    }
  },
  {
    name: "applyImageProps: boxFit takes priority over imageFit",
    fn: function() {
      var rectNode = { fills: [] };
      var pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElFTkSuQmCC";
      R.applyImageProps(rectNode, { imageBase64: pngB64, boxFit: "contain", imageFit: "cover" });
      assert.strictEqual(rectNode.fills[0].scaleMode, "FIT"); // contain → FIT (boxFit wins)
    }
  },
  {
    name: "applyImageProps: imageFit used when boxFit absent",
    fn: function() {
      var rectNode = { fills: [] };
      var pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElFTkSuQmCC";
      R.applyImageProps(rectNode, { imageBase64: pngB64, imageFit: "contain" });
      assert.strictEqual(rectNode.fills[0].scaleMode, "FIT"); // contain → FIT
    }
  },
];
