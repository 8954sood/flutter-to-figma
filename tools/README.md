# tools/ — Flutter → Figma 레이아웃 추출 도구

## 파일 구조

```
tools/
├── crawler_source.dart                ← 크롤러 소스 (단일 진실 소스, IDE에서 편집)
├── export_figma_layout.dart           ← CLI 뼈대 (플레이스홀더 포함, 직접 실행 금지)
├── merge.dart                         ← 병합 스크립트
├── generated_export_figma_layout.dart ← merge 출력 (실제 실행 파일)
└── README.md

figma_layout/resources/
└── figma_exporter_inject.dart         ← Figma 플러그인용 (별도 유지)
```

## 빠른 시작

```bash
# 1. 크롤러 수정 (필요 시)
#    → tools/crawler_source.dart 를 IDE에서 편집

# 2. 병합 (크롤러 소스를 CLI에 내장)
dart tools/merge.dart

# 3. Flutter 앱을 디버그 모드로 실행한 뒤, 레이아웃 추출
dart tools/generated_export_figma_layout.dart

# VM Service URI를 수동 지정할 수도 있음
dart tools/generated_export_figma_layout.dart ws://127.0.0.1:PORT/TOKEN=/ws
```

## 각 파일 설명

### `crawler_source.dart`

크롤러의 **단일 진실 소스(Single Source of Truth)**입니다.

- Flutter 렌더 트리를 순회하며 레이아웃 JSON을 생성하는 코드
- IDE에서 직접 편집 가능 (자동완성, 타입 체크 지원)
- 수정 후 반드시 `dart tools/merge.dart`를 실행하여 반영

### `export_figma_layout.dart`

CLI 뼈대 파일입니다. **직접 실행하면 안 됩니다.**

- `_crawlerSource` 상수에 `%%CRAWLER_SOURCE%%` 플레이스홀더가 들어 있음
- VM Service 자동 탐지, WebSocket 통신, 크롤러 주입, JSON 저장 등 CLI 로직 포함
- 수정 시: CLI 동작 관련 코드만 여기서 편집

### `merge.dart`

빌드(병합) 스크립트입니다.

- `crawler_source.dart`를 읽어서 `export_figma_layout.dart`의 플레이스홀더를 치환
- 결과를 `generated_export_figma_layout.dart`로 출력
- 순수 Dart — 외부 패키지 의존성 없음

```bash
dart tools/merge.dart
# → Generated: .../tools/generated_export_figma_layout.dart
```

### `generated_export_figma_layout.dart`

merge 출력물이자 **실제 실행 파일**입니다.

- 크롤러 소스가 내장된 완전한 CLI
- 이 파일은 자동 생성되므로 직접 편집하지 마세요
- 수정이 필요하면 `crawler_source.dart` 또는 `export_figma_layout.dart`를 편집한 뒤 다시 merge

## 동작 원리

```
                    dart tools/merge.dart
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
crawler_source.dart   export_figma_layout.dart   generated_export_figma_layout.dart
(크롤러 코드)         (CLI 뼈대 + 플레이스홀더)    (완성된 실행 파일)
```

1. `merge.dart`가 `crawler_source.dart`를 읽음
2. 파일 전용 헤더 주석 제거 (import 문과 코드는 유지)
3. `export_figma_layout.dart`의 `%%CRAWLER_SOURCE%%`를 크롤러 소스로 치환
4. `generated_export_figma_layout.dart`로 출력

## 실행 시 동작

`generated_export_figma_layout.dart` 실행 시:

1. **VM Service 탐색** — 실행 중인 Flutter 앱을 자동 탐지 (또는 URI 수동 지정)
2. **크롤러 주입** — 내장된 크롤러 소스를 `lib/figma_temp_crawler.dart`로 생성, `main.dart`에 import 추가
3. **Hot Reload** — import 추가 시 자동 reload
4. **원격 실행** — VM Service를 통해 `figmaExtractorEntryPoint()` 호출
5. **JSON 저장** — `flutter_figma_dump/figma_layout.json`에 저장 + 클립보드 복사 (macOS)

## Android Studio External Tool 설정

| 항목              | 값                                                     |
|-------------------|--------------------------------------------------------|
| Program           | `dart`                                                 |
| Arguments         | `/path/to/tools/generated_export_figma_layout.dart`    |
| Working directory | `$ProjectFileDir$`                                     |

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `%%CRAWLER_SOURCE%%` 에러 | `dart tools/merge.dart` 실행 후 generated 파일 사용 |
| Flutter 앱을 찾을 수 없음 | 앱을 디버그 모드로 먼저 실행 |
| Hot Reload 실패 | VM Service URI를 수동으로 지정해서 재시도 |
| 크롤러 수정이 반영 안 됨 | `dart tools/merge.dart` 재실행 확인 |
