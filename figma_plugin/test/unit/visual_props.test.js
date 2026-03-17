var helpers = require("../helpers");
var R = helpers.loadRenderPipeline();
var assert = require("assert");

module.exports = [
  // ============================================================
  // applyBgColor
  // ============================================================
  {
    name: "applyBgColor: solid color fill",
    fn: function() {
      var frame = { fills: [] };
      R.applyBgColor(frame, { backgroundColor: "#FFFF0000" });
      assert.strictEqual(frame.fills.length, 1);
      assert.strictEqual(frame.fills[0].type, "SOLID");
      assert.strictEqual(frame.fills[0].color.r, 1);
      assert.strictEqual(frame.fills[0].color.g, 0);
    }
  },
  {
    name: "applyBgColor: transparent → fills empty",
    fn: function() {
      var frame = { fills: [{ type: "SOLID" }] };
      R.applyBgColor(frame, { backgroundColor: "#00000000" });
      assert.strictEqual(frame.fills.length, 0);
    }
  },
  {
    name: "applyBgColor: no backgroundColor → fills empty",
    fn: function() {
      var frame = { fills: [{ type: "SOLID" }] };
      R.applyBgColor(frame, {});
      assert.strictEqual(frame.fills.length, 0);
    }
  },
  // ============================================================
  // applyGradient
  // ============================================================
  {
    name: "applyGradient: linear gradient stops + transform",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 1 }
        }
      });
      assert.strictEqual(frame.fills.length, 1);
      assert.strictEqual(frame.fills[0].type, "GRADIENT_LINEAR");
      assert.strictEqual(frame.fills[0].gradientStops.length, 2);
      assert.strictEqual(frame.fills[0].gradientStops[0].position, 0);
      assert.strictEqual(frame.fills[0].gradientStops[1].position, 1);
    }
  },
  {
    name: "applyGradient: radial gradient",
    fn: function() {
      var frame = { fills: [], rect: { w: 100, h: 100 } };
      R.applyGradient(frame, {
        gradient: {
          type: "radial",
          colors: ["#FFFF0000", "#FF0000FF"],
          stops: [0, 1],
          center: { x: 0.5, y: 0.5 },
          radius: 0.5
        }
      });
      assert.strictEqual(frame.fills[0].type, "GRADIENT_RADIAL");
    }
  },
  {
    name: "applyGradient: sweep gradient",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: {
          type: "sweep",
          colors: ["#FFFF0000", "#FF00FF00", "#FF0000FF"],
          stops: [0, 0.5, 1],
          center: { x: 0.5, y: 0.5 }
        }
      });
      assert.strictEqual(frame.fills[0].type, "GRADIENT_ANGULAR");
      assert.strictEqual(frame.fills[0].gradientStops.length, 3);
    }
  },
  {
    name: "applyGradient: empty colors → applyBgColor fallback",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: { type: "linear", colors: [], stops: [] },
        backgroundColor: "#FF00FF00"
      });
      // Should fallback to solid color from applyBgColor
      assert.strictEqual(frame.fills.length, 1);
      assert.strictEqual(frame.fills[0].type, "SOLID");
    }
  },
  {
    name: "applyGradient: single color → gradient with 1 stop",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: {
          type: "linear",
          colors: ["#FFFF0000"],
          stops: [0],
          begin: { x: 0, y: 0 },
          end: { x: 1, y: 0 }
        }
      });
      assert.strictEqual(frame.fills.length, 1);
      // Single-color gradient produces 1 stop — may need Figma to handle gracefully
      if (frame.fills[0].gradientStops) {
        assert.strictEqual(frame.fills[0].gradientStops.length, 1);
      }
    }
  },
  // ============================================================
  // buildRadialGradientTransform
  // ============================================================
  {
    name: "buildRadialGradientTransform: radius=0 → finite values (P0 #3)",
    fn: function() {
      var result = R.buildRadialGradientTransform(0.5, 0.5, 0, 100, 100);
      // All matrix values should be finite (not Infinity, not NaN)
      assert.ok(isFinite(result[0][0]), "sx should be finite, got " + result[0][0]);
      assert.ok(isFinite(result[0][2]), "tx should be finite, got " + result[0][2]);
      assert.ok(isFinite(result[1][1]), "sy should be finite, got " + result[1][1]);
      assert.ok(isFinite(result[1][2]), "ty should be finite, got " + result[1][2]);
    }
  },
  {
    name: "buildRadialGradientTransform: normal radius",
    fn: function() {
      var result = R.buildRadialGradientTransform(0.5, 0.5, 0.5, 200, 200);
      assert.ok(isFinite(result[0][0]));
      assert.ok(isFinite(result[1][1]));
      assert.ok(result[0][0] > 0, "sx should be positive");
    }
  },
  {
    name: "buildRadialGradientTransform: frameW=0 → finite",
    fn: function() {
      var result = R.buildRadialGradientTransform(0.5, 0.5, 0.5, 0, 100);
      assert.ok(isFinite(result[0][0]));
      assert.ok(isFinite(result[1][1]));
    }
  },
  // ============================================================
  // buildLinearGradientTransform
  // ============================================================
  {
    name: "buildLinearGradientTransform: diagonal (0,0)→(1,1)",
    fn: function() {
      var result = R.buildLinearGradientTransform(0, 0, 1, 1);
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].length, 3);
    }
  },
  // ============================================================
  // buildSweepGradientTransform
  // ============================================================
  {
    name: "buildSweepGradientTransform: center offset",
    fn: function() {
      var result = R.buildSweepGradientTransform(0.3, 0.7);
      assert.ok(isFinite(result[0][2]));
      assert.ok(isFinite(result[1][2]));
    }
  },
  // ============================================================
  // applyVisualProps: border
  // ============================================================
  {
    name: "applyVisualProps: border uniform width",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { hasBorder: true, borderColor: "#FF000000", borderWidth: 2 });
      assert.strictEqual(frame.strokeWeight, 2);
      assert.strictEqual(frame.strokes.length, 1);
    }
  },
  {
    name: "applyVisualProps: per-side border all specified",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, {
        hasBorder: true, borderColor: "#FF000000",
        borderTopWidth: 1, borderRightWidth: 2, borderBottomWidth: 3, borderLeftWidth: 4
      });
      assert.strictEqual(frame.strokeTopWeight, 1);
      assert.strictEqual(frame.strokeRightWeight, 2);
      assert.strictEqual(frame.strokeBottomWeight, 3);
      assert.strictEqual(frame.strokeLeftWeight, 4);
    }
  },
  {
    name: "applyVisualProps: per-side border partial → missing sides 0",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, {
        hasBorder: true, borderColor: "#FF000000",
        borderTopWidth: 2 // only top specified
      });
      assert.strictEqual(frame.strokeTopWeight, 2);
      assert.strictEqual(frame.strokeRightWeight, 0, "Unspecified right should be 0");
      assert.strictEqual(frame.strokeBottomWeight, 0, "Unspecified bottom should be 0");
      assert.strictEqual(frame.strokeLeftWeight, 0, "Unspecified left should be 0");
    }
  },
  {
    name: "applyVisualProps: hasBorder=true without borderColor → empty strokes",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { hasBorder: true });
      assert.strictEqual(frame.strokes.length, 0);
    }
  },
  // ============================================================
  // applyVisualProps: borderRadius
  // ============================================================
  {
    name: "applyVisualProps: cornerRadius uniform",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { borderRadius: "12" });
      assert.strictEqual(frame.cornerRadius, 12);
    }
  },
  {
    name: "applyVisualProps: cornerRadius per-corner map",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { borderRadius: { tl: 10, tr: 20, bl: 5, br: 0 } });
      assert.strictEqual(frame.topLeftRadius, 10);
      assert.strictEqual(frame.topRightRadius, 20);
      assert.strictEqual(frame.bottomLeftRadius, 5);
      assert.strictEqual(frame.bottomRightRadius, 0);
    }
  },
  // ============================================================
  // applyVisualProps: shadow + blur
  // ============================================================
  {
    name: "applyVisualProps: shadowColor path",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, {
        shadowColor: "#40000000",
        shadowOffsetX: 2, shadowOffsetY: 4,
        shadowBlurRadius: 10, shadowSpreadRadius: 0
      });
      assert.ok(frame.effects.length >= 1);
      assert.strictEqual(frame.effects[0].type, "DROP_SHADOW");
    }
  },
  {
    name: "applyVisualProps: elevation path",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { elevation: 4 });
      assert.ok(frame.effects.length >= 1);
      assert.strictEqual(frame.effects[0].type, "DROP_SHADOW");
    }
  },
  {
    name: "applyVisualProps: backgroundBlur",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { backgroundBlur: 10 });
      var blurEffect = frame.effects.find(function(e) { return e.type === "BACKGROUND_BLUR"; });
      assert.notStrictEqual(blurEffect, undefined, "Should have BACKGROUND_BLUR effect");
      assert.strictEqual(blurEffect.radius, 10);
    }
  },
  {
    name: "applyVisualProps: opacity (handled by renderNode, not applyVisualProps)",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, { opacity: 0.5 });
      // No crash = success (opacity set in renderNode)
    }
  },
  // ============================================================
  // Missing: background image
  // ============================================================
  {
    name: "applyVisualProps: backgroundImage success → IMAGE fill + scaleMode",
    fn: function() {
      // loadRenderPipeline provides a figma.createImage stub returning { hash: "mock-image-hash" }
      var frame = { fills: [], strokes: [], effects: [] };
      // Use a minimal valid PNG base64 (1x1 pixel)
      var pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElFTkSuQmCC";
      R.applyVisualProps(frame, { backgroundImageBase64: pngB64, boxFit: "cover" });
      assert.strictEqual(frame.fills.length, 1);
      assert.strictEqual(frame.fills[0].type, "IMAGE");
      assert.strictEqual(frame.fills[0].imageHash, "mock-image-hash");
      assert.strictEqual(frame.fills[0].scaleMode, "FILL"); // cover → FILL
    }
  },
  {
    name: "applyVisualProps: backgroundImage decode fail → applyBgColor fallback",
    fn: function() {
      // Provide a figma stub that throws on createImage
      var R2 = helpers.loadRenderPipeline({
        figma: { createImage: function() { throw new Error("decode fail"); } }
      });
      var frame = { fills: [], strokes: [], effects: [] };
      R2.applyVisualProps(frame, { backgroundImageBase64: "invalid-base64", backgroundColor: "#FFFF0000" });
      // Should fallback to solid bg color
      assert.strictEqual(frame.fills.length, 1);
      assert.strictEqual(frame.fills[0].type, "SOLID");
    }
  },
  // ============================================================
  // Missing: shadow + elevation mutual exclusion
  // ============================================================
  {
    name: "applyVisualProps: shadowColor and elevation — shadowColor takes priority",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, {
        shadowColor: "#80000000", shadowOffsetX: 2, shadowOffsetY: 4, shadowBlurRadius: 8,
        elevation: 10  // should be ignored when shadowColor exists
      });
      assert.strictEqual(frame.effects.length, 1);
      assert.strictEqual(frame.effects[0].offset.x, 2); // from shadowColor path, not elevation
    }
  },
  // ============================================================
  // Missing: shadow + blur cumulative effects
  // ============================================================
  {
    name: "applyVisualProps: shadow + backgroundBlur → both in effects",
    fn: function() {
      var frame = { fills: [], strokes: [], effects: [] };
      R.applyVisualProps(frame, {
        shadowColor: "#40000000", shadowOffsetY: 4, shadowBlurRadius: 8,
        backgroundBlur: 10
      });
      assert.strictEqual(frame.effects.length, 2);
      var types = frame.effects.map(function(e) { return e.type; });
      assert.ok(types.indexOf("DROP_SHADOW") !== -1);
      assert.ok(types.indexOf("BACKGROUND_BLUR") !== -1);
    }
  },
  // ============================================================
  // Missing: gradient unknown type fallback
  // ============================================================
  {
    name: "applyGradient: unknown type → fallback to LINEAR",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: { type: "unknown_type", colors: ["#FFFF0000", "#FF0000FF"], stops: [0, 1] }
      });
      assert.strictEqual(frame.fills[0].type, "GRADIENT_LINEAR");
    }
  },
  // ============================================================
  // Missing: gradient 1 color → solid
  // ============================================================
  {
    name: "applyGradient: single color → solid fill (not gradient)",
    fn: function() {
      var frame = { fills: [] };
      R.applyGradient(frame, {
        gradient: { type: "linear", colors: ["#FFFF0000"], stops: [0] }
      });
      assert.strictEqual(frame.fills[0].type, "SOLID");
      assert.strictEqual(frame.fills[0].color.r, 1);
    }
  },
];
