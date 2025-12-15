# 🚀 Flutter UI to Figma: Direct RenderTree Crawler 가이드

## 개요

이 프로젝트는 두 가지 방식으로 Flutter UI 정보를 추출할 수 있습니다:

1. **기존 방식** (`dumpFullDesign`): 외부 Inspector API 사용
   - 모든 노드에 대해 `getLayoutExplorerNode`, `getDetailsSubtree` 호출
   - 상세한 메타데이터 포함
   - 느리지만 완전한 정보 제공

2. **새로운 방식** (`dumpFigmaLayout`): 내부 RenderTree 크롤러 ⚡
   - `RenderObject`에 직접 접근하여 재귀 순회
   - `localToGlobal(Offset.zero)`로 절대 좌표 직접 계산
   - Figma 변환에 최적화된 경량 JSON 생성
   - **훨씬 빠르고 효율적**
   - **사용자의 앱 코드 수정 불필요** ✨

## 사용 방법

### 🚀 빠른 시작 (Zero-Config)

**사용자의 Flutter 앱 코드를 전혀 수정할 필요가 없습니다!** 확장이 자동으로 코드를 주입하고 복구합니다.

#### 방법 1: 자동 실행 (권장)

1. VS Code에서 Flutter 프로젝트 열기
2. 명령 팔레트 열기: `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux)
3. `Flutter Inspector: Dump Figma Layout (Fast RenderTree Crawler)` 선택
4. VM Service URI 입력창에서 **엔터** (비워두기)
5. 확장이 자동으로:
   - `lib/figma_temp_crawler.dart` 임시 파일 생성
   - `lib/main.dart`에 import 추가
   - Flutter 앱 실행 (`flutter run`)
   - Hot Reload 실행
   - 레이아웃 데이터 추출
   - **모든 임시 파일 자동 복구 및 삭제**
6. `flutter_figma_dump/figma_layout.json` 파일 확인

#### 방법 2: 이미 실행 중인 앱 사용

1. Flutter 앱을 이미 실행 중인 상태
2. 명령 팔레트에서 `Flutter Inspector: Dump Figma Layout` 선택
3. VM Service URI 입력 (예: `ws://127.0.0.1:8181/ws`)
   - Flutter 앱 실행 시 콘솔에 표시되는 URI 사용
4. 확장이 자동으로:
   - 코드 주입 및 Hot Reload
   - 레이아웃 데이터 추출
   - 파일 복구

### 📋 단계별 상세 설명

#### 1단계: 코드 주입 (자동)
```
lib/figma_temp_crawler.dart  ← 임시 파일 생성
lib/main.dart                ← import 문 자동 추가
```

#### 2단계: Hot Reload (자동)
- VS Code의 `flutter.hotReload` 명령 실행
- 앱이 새 코드를 로드 (화면이 한 번 깜빡임)

#### 3단계: 데이터 추출 (자동)
- VM Service의 `evaluate` API로 `figmaExtractorEntryPoint()` 함수 호출
- RenderTree 크롤링 및 JSON 생성

#### 4단계: 파일 복구 (자동)
```
lib/main.dart                ← 원본으로 복구
lib/figma_temp_crawler.dart  ← 삭제
```

**모든 과정이 자동으로 진행되며, 사용자의 원본 코드는 전혀 변경되지 않습니다!**

## 출력 형식

`figma_layout.json` 파일 구조:

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

## 주요 장점

### ⚡ 성능
- **단일 RPC 호출**: 노드당 호출이 아닌 한 번의 Service Extension 호출
- **빠른 좌표 계산**: `localToGlobal`로 부모 추적 없이 절대 좌표 계산
- **경량 데이터**: Figma 변환에 필요한 정보만 포함

### 🎯 정확성
- **절대 좌표**: 화면 기준 절대 좌표 (x, y)
- **실제 크기**: RenderObject의 실제 렌더링 크기
- **타입 식별**: Text, Image, Frame 자동 구분

### 🔧 확장성
- **커스터마이징 가능**: `_crawlRenderObject` 함수에서 추가 속성 추출 가능
- **필터링**: 필요 없는 노드 제외 로직 추가 가능

## 문제 해결

### "Expression compilation error" 오류

- **원인**: Hot Reload가 완료되기 전에 evaluate 호출
- **해결**: 
  1. Output 패널에서 `[Hot Reload] Hot Reload 완료` 메시지 확인
  2. 앱이 정상적으로 실행 중인지 확인
  3. 다시 시도

### "figmaExtractorEntryPoint is not defined" 오류

- **원인**: 임시 파일이 제대로 로드되지 않음
- **해결**:
  1. `lib/figma_temp_crawler.dart` 파일이 생성되었는지 확인
  2. `lib/main.dart`에 import가 추가되었는지 확인
  3. Hot Reload가 성공했는지 확인 (Output 패널)

### 좌표가 0,0으로 나오는 경우

- 해당 노드가 화면에 보이지 않거나 크기가 없는 경우
- `RenderBox`가 아닌 경우 필터링됨
- 정상적인 동작입니다 (필요시 `_crawlRenderObject` 함수 수정)

### 파일이 복구되지 않는 경우

- **수동 복구**:
  1. `lib/main.dart`에서 `import 'figma_temp_crawler.dart';` 줄 삭제
  2. `lib/figma_temp_crawler.dart` 파일 삭제
- **자동 복구 실패 시**: Output 패널에서 오류 메시지 확인

## 다음 단계

1. **Figma 플러그인 개발**: 생성된 JSON을 Figma 컴포넌트로 변환
2. **이미지 추출**: `RenderImage`의 실제 이미지 데이터 추출
3. **스타일 매핑**: Flutter 스타일을 Figma 스타일로 변환
4. **실시간 동기화**: 앱 변경 시 자동으로 Figma 업데이트

## 참고

- Flutter VM Service Protocol: https://github.com/dart-lang/sdk/blob/main/runtime/vm/service/service.md
- Service Extensions: https://api.flutter.dev/flutter/dart-developer/registerExtension.html
- RenderObject: https://api.flutter.dev/flutter/rendering/RenderObject-class.html

