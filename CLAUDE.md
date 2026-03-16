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

## Test

Figma plugin 전처리 파이프라인에 대한 unit + integration snapshot 테스트가 있다.

```
node figma_plugin/test/run.js
```

- **`figma_plugin/src/_03~_07` 수정 후 반드시 테스트 실행**하여 회귀 없는지 확인.
- 스냅샷 갱신: `node figma_plugin/test/run.js --update`
- 필터: `node figma_plugin/test/run.js --filter <pattern>`

### 전체 검증 순서

`figma_plugin/src/` 파일 수정 시 아래 순서를 따른다:

```bash
dart run tools/merge.dart        # 1. 빌드
dart format .                    # 2. 포맷 (변경 없어야 함)
node figma_plugin/test/run.js    # 3. 테스트
```

## Test Project

`testsomething/` contains a test Flutter app. Do NOT modify its code.
