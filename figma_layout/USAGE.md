# 📖 사용 가이드

## 빠른 시작

### 1️⃣ 명령 실행

1. **VS Code 명령 팔레트 열기**
   - Mac: `Cmd + Shift + P`
   - Windows/Linux: `Ctrl + Shift + P`

2. **명령 선택**
   ```
   Flutter Inspector: Dump Figma Layout (Fast RenderTree Crawler)
   ```

3. **VM Service URI 입력**
   - **비워두기 (권장)**: 확장이 자동으로 앱을 실행하고 코드를 주입합니다
   - **입력하기**: 이미 실행 중인 앱의 URI를 입력 (예: `ws://127.0.0.1:8181/ws`)

### 2️⃣ 결과 확인

완료되면 프로젝트 루트에 다음 파일이 생성됩니다:

```
flutter_figma_dump/
  └── figma_layout.json
```

## 시나리오별 사용법

### 시나리오 1: 처음부터 시작 (권장)

```
1. Flutter 프로젝트 열기
2. 명령 실행 → VM Service URI 비워두기
3. 자동으로 앱 실행 및 데이터 추출
4. 결과 파일 확인
```

**장점**: 가장 간단하고 안전한 방법

### 시나리오 2: 이미 실행 중인 앱 사용

```
1. Flutter 앱을 먼저 실행 (flutter run)
2. 콘솔에서 VM Service URI 확인 (예: ws://127.0.0.1:8181/ws)
3. 명령 실행 → VM Service URI 입력
4. 코드 주입 및 Hot Reload 자동 실행
5. 결과 파일 확인
```

**장점**: 앱이 이미 실행 중일 때 빠르게 사용 가능

## 출력 파일 구조

`figma_layout.json` 예시:

```json
{
  "type": "Frame",
  "rect": {
    "x": 0.0,
    "y": 0.0,
    "w": 375.0,
    "h": 812.0
  },
  "properties": {
    "backgroundColor": "#ffffffff"
  },
  "children": [
    {
      "type": "Text",
      "rect": {
        "x": 20.0,
        "y": 100.0,
        "w": 335.0,
        "h": 24.0
      },
      "properties": {
        "content": "Hello, Flutter!",
        "fontFamily": "Roboto",
        "fontSize": 16.0,
        "fontWeight": "FontWeight.w400",
        "color": "#ff000000"
      },
      "children": []
    }
  ]
}
```

## 자동 처리 과정

확장이 자동으로 수행하는 작업:

1. ✅ **임시 파일 생성**: `lib/figma_temp_crawler.dart`
2. ✅ **main.dart 수정**: import 문 추가
3. ✅ **Hot Reload**: 새 코드 로드
4. ✅ **데이터 추출**: RenderTree 크롤링
5. ✅ **파일 복구**: 원본 코드로 복구 및 임시 파일 삭제

**사용자는 아무것도 할 필요가 없습니다!**

## 문제 해결

### Output 패널 확인

VS Code 하단의 "Output" 패널에서 상세 로그 확인:
- 패널 선택: `Flutter Inspector`

### 자주 발생하는 오류

| 오류 | 원인 | 해결 |
|------|------|------|
| `lib/main.dart 파일을 찾을 수 없습니다` | Flutter 프로젝트가 아님 | Flutter 프로젝트 루트에서 실행 |
| `Expression compilation error` | Hot Reload 미완료 | 잠시 후 다시 시도 |
| `figmaExtractorEntryPoint is not defined` | 임시 파일 로드 실패 | Output 패널 확인 후 수동 복구 |

### 수동 복구 방법

만약 파일이 복구되지 않았다면:

1. `lib/main.dart` 열기
2. `import 'figma_temp_crawler.dart';` 줄 찾아서 삭제
3. `lib/figma_temp_crawler.dart` 파일 삭제

## 다음 단계

생성된 JSON 파일을 사용하여:
- Figma 플러그인으로 변환
- 디자인 시스템 문서화
- UI 테스트 자동화
- 디자인-코드 일치성 검증



