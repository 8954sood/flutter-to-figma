# v0.2.0

## Highlights

Accurate Figma conversion for complex Flutter screen patterns — Dialog, BottomSheet, Visibility, and Expanded layouts. New JSON Gallery for saving, managing, and batch-rendering multiple screens.

---

## New Features

### Plugin UI — JSON Gallery
- **Gallery tab** for saving and managing multiple JSON layouts
- Add, edit, rename, and delete gallery items
- **Drag-and-drop reorder** with edge auto-scroll
- **Render all**: batch-render saved JSONs side-by-side with UI thread yield to reduce freezing
- Persistent storage via `figma.clientStorage` — survives plugin reinstall

### Crawler — Widget Support
- **Dialog / BottomSheet**: ModalBarrier detection → STACK conversion with scrim + overlay separation
- **Visibility**: `Visibility(maintainSize: true, visible: false)` → opacity 0 with layout space preserved
- **TextField**: Material TextField decoration parsing (background, border, hint text)
- **ListTile / Chip**: Composite widget structure parsing into Auto Layout
- **Expanded / Flexible**: `FlexParentData`-based `flexGrow`, `flexFit`, `sizingH/V` extraction
- **FittedBox / Card / ColoredBox / AspectRatio / RotatedBox**: Additional widget support
- **RangeSlider / Radio**: Custom paint capture
- **Per-corner border radius**: Individual corner radius support
- **Wave clipper / ClipPath**: Vector mask clipping
- **ShaderMask gradient / Sweep gradient**: Additional gradient types
- **Image pixel ratio flag**: `--pixel-ratio` option for icon/image capture resolution (1x–5x)

### Plugin — Preprocessing Pipeline
- **Overlay Detection** (`_04_overlay_detect.js`): ModalBarrier pattern detection, auto-distinguishes route transitions vs bottom sheet/dialog overlays, recursive dual-ModalBarrier handling
- **Expanded → FILL sizing**: Sole flex child (Expanded) converts to Figma FILL → responsive layout
- **FILL upward propagation**: Propagates FILL from Expanded child through parent chain (including HUG wrappers). Same-axis only, stops at center/end aligned parents
- **Dialog/BottomSheet sizing guard**: Prevents FILL in `mainAxisSize: AUTO` parents (avoids content squeeze)
- **Center alignment width preservation**: Removes stretch-originated FILL when final `crossAxisAlignment` is center after chain merge

---

## Bug Fixes

### Preprocessing
- Preserve `widgetName` nodes (ModalBarrier, etc.) in `flattenEmptyWrappers` — fixes overlay detection
- `mergeWrapperChains`: Improved stop logic for padding wrapper + visual child (size diff > 4px)
- `mergePropsInto`: Only outermost center/end overrides inner alignment; stretch does not override center
- Spacer recognition: Ignores layout-only props (`sizingH`, `sizingV`, `flexGrow`), handles mixed gap patterns
- `recalcItemSpacing`: Restores spacers when gap is 0
- Text HUG/FILL: Multi-line text FILL detection, `textTruncate`/`maxLines` handling
- Bottom navigation bar label truncation fix
- Radial gradient / text gradient rendering bug fix

### Crawler
- Fix missing widgets inside unscrolled ScrollView
- Fix grid layout spacing calculation
- Improve font weight → Figma font style mapping
- Stabilize VM Service auto-discovery

---

## Test

- **Figma plugin tests**: 359 (12 unit test files + 13 integration snapshot fixtures)
- **Flutter crawler tests**: 60 (testWidgets-based integration tests)
- Added test coverage for Visibility, Expanded FILL, overlay detection, dialog sizing, FILL propagation guards, and drag-and-drop reorder

---

## Breaking Changes

- None. Fully compatible with v0.1.0 JSON format.

---

## Full Changelog

https://github.com/user/flutter-to-figma/compare/v0.1.0...v0.2.0
