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
| `_03_flatten_merge.js` | `isEmptyProps`, `flattenEmptyWrappers`, `shouldStopChain` (detects padding+visual size mismatch), `calculateImplicitPadding`, `mergeChainIntoInnermost`, `mergeWrapperChains`, `mergePropsInto` |
| `_04_named_widgets.js` | `preprocessNamedWidgets`, `handleListTile` (`groupChildrenByXRange`, `buildGroupColumns`, `assignFlexGrowToWidest`), `handleChip` (`findDecoNode`, `findNoneFrame`, `filterChipChildren`, `calculateBoundingPadding`), `handleNavigationToolbar` (`classifyToolbarChildren`, `normalizeBackButton`, `detectCenterTitle`, `markTitleTruncation`, `markTitleCenter`, `getTitleFontMetrics`, `buildCenteredToolbar`, `buildLeftAlignedToolbar`), `handleBottomNavigationBar`, `applyAlignByLayoutDir` |
| `_05_layout_inference.js` | `sortChildrenByAxis`, `isMonotonicallyIncreasing`, `inferMissingLayout` |
| `_06_spacers_cleanup.js` | `isSpacerProps`, `isSpacer` (ignores layout-only props), `mostCommonValue`, `convertSpacersToItemSpacing` (uniform pattern only), `isEmptyLeaf`, `convertEdgeEmptyFramesToPadding`, `capPaddingToRect`, `removeEmptyLeaves` (preserves spacer-sized Frames), `recalcItemSpacing` (removes spacer children, restores if itemSpacing=0) |
| `_07_sizing.js` | `assignImageSizing`, `assignTextSizing`, `assignFrameSizing`, `applySizedBoxOverrides`, `propagateWrapFlags`, `assignSizingHints` — determines FILL/HUG/FIXED |
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

## Preprocessing Notes

### mergeWrapperChains (`_03`)
- **Padding wrapper + visual child**: When outer has padding, inner has visual (bg/border/radius), and size difference > 4px → chain is **stopped** (not merged). The padding wrapper is preserved as a separate Frame. This handles the `Padding(16) + Container(decoration)` pattern correctly.
- **Absorb**: When outer has no visual and inner has visual, inner is absorbed into the chain. Only applies when sizes are similar (difference ≤ 4px).

### Spacer Handling (`_05`, `_06`)
- **`inferMissingLayout`**: Does NOT add `layoutMode` to childless Frames (protects spacer recognition).
- **`isSpacer`**: Ignores layout-only properties (`sizingH`, `sizingV`, `flexGrow`, `flexFit`, `alignSelf`, `layoutMode`) — these don't disqualify spacer detection.
- **`convertSpacersToItemSpacing`**: Only converts when spacers exist between ALL adjacent non-spacer pairs (uniform pattern). If spacers exist between only some pairs (e.g., Row with flexGrow Spacer + SizedBox), spacers are preserved as children.
- **`recalcItemSpacing`**: Temporarily removes spacer children, calculates gaps. If `itemSpacing > 0`, removal is finalized (margin gaps handle spacing). If `itemSpacing = 0`, spacers are restored (spacer Frames are the only spacing source).
- **`removeEmptyLeaves`**: Preserves middle empty Frames with spacer dimensions (main axis ≤ 50px, cross axis ≤ 1px).

## Test

Preprocessing pipeline (`_03`–`_07`) unit + integration snapshot tests.

```
node figma_plugin/test/run.js
```

- Run after modifying `src/_03~_07`
- Update snapshots: `node figma_plugin/test/run.js --update`
- Filter: `node figma_plugin/test/run.js --filter <pattern>`

### Structure

```
test/
  run.js                          # Test runner (Node.js built-ins only)
  helpers.js                      # loadPipeline, runPreprocess, deepEqual, findNode
  unit/
    utils.test.js                 # parseFlutterColor, isTransparent, mapTextAlign, parseBorderRadius, ...
    flatten_merge.test.js         # normalizeSchemaV2, findDecoNode, handleBottomNavigationBar, ...
    merge_wrapper.test.js         # shouldStopChain, calculateImplicitPadding, mergePropsInto, padding wrapper, ...
    named_widgets.test.js         # classifyToolbarChildren, normalizeBackButton, ...
    spacers.test.js               # isSpacer, convertSpacersToItemSpacing, recalcItemSpacing, pipeline patterns
    layout_inference.test.js      # inferMissingLayout
    sizing.test.js                # assignImageSizing, assignTextSizing, ...
  integration/
    pipeline.test.js              # Full pipeline snapshot tests
    fixtures/*.json               # Input JSON fixtures (11)
    snapshots/*.snap.json         # Expected output (generate with --update)
```

### Writing Tests

- Each file exports `module.exports = [{name, fn}]`
- `fn` receives `{updateSnapshots}` (used by integration tests only)
- No external dependencies — only `assert`, `fs`, `path`

## Notes

- `figma.showUI()` in `_01_globals.js` must be present in the merged output (plugin initialization)
- `figma.ui.onmessage` in `_14_entry.js` is the communication entry point with the UI
- Global variables `loadedFonts` and `resolvedFonts` are shared across modules
