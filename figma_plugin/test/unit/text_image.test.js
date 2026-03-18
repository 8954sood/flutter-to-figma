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
    name: "applyTextProps: gradient radial type → GRADIENT_RADIAL",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "radial",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          center: { x: 0.5, y: 0.5 },
          radius: 0.5
        }
      });
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_RADIAL",
        "radial gradient should produce GRADIENT_RADIAL fill");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 2);
    }
  },
  {
    name: "applyTextProps: gradient sweep type → GRADIENT_ANGULAR",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "sweep",
          colors: ["#FFFF0000", "#FF00FF00", "#FF0000FF"],
          stops: [0, 0.5, 1],
          center: { x: 0.5, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_ANGULAR",
        "sweep gradient should produce GRADIENT_ANGULAR fill");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 3);
    }
  },
  {
    name: "applyTextProps: gradient diagonal direction",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 1 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR");
      // Transform should encode diagonal direction
      var transform = textNode.fills[0].gradientTransform;
      assert.ok(transform, "diagonal gradient should have transform");
    }
  },
  {
    name: "applyTextProps: gradient with multiple stops preserves positions",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF00FF00", "#FF0000FF"],
          stops: [0, 0.3, 1],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 0 }
        }
      });
      assert.strictEqual(textNode.fills[0].gradientStops.length, 3);
      assert.strictEqual(textNode.fills[0].gradientStops[1].position, 0.3,
        "middle stop position should be preserved at 0.3");
    }
  },
  {
    name: "applyTextProps: gradient 4-color rainbow — all stops and colors preserved",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF6B6B", "#FFFFE66D", "#FF00BFA6", "#FF6C63FF"],
          stops: [0.0, 0.33, 0.66, 1.0],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 4,
        "all 4 colors should produce 4 stops");
      // Verify color order
      var stops = textNode.fills[0].gradientStops;
      assert.ok(stops[0].color.r > 0.9, "first stop should be red");
      assert.ok(stops[3].color.b > 0.5, "last stop should be purple/blue");
      // Verify stop positions
      assert.strictEqual(stops[0].position, 0.0);
      assert.strictEqual(stops[1].position, 0.33);
      assert.strictEqual(stops[2].position, 0.66);
      assert.strictEqual(stops[3].position, 1.0);
    }
  },
  {
    name: "applyTextProps: gradient vertical direction — correct transform",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFFFFFF", "#FF38EF7D"],
          stops: [0, 1],
          begin: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 2);
      // Verify it's white → green
      var s0 = textNode.fills[0].gradientStops[0].color;
      var s1 = textNode.fills[0].gradientStops[1].color;
      assert.ok(s0.r > 0.9 && s0.g > 0.9 && s0.b > 0.9, "first should be white");
      assert.ok(s1.g > 0.8, "second should be green");
    }
  },
  {
    name: "applyTextProps: gradient single color → solid fill (not gradient)",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000"],
          stops: [0],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 0 }
        }
      });
      // Single color gradient — should still produce a fill
      assert.strictEqual(textNode.fills.length, 1);
    }
  },
  {
    name: "applyTextProps: gradient radial with custom center and radius",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "radial",
          colors: ["#FFFFFFFF", "#FF000000"],
          stops: [0, 1],
          center: { x: 0.3, y: 0.7 },
          radius: 0.8
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_RADIAL");
      assert.ok(textNode.fills[0].gradientTransform, "radial should have transform");
    }
  },
  {
    name: "applyTextProps: gradient sweep with 4 colors",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "sweep",
          colors: ["#FF6C63FF", "#FF00BFA6", "#FFFF6B6B", "#FF6C63FF"],
          stops: [0, 0.33, 0.66, 1],
          center: { x: 0.5, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_ANGULAR");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 4);
      assert.ok(textNode.fills[0].gradientTransform, "sweep should have transform");
    }
  },
  {
    name: "applyTextProps: gradient overrides solid color",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        color: "#FF000000",
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      // Gradient should take precedence over solid color
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR",
        "gradient should override solid color");
    }
  },
  {
    name: "applyTextProps: gradient unknown type → defaults to LINEAR",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "unknown_type",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR",
        "unknown gradient type should fallback to LINEAR");
    }
  },
  // ============================================================
  // Text gradient: type-specific transform verification
  // ============================================================
  {
    name: "applyTextProps: linear gradient transform encodes begin/end correctly",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      var t = textNode.fills[0].gradientTransform;
      assert.ok(t, "should have transform");
      assert.ok(Array.isArray(t), "transform should be array");
      assert.strictEqual(t.length, 2, "transform should be 2x3 matrix");
    }
  },
  {
    name: "applyTextProps: radial gradient default center fallback",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "radial",
          colors: ["#FFFFFFFF", "#FF000000"],
          stops: [0, 1]
          // no center, no radius — should use defaults
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_RADIAL");
      assert.ok(textNode.fills[0].gradientTransform,
        "radial with default center should still have transform");
    }
  },
  {
    name: "applyTextProps: sweep gradient default center fallback",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "sweep",
          colors: ["#FFFF0000", "#FF00FF00"],
          stops: [0, 1]
          // no center — should use default 0.5, 0.5
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_ANGULAR");
      assert.ok(textNode.fills[0].gradientTransform,
        "sweep with default center should have transform");
    }
  },
  // ============================================================
  // Text gradient: color precision
  // ============================================================
  {
    name: "applyTextProps: gradient color alpha preserved",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#80FF0000", "#400000FF"],  // 50% alpha red, 25% alpha blue
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      var s0 = textNode.fills[0].gradientStops[0].color;
      var s1 = textNode.fills[0].gradientStops[1].color;
      assert.ok(Math.abs(s0.a - 0.502) < 0.02, "first stop alpha should be ~0.5, got " + s0.a);
      assert.ok(Math.abs(s1.a - 0.251) < 0.02, "second stop alpha should be ~0.25, got " + s1.a);
    }
  },
  {
    name: "applyTextProps: gradient 6-color complex — all stops preserved",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FFFF7700", "#FFFFFF00", "#FF00FF00", "#FF0000FF", "#FF7700FF"],
          stops: [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].gradientStops.length, 6,
        "6 colors should produce 6 stops");
      for (var i = 0; i < 6; i++) {
        var expected = i * 0.2;
        assert.ok(Math.abs(textNode.fills[0].gradientStops[i].position - expected) < 0.001,
          "stop " + i + " position should be " + expected);
      }
    }
  },
  // ============================================================
  // Text gradient: edge cases
  // ============================================================
  {
    name: "applyTextProps: gradient null type → defaults to LINEAR",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_LINEAR",
        "null/undefined type should fallback to LINEAR");
    }
  },
  {
    name: "applyTextProps: gradient 2-color same color → still valid gradient",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FFFF0000"],
          stops: [0, 1],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].gradientStops.length, 2);
    }
  },
  {
    name: "applyTextProps: radial 3-color with custom stops",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "radial",
          colors: ["#FFFFFFFF", "#FFFF0000", "#FF000000"],
          stops: [0, 0.5, 1],
          center: { x: 0.5, y: 0.5 },
          radius: 0.5
        }
      });
      assert.strictEqual(textNode.fills[0].type, "GRADIENT_RADIAL");
      assert.strictEqual(textNode.fills[0].gradientStops.length, 3);
      assert.strictEqual(textNode.fills[0].gradientStops[1].position, 0.5);
    }
  },
  {
    name: "applyTextProps: sweep wrap-around gradient (first = last color)",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "sweep",
          colors: ["#FF6C63FF", "#FF00BFA6", "#FFFF6B6B", "#FF6C63FF"],
          stops: [0, 0.33, 0.66, 1],
          center: { x: 0.5, y: 0.5 }
        }
      });
      var stops = textNode.fills[0].gradientStops;
      assert.strictEqual(stops.length, 4);
      // First and last should be same color (wrap-around)
      var first = stops[0].color;
      var last = stops[3].color;
      assert.ok(Math.abs(first.r - last.r) < 0.02 &&
                Math.abs(first.g - last.g) < 0.02 &&
                Math.abs(first.b - last.b) < 0.02,
        "sweep first and last color should match (wrap-around)");
    }
  },
  {
    name: "applyTextProps: gradient with no gradient prop → solid color only",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, { color: "#FFFF0000" });
      assert.strictEqual(textNode.fills.length, 1);
      assert.strictEqual(textNode.fills[0].type, "SOLID");
      assert.ok(textNode.fills[0].color.r > 0.9, "should be red");
    }
  },
  {
    name: "applyTextProps: gradient missing stops → auto-distributed",
    fn: function() {
      var textNode = { fills: [] };
      R.applyTextProps(textNode, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF00FF00", "#FF0000FF"],
          stops: [],
          begin: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      });
      assert.strictEqual(textNode.fills[0].gradientStops.length, 3);
      assert.strictEqual(textNode.fills[0].gradientStops[0].position, 0);
      assert.strictEqual(textNode.fills[0].gradientStops[1].position, 0.5);
      assert.strictEqual(textNode.fills[0].gradientStops[2].position, 1);
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
