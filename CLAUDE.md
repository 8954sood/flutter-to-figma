# Flutter-to-Figma

Crawls a Flutter app's render tree to extract JSON, then reconstructs it as Auto-Layout-based frames in a Figma plugin.

## Build

Sources are split into modules and merged into single files at build time.

```
dart run tools/merge.dart
```

This single command generates four outputs:
1. `tools/crawler/_*.dart` → `tools/crawler_source.dart`
2. `figma_plugin/src/_*.js` → `figma_plugin/code.js`
3. `crawler_source.dart` + `export_figma_layout.dart` → `generated_export_figma_layout.dart`
4. `crawler_source.dart` → `tools/test_flutter/lib/crawler_source.dart` (test copy)

## Code Editing Rules

- **Crawler (Dart)**: Edit files in `tools/crawler/_*.dart`. Do NOT edit `tools/crawler_source.dart` — it is generated.
- **Figma plugin (JS)**: Edit files in `figma_plugin/src/_*.js`. Do NOT edit `figma_plugin/code.js` — it is generated.
- **Always run `dart run tools/merge.dart`** after making changes to regenerate output files.
- Running `dart format .` after merge must produce no changes (idempotent).

## Generated Files (Do NOT Edit)

- `tools/crawler_source.dart`
- `tools/generated_export_figma_layout.dart`
- `tools/test_flutter/lib/crawler_source.dart`
- `figma_plugin/code.js`

## Directory Structure

```
tools/
  crawler/           # Dart crawler source modules (edit these)
  merge.dart         # Build script
  export_figma_layout.dart  # CLI skeleton (contains %%CRAWLER_SOURCE%% placeholder)
  test_flutter/      # Flutter crawler integration tests
figma_plugin/
  src/               # JS plugin source modules (edit these)
  test/              # Plugin preprocessing unit + integration tests
  manifest.json      # Figma plugin manifest
  ui.html            # Plugin UI
```

## Test

### Figma Plugin Tests (JS)

Unit + integration snapshot tests for the preprocessing pipeline.

```
node figma_plugin/test/run.js
```

- **Run after modifying `figma_plugin/src/_03~_08`** to catch regressions.
- Update snapshots: `node figma_plugin/test/run.js --update`
- Filter: `node figma_plugin/test/run.js --filter <pattern>`

### Flutter Crawler Tests (Dart)

Integration tests that build widget trees and run the crawler.

```bash
cd tools/test_flutter && flutter test
```

- Update snapshots: `UPDATE_SNAPSHOTS=1 flutter test`
- Builds widget trees via `pumpWidget` → calls `figmaExtractorEntryPoint()` → verifies JSON structure

### Verification by Change Type

After modifying `figma_plugin/src/`:

```bash
dart run tools/merge.dart        # 1. Build
dart format .                    # 2. Format (must produce no changes)
node figma_plugin/test/run.js    # 3. Plugin tests
```

After modifying `tools/crawler/_*.dart`:

```bash
dart run tools/merge.dart                          # 1. Build (includes Step D test copy)
dart format .                                      # 2. Format
cd tools/test_flutter && flutter test && cd ../..  # 3. Crawler tests
```

Full verification (both):

```bash
dart run tools/merge.dart && dart format .
node figma_plugin/test/run.js
cd tools/test_flutter && flutter test && cd ../..
```

## Test Project

`testsomething/` contains a test Flutter app. Do NOT modify its code.
