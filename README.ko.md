# Flutter to Figma

[English](./README.md)

실행 중인 Flutter 화면을 Figma의 편집 가능한 레이아웃으로 자동 변환합니다. 런타임에 Flutter 위젯 트리를 크롤링하여 레이아웃/스타일 정보를 JSON으로 추출하고, Figma 플러그인을 통해 재구성합니다.

> **참고:** 이미지 위젯은 아직 지원되지 않습니다.

## 동작 원리

```
Flutter 앱 (디버그)  ──WebSocket──>  추출기 CLI  ──JSON──>  Figma 플러그인
       │                                │                       │
  런타임에 위젯 트리             VM Service로 연결하여       Figma Auto Layout으로
  크롤링                        크롤러 주입                 재구성
```

1. **크롤러** (`tools/crawler_source.dart`) — 실행 중인 Flutter 앱에 주입됩니다. 위젯 트리를 순회하며 레이아웃, 색상, 테두리, 그림자 등 시각적 속성을 추출합니다.
2. **추출기** (`tools/export_figma_layout.dart`) — WebSocket(JSON-RPC 2.0)으로 Flutter 앱에 연결하고, 크롤러를 주입한 뒤 레이아웃 JSON을 가져옵니다.
3. **Figma 플러그인** (`figma_plugin/`) — JSON을 받아 Auto Layout, Fill, Stroke, Effect 등을 포함한 Figma 노드로 재구성합니다.

## 사전 요구사항

- [Dart SDK](https://dart.dev/get-dart) (Flutter SDK에 포함)
- **디버그 모드**로 실행 중인 Flutter 앱 (VM Service 접근 필요)
- [Figma Desktop](https://www.figma.com/downloads/) 앱

## 시작하기

### 1. 추출기 빌드

```bash
dart run tools/merge.dart
```

크롤러 소스와 추출기 템플릿을 결합하여 `tools/generated_export_figma_layout.dart`를 생성합니다.

### 2. Figma 플러그인 설치

1. Figma Desktop을 엽니다
2. **Plugins > Development > Import plugin from manifest...** 로 이동합니다
3. `figma_plugin/manifest.json`을 선택합니다

### 3. Flutter 앱 실행

```bash
flutter run
```

콘솔에 VM Service URL이 표시되는지 확인합니다 (예: `http://127.0.0.1:XXXXX/...`).

### 4. 레이아웃 JSON 추출

```bash
dart run tools/generated_export_figma_layout.dart
```

실행 중인 Flutter 앱을 자동 탐색하고, 크롤러를 주입하여 레이아웃 JSON을 출력합니다.

### 5. Figma에서 가져오기

1. Figma 파일을 엽니다
2. **Flutter Screen Rebuilder** 플러그인을 실행합니다 (Plugins > Development)
3. 추출된 JSON을 플러그인 UI에 붙여넣습니다
4. **렌더링** 클릭 — 캔버스에 레이아웃이 생성됩니다

## Android Studio / IntelliJ 설정 (선택사항)

추출기를 External Tool로 등록하면 원클릭으로 추출할 수 있습니다:

| 항목              | 값                                                         |
|-------------------|------------------------------------------------------------|
| Program           | `dart`                                                     |
| Arguments         | `/absolute/path/to/tools/generated_export_figma_layout.dart` |
| Working directory | `$ProjectFileDir$`                                         |

## 지원 속성

| Category   | Properties                                            |
|------------|-------------------------------------------------------|
| Layout     | Auto Layout (Row / Column / Wrap), Width, Height      |
| Spacing    | Padding, Margin, itemSpacing (mainAxis, crossAxis)    |
| Background | Solid color, Linear gradient, Radial gradient         |
| Border     | Color, Width, Per-corner radius                       |
| Effects    | Elevation / Shadow, Blur filter                       |
| Transform  | Rotation                                              |
| Clip       | Rectangle, Rounded rectangle, Wave                    |
| Text       | Font size, Weight, Color, Alignment, Letter spacing   |
| Grid       | GridView mainAxisSpacing, crossAxisSpacing             |

## 프로젝트 구조

```
flutter-to-figma/
├── tools/
│   ├── crawler_source.dart                 # 위젯 트리 크롤러 (원본 소스)
│   ├── export_figma_layout.dart            # 추출기 템플릿
│   ├── merge.dart                          # 빌드 스크립트
│   └── generated_export_figma_layout.dart  # 생성된 파일 (직접 편집 금지)
├── figma_plugin/
│   ├── manifest.json                       # Figma 플러그인 매니페스트
│   ├── code.js                             # 플러그인 로직
│   └── ui.html                             # 플러그인 UI
├── README.md                               # 영문 문서
├── README.ko.md                            # 한국어 문서
├── CHANGELOG.md
├── LICENSE
└── CONTRIBUTING.md
```

## 기여하기

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해 주세요.

## 라이선스

이 프로젝트는 MIT 라이선스로 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.
