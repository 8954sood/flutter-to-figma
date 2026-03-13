# figma_plugin/ — Figma Plugin

## Overview

Receives crawler-extracted JSON (Schema v2) and reconstructs it as Figma Auto-Layout frames.
Figma manifest only supports a single `code.js`, so sources are split into `src/` modules during development and merged at build time.

## File Structure

### Editable

- **`src/`** — JS source modules (see below)
- **`ui.html`** — Plugin UI (JSON input form)
- **`manifest.json`** — Figma plugin manifest

### Generated (Do NOT Edit)

- `code.js` — Merged output of `src/_*.js`

## src/ Module Details

Files are sorted by name and concatenated. JS function declarations are hoisted, so merge order does not affect functionality. Arranged as: utilities → preprocessing → rendering → entry.

| File | Contents |
|------|----------|
| `_00_utils.js` | `parseFlutterColor`, `resolveFont`, `mapTextAlign`, `mapImageFit`, `mapBoxFitToScaleMode`, `mapMainAxisAlign`, `mapCrossAxisAlign`, `base64ToUint8Array` |
| `_01_globals.js` | `figma.showUI(...)`, `var loadedFonts`, `var resolvedFonts` |
| `_02_schema.js` | `normalizeSchemaV2` — Schema v2 → flat properties conversion |
| `_03_flatten_merge.js` | `isEmptyProps`, `flattenEmptyWrappers`, `mergeWrapperChains`, `mergePropsInto` |
| `_04_named_widgets.js` | `preprocessNamedWidgets`, `handleListTile`, `handleChip`, `applyAlignByLayoutDir`, `handleNavigationToolbar`, `handleBottomNavigationBar` |
| `_05_layout_inference.js` | `sortChildrenByAxis`, `isMonotonicallyIncreasing`, `inferMissingLayout` |
| `_06_spacers_cleanup.js` | `isSpacer`, `mostCommonValue`, `convertSpacersToItemSpacing`, `isEmptyLeaf`, `removeEmptyLeaves`, `recalcItemSpacing` |
| `_07_sizing.js` | `assignSizingHints` — determines FILL/HUG/FIXED |
| `_08_helpers.js` | `isTransparent`, `generateNodeName`, `parseBorderRadius` |
| `_09_fonts.js` | `preloadFonts` — loads fonts via Figma API |
| `_10_render.js` | `renderWholeLayout`, `countNodes`, `renderNode` — creates Figma nodes |
| `_11_visual_props.js` | `applyVisualProps`, `applyBgColor`, `applyGradient`, gradient transform builders |
| `_12_autolayout.js` | `applyAutoLayout`, `applySizing` |
| `_13_text_image.js` | `applyTextProps`, `applyImageProps` |
| `_14_entry.js` | `figma.ui.onmessage` handler — receives JSON, kicks off render pipeline |

## Render Pipeline

3-Phase Pipeline: **Preprocess → Font Load → Render**

1. **Phase 0** (`_02`): `normalizeSchemaV2` — converts Schema v2 structs to flat properties
2. **Phase 1** (`_03`–`_07`): Preprocessing
   - `flattenEmptyWrappers` → `mergeWrapperChains` → `preprocessNamedWidgets` → `inferMissingLayout` → `convertSpacersToItemSpacing` → `removeEmptyLeaves` → `recalcItemSpacing` → `assignSizingHints`
3. **Phase 2** (`_09`): `preloadFonts` — loads required fonts via Figma API
4. **Phase 3** (`_10`–`_13`): `renderWholeLayout` → recursive `renderNode` → Figma node creation + property application

## Notes

- `figma.showUI()` in `_01_globals.js` must be present in the merged output (plugin initialization)
- `figma.ui.onmessage` in `_14_entry.js` is the communication entry point with the UI
- Global variables `loadedFonts` and `resolvedFonts` are shared across modules
