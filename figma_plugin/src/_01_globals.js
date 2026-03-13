// ============================
// Flutter Layout → Figma (Flat properties schema + Auto-Layout)
// 3-Phase Pipeline: Preprocess → Font Load → Render
// ============================

figma.showUI(__html__, { width: 360, height: 380 });

var loadedFonts = {}; // "family::style" → true
var resolvedFonts = {}; // "family::originalStyle" → actual loaded style
