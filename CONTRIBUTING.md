# Contributing

[한국어](#기여-가이드)

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
3. Make your changes
4. Run `dart format tools/` — **required** before committing
5. Test with a Flutter app and verify the Figma output
6. Commit your changes (`git commit -m "feat: add support for ..."`)
7. Push to your fork (`git push origin feature/my-feature`)
8. Open a Pull Request with:
   - **Emulator screenshot** — Flutter app on emulator/simulator
   - **Figma output screenshot** — the result after running the plugin

## Development Setup

```bash
# Clone
git clone https://github.com/<your-fork>/flutter-to-figma.git
cd flutter-to-figma

# Build the extractor
dart run tools/merge.dart

# Install Figma plugin
# Figma > Plugins > Development > Import plugin from manifest
# Select figma_plugin/manifest.json
```

## Project Architecture

| Component | Language | Description |
|-----------|----------|-------------|
| `tools/crawler_source.dart` | Dart | Widget tree crawler — the source of truth |
| `tools/export_figma_layout.dart` | Dart | Extractor template (uses `%%CRAWLER_SOURCE%%` placeholder) |
| `tools/merge.dart` | Dart | Build script that combines crawler + extractor |
| `figma_plugin/code.js` | JavaScript | Figma plugin — builds nodes from JSON |
| `figma_plugin/ui.html` | HTML | Plugin UI |

### Key Workflow

1. Edit `crawler_source.dart` for widget tree extraction changes
2. Edit `code.js` for Figma rendering changes
3. Run `dart run tools/merge.dart` after changing crawler source
4. Test with a Flutter debug app + Figma plugin

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature or widget support
- `fix:` — Bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `docs:` — Documentation only changes

## Code Style

### Dart

You **must** run `dart format` before committing. Unformatted code will not be accepted.

```bash
dart format tools/
```

Verify there are no changes after formatting:

```bash
dart format --output=none --set-exit-if-changed tools/
```

### JavaScript

- 2-space indent, semicolons

---

# 기여 가이드

Flutter to Figma에 관심을 가져주셔서 감사합니다!

## 기여 방법

### 버그 제보

1. 먼저 [기존 이슈](../../issues)를 확인하여 중복을 피해주세요
2. **Bug Report** 템플릿으로 이슈를 열어주세요:
   - Flutter 버전 및 OS
   - 재현 단계
   - **에뮬레이터 스크린샷** — Flutter에서 어떻게 보이는지
   - **Figma 출력 스크린샷** — 플러그인이 어떻게 렌더링했는지
   - 추출된 JSON 및 위젯 코드 (해당되는 경우)

> 스크린샷은 **필수**입니다. 시각적 레이아웃을 변환하는 프로젝트이므로, 원본(에뮬레이터)과 결과(Figma) 모두 확인이 필요합니다.

### 기능 제안

**Feature Request** 템플릿으로 이슈를 열어주세요:
- 위젯 또는 속성 설명
- **에뮬레이터 스크린샷** — Flutter에서 어떻게 보이는지
- 예시 Flutter 위젯 코드

### 변경사항 제출

1. 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/my-feature`)
3. 변경사항을 작성합니다
4. `dart format tools/` 실행 — 커밋 전 **필수**
5. Flutter 앱으로 테스트하고 Figma 출력을 확인합니다
6. 커밋합니다 (`git commit -m "feat: ... 지원 추가"`)
7. 포크에 푸시합니다 (`git push origin feature/my-feature`)
8. 다음을 포함하여 Pull Request를 엽니다:
   - **에뮬레이터 스크린샷** — 에뮬레이터/시뮬레이터의 Flutter 앱
   - **Figma 출력 스크린샷** — 플러그인 실행 후 결과

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다:

- `feat:` — 새 기능 또는 위젯 지원
- `fix:` — 버그 수정
- `refactor:` — 리팩토링
- `docs:` — 문서 변경

## 코드 스타일

### Dart

커밋 전 반드시 `dart format`을 실행해야 합니다. 포맷되지 않은 코드는 머지되지 않습니다.

```bash
dart format tools/
```

포맷 후 변경사항이 없는지 확인:

```bash
dart format --output=none --set-exit-if-changed tools/
```

### JavaScript

- 2-space indent, semicolons
