# 모바일(App) 피그마 레이아웃 변환 서비스

## 🔎 프로젝트 소개

- 모바일(App) 환경에서는 플랫폼별 렌더링 방식 차이와 코드 구조의 복잡성, 접근성 제약으로 인해 웹의 html.to.design과 같은 개발 결과물의 Figma 전환 도구가 사실상 부재합니다<br>
- 이로 인해 디자이너 없이 개발자 주도로 구현된 앱은, 이후 디자이너가 투입될 경우 기존 코드와 단절된 디자인 시스템을 다시 구축해야 하는 비효율이 발생합니다.<br>


<b>결론적으로, 이미 구현된 모바일 앱의 프론트엔드 UI를 편집 가능한 Figma 레이아웃으로 자동 변환하는 서비스가 필요합니다.</b><br><br>

----

## ⚙️ 서비스 구조
<img width="1536" height="1024" alt="service_structure" src="https://github.com/user-attachments/assets/f343bc02-b100-4c11-b268-b106d5d1b0bd" />

----

## 🚀 핵심 기능 소개
### 1️⃣ flutter tree 추출<br>
• 실행 중인 Flutter 앱의 Widget / RenderObject 트리를 Inspector를 통해 실시간으로 수집<br>
• 단순 위젯 선언이 아닌, 실제 렌더링 결과 기반의 구조·속성 정보를 JSON 형태로 추출<br>

### 2️⃣ 추출한 tree 가공<br>
• Flutter 전용 트리를 플랫폼 독립적인 Intermediate Representation(IR)로 정규화<br>
• 레이아웃, 스타일, 계층 구조를 분석하여 디자인 요소 단위로 재구성<br>

### 3️⃣ figma plugin으로 디자인 복원<br>
• 가공된 IR을 기반으로 Figma Node(Frame, Text, Vector, Image) 자동 생성<br>
• Auto Layout, Constraint, Component 구조를 유지하여 편집 가능한 디자인으로 변환<br>
<img width="1088" height="1096" alt="figma plugin으로 디자인 복원" src="https://github.com/user-attachments/assets/df4ff6b8-8e17-42cb-a28b-058545d799f8" />

----

## ✔️ 데모 영상
https://github.com/user-attachments/assets/d1cac362-96fb-4a9c-b9d9-1eac96988345

----

## ✔️ 결론
• 모바일 앱의 UI 트리를 추출·가공하여 편집 가능한 Figma 레이아웃으로 자동 변환하는 시스템을 구현하였습니다.<br>
• 개발 결과물을 디자인 자산으로 재활용할 수 있어 디자인 재작업 비용과 협업 단절 문제를 완화할 수 있습니다.<br>
• 향후에는 Flutter뿐 아니라 React Native 등 다양한 모바일 프레임워크로 확장하여 범용성을 높이고, 현재 복원되지 않는 벡터 그래픽(SVG, CustomPaint) 및 대형 이미지 요소에 대한 분석·복원 기능을 추가할 계획입니다. 또한 컴포넌트 자동 추출과 디자인 시스템 연계를 통해 재사용 가능한 디자인 구조 생성을 고도화하고, 다중 화면 및 상태 기반 UI 분석을 포함한 실무 수준의 모바일 코드-투-디자인 파이프라인으로 발전시키고자 합니다.
