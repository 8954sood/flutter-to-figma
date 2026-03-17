# Flutter to Figma

![version](https://img.shields.io/badge/version-0.2.0-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![platform](https://img.shields.io/badge/platform-Figma%20Plugin-blueviolet)

[한국어](./README.ko.md)

Convert running Flutter screens into editable Figma layouts. The tool crawls the Flutter widget tree at runtime, extracts layout and style information as JSON, and reconstructs it in Figma via a plugin.

## How It Works

```
Flutter App (debug)  ──WebSocket──>  Extractor CLI  ──JSON──>  Figma Plugin
       │                                  │                        │
  Widget tree crawled              Connects via VM Service    Rebuilds as
  at runtime                       and injects crawler        Figma Auto Layout
```

1. **Crawler** (`tools/crawler_source.dart`) — Injected into a running Flutter app. Traverses the widget tree and extracts layout, color, border, elevation, and other visual properties.
2. **Extractor** (`tools/export_figma_layout.dart`) — Connects to the Flutter app over WebSocket (JSON-RPC 2.0), injects the crawler, and retrieves the layout JSON.
3. **Figma Plugin** (`figma_plugin/`) — Accepts the JSON and reconstructs the layout as Figma nodes with Auto Layout, fills, strokes, and effects.

## Prerequisites

- [Dart SDK](https://dart.dev/get-dart) (included with Flutter SDK)
- A Flutter app running in **debug mode** (VM Service must be accessible)
- [Figma Desktop](https://www.figma.com/downloads/) app

## Getting Started

### 1. Build the extractor

```bash
dart run tools/merge.dart
```

This generates `tools/generated_export_figma_layout.dart` by combining the crawler source and the extractor template into a single executable.

### 2. Install the Figma plugin

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select `figma_plugin/manifest.json`

### 3. Run your Flutter app

```bash
flutter run
```

Ensure the VM Service URL is visible in the console output (e.g. `http://127.0.0.1:XXXXX/...`).

### 4. Extract layout JSON

```bash
dart run tools/generated_export_figma_layout.dart
```

The tool auto-discovers the running Flutter app, injects the crawler, and outputs the layout JSON.

#### Options

| Flag | Default | Description |
|---|---|---|
| `--pixel-ratio=<value>` | `3.0` | Image/icon capture resolution multiplier (range: 1.0–5.0) |

```bash
# High quality (default 3x)
dart run tools/generated_export_figma_layout.dart

# Maximum quality (5x) — larger JSON, sharper icons
dart run tools/generated_export_figma_layout.dart --pixel-ratio=5

# Smaller output (1x) — faster, lower resolution
dart run tools/generated_export_figma_layout.dart --pixel-ratio=1
```

You can also pass a VM Service URI manually as a positional argument:

```bash
dart run tools/generated_export_figma_layout.dart ws://127.0.0.1:PORT/TOKEN=/ws --pixel-ratio=4
```

> **Hot Restart required:** When the crawler is first injected or updated to a new version, the tool will prompt you to hot restart. Press **Shift+R** in the Flutter terminal (or use the IDE restart button). The tool detects the restart automatically and continues. If the crawler version is already up to date, this step is skipped.

### 5. Import into Figma

1. Open a Figma file
2. Run the **Flutter Screen Rebuilder** plugin (Plugins > Development)
3. Paste the extracted JSON into the plugin UI
4. Click **Render** — the layout is generated on the canvas

## Android Studio / IntelliJ Setup (Optional)

Register the extractor as an External Tool for one-click extraction:

| Field             | Value                                                      |
|-------------------|------------------------------------------------------------|
| Program           | `dart`                                                     |
| Arguments         | `/absolute/path/to/tools/generated_export_figma_layout.dart` |
| Working directory | `$ProjectFileDir$`                                         |

## Supported Properties

| Category   | Properties                                            |
|------------|-------------------------------------------------------|
| Layout     | Auto Layout (Row / Column / Wrap / Stack), Expanded / Flexible (FILL sizing), SizedBox, FittedBox, Width, Height |
| Spacing    | Padding, Margin, itemSpacing (mainAxis, crossAxis)    |
| Background | Solid color, Linear / Radial / Sweep gradient         |
| Border     | Color, Width (uniform + per-side), Per-corner radius  |
| Effects    | Elevation / Shadow, Background blur (BackdropFilter), Opacity |
| Transform  | Rotation                                              |
| Clip       | Rectangle, Rounded rectangle, ClipPath (vector mask)  |
| Text       | Font size, Weight, Color, Alignment, Letter spacing, Line height, RichText (textSpans), Truncation (ellipsis), maxLines |
| Image      | Base64 image fill, BoxFit (contain / cover / fill), Icon image (base64 PNG) |
| Grid       | GridView with mainAxisSpacing and crossAxisSpacing     |
| Widgets    | AppBar (NavigationToolbar), BottomNavigationBar, ListTile, Chip, TextField, Divider |
| Overlay    | Dialog, BottomSheet (STACK with scrim), ModalBarrier detection |
| Visibility | `Visibility(maintainSize: true)` — preserves layout space with opacity 0 |

## Known Limitations

Some Flutter widgets cannot be perfectly reproduced in Figma due to API constraints. See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for details.

## Project Structure

```
flutter-to-figma/
├── tools/
│   ├── crawler/                            # Dart crawler source modules (edit these)
│   ├── test_flutter/                       # Flutter crawler integration tests
│   ├── merge.dart                          # Build script
│   ├── export_figma_layout.dart            # Extractor template
│   ├── crawler_source.dart                 # Generated (do not edit)
│   └── generated_export_figma_layout.dart  # Generated (do not edit)
├── figma_plugin/
│   ├── src/                                # JS plugin source modules (edit these)
│   ├── test/                               # Plugin preprocessing unit + integration tests
│   ├── manifest.json                       # Figma plugin manifest
│   ├── code.js                             # Generated (do not edit)
│   └── ui.html                             # Plugin UI (JSON input + gallery)
├── README.md
├── README.ko.md
├── CHANGELOG.md
├── LICENSE
└── CONTRIBUTING.md
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
