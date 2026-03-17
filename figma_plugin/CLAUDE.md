# figma_plugin/ — Figma Plugin

## Overview

Receives crawler-extracted JSON (Schema v2) and reconstructs it as Figma Auto-Layout frames.
Figma manifest only supports a single `code.js`, so sources are split into `src/` modules during development and merged at build time.

## File Structure

### Editable

- **`src/`** — JS source modules (see below)
- **`ui.html`** — Plugin UI (JSON input form + JSON gallery with drag-and-drop reorder)
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
| `_03_flatten_merge.js` | `isEmptyProps`, `flattenEmptyWrappers` (preserves `widgetName` nodes), `shouldStopChain` (detects padding+visual size mismatch, alignment mismatch), `calculateImplicitPadding`, `mergeChainIntoInnermost` (removes stretch FILL when final crossAxisAlignment is center/end), `mergeWrapperChains`, `mergePropsInto` |
| `_04_overlay_detect.js` | `isScrimNode`, `detectOverlays` — ModalBarrier 감지 및 Stack 변환. 라우트 전환(mainWrapper 없음) vs 바텀시트/다이얼로그(mainWrapper 있음) 구분. 이중 ModalBarrier 재귀 처리 |
| `_05_named_widgets.js` | `preprocessNamedWidgets`, `handleListTile` (`groupChildrenByXRange`, `buildGroupColumns`, `assignFlexGrowToWidest`), `handleChip` (`findDecoNode`, `findNoneFrame`, `filterChipChildren`, `calculateBoundingPadding`), `handleNavigationToolbar` (`classifyToolbarChildren`, `normalizeBackButton`, `detectCenterTitle`, `markTitleTruncation`, `markTitleCenter`, `getTitleFontMetrics`, `buildCenteredToolbar`, `buildLeftAlignedToolbar`), `handleBottomNavigationBar`, `applyAlignByLayoutDir` |
| `_06_layout_inference.js` | `sortChildrenByAxis`, `isMonotonicallyIncreasing`, `inferMissingLayout` |
| `_07_spacers_cleanup.js` | `isSpacerProps`, `isSpacer` (ignores layout-only props), `mostCommonValue`, `convertSpacersToItemSpacing` (uniform pattern only), `isEmptyLeaf`, `convertEdgeEmptyFramesToPadding`, `capPaddingToRect`, `removeEmptyLeaves` (preserves spacer-sized Frames), `recalcItemSpacing` (removes spacer children, restores if itemSpacing=0) |
| `_08_sizing.js` | `assignImageSizing`, `assignTextSizing`, `assignFrameSizing` (sole Expanded → FILL, `!parentIsAutoSize` guard), `applySizedBoxOverrides`, `propagateWrapFlags`, `propagateExpandedFill` (same-axis upward propagation, stops at center/end parents), `assignSizingHints` — determines FILL/HUG/FIXED |
| `_09_helpers.js` | `isTransparent`, `generateNodeName`, `parseBorderRadius` |
| `_10_fonts.js` | `preloadFonts` — loads fonts via Figma API (cached in `loadedFonts`) |
| `_11_render.js` | `renderWholeLayout` (returns `screenFrame`), `countNodes`, `renderNode` — creates Figma nodes |
| `_12_visual_props.js` | `applyVisualProps`, `applyBgColor`, `applyGradient`, gradient transform builders |
| `_13_autolayout.js` | `applyAutoLayout`, `applySizing` |
| `_14_text_image.js` | `applyTextProps`, `applyImageProps` |
| `_15_entry.js` | clientStorage helpers (`loadJsonList`, `saveJsonList`, `sendJsonListToUI`, `generateId`, `extractJsonName`), `figma.ui.onmessage` handler — message types below |

## Message Protocol (UI ↔ Plugin)

| Direction | type | Data |
|-----------|------|------|
| UI → Plugin | `render-flutter-layout` | `{ json }` — single render |
| UI → Plugin | `render-all-layouts` | (none) — render all saved JSONs side-by-side with yield-to-UI |
| UI → Plugin | `render-gallery-item` | `{ id }` — render specific saved item |
| UI → Plugin | `save-json` | `{ name, json }` |
| UI → Plugin | `update-json` | `{ id, name, json }` |
| UI → Plugin | `rename-json` | `{ id, name }` |
| UI → Plugin | `delete-json` | `{ id }` |
| UI → Plugin | `reorder-json` | `{ fromId, toId }` — drag-and-drop reorder |
| UI → Plugin | `load-json-list` | (none) |
| UI → Plugin | `load-json-item` | `{ id }` |
| UI → Plugin | `close` | (none) |
| Plugin → UI | `json-list` | `{ items: [...] }` |
| Plugin → UI | `json-item` | `{ id, name, json }` |

Storage: `figma.clientStorage` key `"savedJsonList"` — persists across plugin reinstalls.

## Render Pipeline

3-Phase Pipeline: **Preprocess → Font Load → Render**

1. **Phase 0** (`_02`): `normalizeSchemaV2` — converts Schema v2 structs to flat properties
2. **Phase 1** (`_03`–`_08`): Preprocessing
   - `flattenEmptyWrappers` → `mergeWrapperChains` → `detectOverlays` → `preprocessNamedWidgets` → `inferMissingLayout` → `convertSpacersToItemSpacing` → `removeEmptyLeaves` → `recalcItemSpacing` → `assignSizingHints`
3. **Phase 2** (`_10`): `preloadFonts` — loads required fonts via Figma API
4. **Phase 3** (`_11`–`_14`): `renderWholeLayout` → recursive `renderNode` → Figma node creation + property application

## Preprocessing Notes

### flattenEmptyWrappers (`_03`)
- Nodes with `widgetName` (e.g., ModalBarrier, AppBar) are always preserved — even with empty props and 0 children. Required for `detectOverlays` to find ModalBarrier.

### mergeWrapperChains (`_03`)
- **Padding wrapper + visual child**: When outer has padding, inner has visual (bg/border/radius), and size difference > 4px → chain is **stopped** (not merged). The padding wrapper is preserved as a separate Frame. This handles the `Padding(16) + Container(decoration)` pattern correctly.
- **Absorb**: When outer has no visual and inner has visual, inner is absorbed into the chain. Only applies when sizes are similar (difference ≤ 4px).
- **Center alignment FILL cleanup**: After chain merge, if final `crossAxisAlignment` is `center`/`end`, stretch-originated `sizingH`/`sizingV` FILL is removed. Prevents dialogs from stretching to parent width.

### detectOverlays (`_04`)
- **Route transition**: `[transparent_frame, ModalBarrier, Scaffold]` — ModalBarrier 앞에 실제 콘텐츠 없음 → Stack 생성하지 않고 Scaffold만 남김.
- **Bottom sheet / Dialog**: `[Scaffold, ModalBarrier, overlay_content]` — 실제 콘텐츠 있음 → STACK 변환 (`isStack: true`). Bottom sheet은 `mainAxisAlignment: "end"`, dialog은 `"center"`.
- **Dual ModalBarrier**: Route transition + overlay가 동시에 있을 때, route transition 처리 후 `detectOverlays` 재귀 호출하여 두 번째 ModalBarrier도 처리.

### Sizing (`_08`)
- **Sole Expanded → FILL**: `flexGrow > 0 && isTight && isSoleFlexChild && !parentIsAutoSize` → main axis FILL. Dialog 등 `mainAxisSize: AUTO/min` 부모에서는 FILL 안 함.
- **Multiple Expanded → FIXED**: 여러 flex 자식이 있으면 비율 보존을 위해 FIXED 유지.
- **FILL upward propagation** (`propagateExpandedFill`): 자식에 FILL이 있으면 부모도 FILL로 승격. 같은 축 방향만 전파 (Column→Column OK, Row→Column 안 됨). `mainAxisAlignment: center/end` 부모에서 전파 중단 (바텀시트/다이얼로그 보호).

### Spacer Handling (`_06`, `_07`)
- **`inferMissingLayout`**: Does NOT add `layoutMode` to childless Frames (protects spacer recognition).
- **`isSpacer`**: Ignores layout-only properties (`sizingH`, `sizingV`, `flexGrow`, `flexFit`, `alignSelf`, `layoutMode`) — these don't disqualify spacer detection.
- **`convertSpacersToItemSpacing`**: Only converts when spacers exist between ALL adjacent non-spacer pairs (uniform pattern). If spacers exist between only some pairs (e.g., Row with flexGrow Spacer + SizedBox), spacers are preserved as children.
- **`recalcItemSpacing`**: Temporarily removes spacer children, calculates gaps. If `itemSpacing > 0`, removal is finalized (margin gaps handle spacing). If `itemSpacing = 0`, spacers are restored (spacer Frames are the only spacing source).
- **`removeEmptyLeaves`**: Preserves middle empty Frames with spacer dimensions (main axis ≤ 50px, cross axis ≤ 1px).

## Test

Preprocessing pipeline (`_03`–`_08`) unit + integration snapshot tests.

```
node figma_plugin/test/run.js
```

- Run after modifying `src/_03~_08`
- Update snapshots: `node figma_plugin/test/run.js --update`
- Filter: `node figma_plugin/test/run.js --filter <pattern>`

### Structure

```
test/
  run.js                          # Test runner (Node.js built-ins only)
  helpers.js                      # loadPipeline, runPreprocess, deepEqual, findNode
  unit/
    utils.test.js                 # parseFlutterColor, isTransparent, mapTextAlign, parseBorderRadius, flattenEmptyWrappers, ...
    flatten_merge.test.js         # normalizeSchemaV2, findDecoNode, handleBottomNavigationBar, ...
    merge_wrapper.test.js         # shouldStopChain, calculateImplicitPadding, mergePropsInto, padding wrapper, stretch+center FILL cleanup, ...
    named_widgets.test.js         # classifyToolbarChildren, normalizeBackButton, ...
    overlay_detect.test.js        # isScrimNode, detectOverlays, bottom sheet/dialog patterns, dual ModalBarrier, route transition
    spacers.test.js               # isSpacer, convertSpacersToItemSpacing, recalcItemSpacing, pipeline patterns
    layout_inference.test.js      # inferMissingLayout
    sizing.test.js                # assignImageSizing, assignTextSizing, ...
    alignment_sizing.test.js      # Expanded→FILL, FILL propagation, dialog/bottom sheet guard, ...
    autolayout.test.js            # applyAutoLayout, applySizing
    text_image.test.js            # applyTextProps, applyImageProps
    visual_props.test.js          # applyVisualProps, applyBgColor, applyGradient, ...
  integration/
    pipeline.test.js              # Full pipeline snapshot tests
    fixtures/*.json               # Input JSON fixtures (13)
    snapshots/*.snap.json         # Expected output (generate with --update)
```

### Writing Tests

- Each file exports `module.exports = [{name, fn}]`
- `fn` receives `{updateSnapshots}` (used by integration tests only)
- No external dependencies — only `assert`, `fs`, `path`

## Notes

- `figma.showUI()` in `_01_globals.js` must be present in the merged output (plugin initialization)
- `figma.ui.onmessage` in `_15_entry.js` is the communication entry point with the UI
- Global variables `loadedFonts` and `resolvedFonts` are shared across modules
