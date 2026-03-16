# tools/ — Dart Crawler & Build System

## Overview

Crawler that traverses a Flutter app's RenderObject tree and produces Figma-compatible JSON (Schema v2).
Must be embedded as a single file at runtime, so sources are split into `crawler/` modules during development and merged at build time.

## File Structure

### Editable

- **`merge.dart`** — Build script. Step A (Dart merge) → Step B (JS merge) → Step C (crawler embedding) → Step D (test copy).
- **`export_figma_layout.dart`** — CLI skeleton. Contains `%%CRAWLER_SOURCE%%` placeholder, which merge.dart replaces with the crawler source.
- **`crawler/`** — Crawler source modules (see below).
- **`test_flutter/`** — Flutter crawler integration test package (see below).

### Generated (Do NOT Edit)

- `crawler_source.dart` — Merged output of `crawler/_*.dart`
- `generated_export_figma_layout.dart` — Final executable
- `test_flutter/lib/crawler_source.dart` — Step D copy

## crawler/ Module Details

Files are sorted by name and concatenated. Each file is a code fragment (not an independent Dart library); after merging they form a single valid Dart file.

| File | Contents |
|------|----------|
| `_00_globals.dart` | Imports, version constant, `DesignInfo` class, global Map/Set declarations, `_extractShaderMaskGradients` |
| `_01_precapture.dart` | `_preCaptureImages` — async capture of images, icons, CustomPaint, Checkbox, etc. |
| `_02_element_collector.dart` | `_collectDesignInfoFromElements` — Element tree traversal, collects per-widget design info |
| `_03_visual_helpers.dart` | `_parseBorderRadius`, `_extractBorderRadius`, `_extractGradient`, `_hasContentRecursive`, `_hasVisualProps` |
| `_04_crawl.dart` | `_crawl` main recursive fn + `_extractSliverPadding`, `_crawlThroughSliver`, `_applyFittedBoxScale` |
| `_05_screen_cleanup.dart` | `_keepLastScaffold`, `_containsScaffold` — removes duplicate screens from Navigator stack |
| `_06_entry.dart` | `figmaExtractorEntryPoint`, `_collectScrollPositions` — public entry point |
| `_07_async_export.dart` | `_figmaExportWithImagesAsync`, `figmaStartExportWithImages`, `figmaGetExportResult` — async export API |

## Crawler Architecture

1. **Element tree traversal** (`_02`): Maps widget-level info (decoration, color, border, widget names) to RenderObjects
2. **Async pre-capture** (`_01`): Captures images, icons, CustomPaint, ShaderMask, etc. as base64 PNG
3. **Render tree crawl** (`_04`): Converts RenderObject → Schema v2 JSON nodes recursively, with Smart Flattening and Visual Merge
4. **Post-processing** (`_05`): Removes overlapping Scaffolds

## Test

`test_flutter/` — Flutter crawler integration tests. Builds widget trees via `pumpWidget` and calls `figmaExtractorEntryPoint()` to verify JSON output.

```bash
cd tools/test_flutter && flutter test
```

- Update snapshots: `UPDATE_SNAPSHOTS=1 flutter test`
- Always build (`dart run tools/merge.dart`) before testing — tests use the Step D copy

### Structure

```
test_flutter/
  pubspec.yaml
  lib/
    crawler.dart               # export 'crawler_source.dart'
    crawler_source.dart        # Copied by merge.dart Step D (generated)
  test/
    helpers.dart               # runCrawler, findNode, findAllNodes, matchSnapshot, verifyCrawlerSourceSync
    crawler_test.dart          # testWidgets-based integration tests
    merge_step_d_test.dart     # Step D copy verification tests
    snapshots/*.snap.json      # Snapshots (generate with UPDATE_SNAPSHOTS=1)
```

### Source Sync Guard

`verifyCrawlerSourceSync()` runs in `setUpAll` — it re-merges `crawler/_*.dart` fragments and compares (whitespace-normalized) against `lib/crawler_source.dart`. If they differ, all tests fail with a message to run `dart run tools/merge.dart`.

## Notes

- `_` private access works because fragments merge into a single file (no library-private scope issues)
- Each fragment file must end with a trailing blank line to maintain `dart format` compatibility
- `_00_globals.dart` contains the import statements for the entire merged file
