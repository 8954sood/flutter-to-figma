# Contributing

Thank you for your interest in contributing to Flutter to Figma!

## How to Contribute

### Reporting Bugs

1. Check [existing issues](../../issues) first to avoid duplicates
2. Open a new issue using the **Bug Report** template with:
   - Flutter version and OS
   - Steps to reproduce
   - **Emulator screenshot** — how it looks in Flutter
   - **Figma output screenshot** — how the plugin rendered it
   - Extracted JSON and widget code (if relevant)

> Screenshots are **required**. This project converts visual layouts, so we need to see both the source (emulator) and the result (Figma) to understand the issue.

### Suggesting Features

Open an issue using the **Feature Request** template:
- Description of the widget or property
- **Emulator screenshot** showing how it looks in Flutter
- Example Flutter widget code

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes (edit source modules, NOT generated files)
4. Build and verify: `dart run tools/merge.dart && dart format .`
5. Run all tests (see [Testing](#testing) below)
6. Test with a Flutter app and verify the Figma output
7. Commit your changes (`git commit -m "feat: add support for ..."`)
8. Push to your fork (`git push origin feature/my-feature`)
9. Open a Pull Request with:
   - **Emulator screenshot** — Flutter app on emulator/simulator
   - **Figma output screenshot** — the result after running the plugin

## Development Setup

```bash
# Clone
git clone https://github.com/<your-fork>/flutter-to-figma.git
cd flutter-to-figma

# Build (generates code.js, crawler_source.dart, etc.)
dart run tools/merge.dart

# Install Figma plugin
# Figma > Plugins > Development > Import plugin from manifest
# Select figma_plugin/manifest.json

# Install Flutter test dependencies
cd tools/test_flutter && flutter pub get && cd ../..
```

## Project Architecture

```
tools/
  crawler/              # Dart crawler source modules (edit these)
  merge.dart            # Build script (Step A–D)
  export_figma_layout.dart  # CLI skeleton (%%CRAWLER_SOURCE%% placeholder)
  test_flutter/         # Flutter crawler integration tests
figma_plugin/
  src/                  # JS plugin source modules (edit these)
  test/                 # Plugin preprocessing unit + integration tests
  manifest.json         # Figma plugin manifest
  ui.html               # Plugin UI
```

| Component | Language | Edit | Description |
|-----------|----------|------|-------------|
| `tools/crawler/_*.dart` | Dart | ✅ | Widget tree crawler modules |
| `figma_plugin/src/_*.js` | JS | ✅ | Figma plugin preprocessing + rendering modules |
| `tools/crawler_source.dart` | Dart | ❌ | Generated — merged crawler output |
| `figma_plugin/code.js` | JS | ❌ | Generated — merged plugin output |
| `tools/generated_export_figma_layout.dart` | Dart | ❌ | Generated — final executable |
| `tools/test_flutter/lib/crawler_source.dart` | Dart | ❌ | Generated — test copy |

### Build Pipeline

`dart run tools/merge.dart` performs 4 steps:

1. **Step A**: `tools/crawler/_*.dart` → `tools/crawler_source.dart`
2. **Step B**: `figma_plugin/src/_*.js` → `figma_plugin/code.js`
3. **Step C**: Embed crawler source into `generated_export_figma_layout.dart`
4. **Step D**: Copy `crawler_source.dart` → `tools/test_flutter/lib/` (for tests)

### Key Workflow

1. Edit source modules in `tools/crawler/` or `figma_plugin/src/`
2. Run `dart run tools/merge.dart` to regenerate output files
3. Run `dart format .` — must produce no changes
4. Run tests (see below)
5. Test visually with a Flutter debug app + Figma plugin

## Testing

### Figma Plugin Tests (JS)

Unit tests and integration snapshot tests for the preprocessing pipeline (`_03`–`_07`).

```bash
node figma_plugin/test/run.js              # Run all tests
node figma_plugin/test/run.js --update     # Update snapshots
node figma_plugin/test/run.js --filter <pattern>  # Filter by name
```

### Flutter Crawler Tests (Dart)

Integration tests that build widget trees via `pumpWidget` and run the crawler.

```bash
cd tools/test_flutter && flutter test              # Run all tests
UPDATE_SNAPSHOTS=1 flutter test                    # Update snapshots
cd ../..
```

### Full Verification

Run this after any change to ensure nothing is broken:

```bash
dart run tools/merge.dart && dart format .
node figma_plugin/test/run.js
cd tools/test_flutter && flutter test && cd ../..
```

> **Important**: Always run `dart run tools/merge.dart` before testing. The crawler tests use a copy of `crawler_source.dart` (Step D) — if you skip the build, tests run against stale code.

### When Modifying Figma Plugin (`figma_plugin/src/`)

```bash
dart run tools/merge.dart
dart format .
node figma_plugin/test/run.js
```

### When Modifying Crawler (`tools/crawler/`)

```bash
dart run tools/merge.dart
dart format .
cd tools/test_flutter && flutter test && cd ../..
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature or widget support
- `fix:` — Bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `docs:` — Documentation only changes

## Code Style

### Dart

You **must** run `dart format .` before committing. Unformatted code will not be accepted.

```bash
dart format .
dart format --output=none --set-exit-if-changed .
```

### JavaScript

- 2-space indent, semicolons
- `var` declarations (no `let`/`const` — Figma plugin sandbox compatibility)
- Function declarations (hoisted, merge-order independent)
