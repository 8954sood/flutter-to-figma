# Flutter-to-Figma

Crawls a Flutter app's render tree to extract JSON, then reconstructs it as Auto-Layout-based frames in a Figma plugin.

## Build

Sources are split into modules and merged into single files at build time.

```
dart run tools/merge.dart
```

This single command generates three outputs:
1. `tools/crawler/_*.dart` → `tools/crawler_source.dart`
2. `figma_plugin/src/_*.js` → `figma_plugin/code.js`
3. `crawler_source.dart` + `export_figma_layout.dart` → `generated_export_figma_layout.dart`

## Code Editing Rules

- **Crawler (Dart)**: Edit files in `tools/crawler/_*.dart`. Do NOT edit `tools/crawler_source.dart` — it is generated.
- **Figma plugin (JS)**: Edit files in `figma_plugin/src/_*.js`. Do NOT edit `figma_plugin/code.js` — it is generated.
- **Always run `dart run tools/merge.dart`** after making changes to regenerate output files.
- Running `dart format .` after merge must produce no changes (idempotent).

## Generated Files (Do NOT Edit)

- `tools/crawler_source.dart`
- `tools/generated_export_figma_layout.dart`
- `figma_plugin/code.js`

## Directory Structure

```
tools/
  crawler/           # Dart crawler source modules (edit these)
  merge.dart         # Build script
  export_figma_layout.dart  # CLI skeleton (contains %%CRAWLER_SOURCE%% placeholder)
figma_plugin/
  src/               # JS plugin source modules (edit these)
  manifest.json      # Figma plugin manifest
  ui.html            # Plugin UI
```

## Test Project

`testsomething/` contains a test Flutter app. Do NOT modify its code.
