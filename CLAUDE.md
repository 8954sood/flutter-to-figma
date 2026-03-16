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
4. `crawler_source.dart` → `tools/test_flutter/lib/crawler_source.dart` (테스트용 복사)

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
  test_flutter/      # Flutter 크롤러 통합 테스트 패키지
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

### 크롤러 통합 테스트 (Flutter)

`tools/crawler/_*.dart` 수정 후 크롤러 출력을 검증한다.

```bash
cd tools/test_flutter && flutter test
```

- 스냅샷 갱신: `UPDATE_SNAPSHOTS=1 flutter test`
- `pumpWidget`으로 위젯 트리 구성 → `figmaExtractorEntryPoint()` 호출 → JSON 구조 검증

### 전체 검증 순서

`figma_plugin/src/` 파일 수정 시:

```bash
dart run tools/merge.dart        # 1. 빌드
dart format .                    # 2. 포맷 (변경 없어야 함)
node figma_plugin/test/run.js    # 3. Figma 플러그인 테스트
```

`tools/crawler/_*.dart` 수정 시:

```bash
dart run tools/merge.dart                          # 1. 빌드 (Step D: 테스트용 복사 포함)
dart format .                                      # 2. 포맷
cd tools/test_flutter && flutter test && cd ../..  # 3. 크롤러 테스트
```

## Test Project

`testsomething/` contains a test Flutter app. Do NOT modify its code.
