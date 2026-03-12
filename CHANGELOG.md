# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-03-12

### Added
- `--pixel-ratio` CLI flag for controlling image/icon capture resolution (1.0x–5.0x, default 3.0x)
- Crawler version check — auto-detects outdated crawler and prompts for update
- Multi-app discovery — when multiple Flutter apps are running, lists them for user selection
- Hot Restart detection — polls for isolate change after user restarts the app
- Per-corner border radius support
- Radial gradient support
- Wave clipper support
- Container margin option
- Angle rotation and blur filter support
- Project documentation (README EN/KO, CONTRIBUTING, LICENSE, CHANGELOG)
- GitHub templates (Bug Report, Feature Request, Refactoring, PR template)

### Fixed
- GridView `crossAxisSpacing` now correctly renders in Figma (was being overwritten to 0 by `recalcItemSpacing`)
- MaterialIcons captured at pixelRatio instead of 1.0x (was causing blurry icons)
- Crawler `const` declaration moved below imports (was causing Dart compile error)

### Changed
- Default image capture resolution raised from 2.0x to 3.0x
- Removed `reloadSources` hot reload attempts — directly prompts for Hot Restart instead
- VM Service discovery collects all candidates instead of stopping at the first match

## [0.1.0] - 2025-03-11

### Added
- Initial release
- Widget tree crawler with runtime injection via VM Service
- Layout JSON extraction over WebSocket (JSON-RPC 2.0)
- Figma plugin for reconstructing layouts
- Support for Auto Layout (Row, Column, Wrap)
- Solid color and linear gradient backgrounds
- Border with color, width, and radius
- Elevation / shadow effects
- Text properties (size, weight, color, alignment)
- GridView with `mainAxisSpacing`
- Padding support
