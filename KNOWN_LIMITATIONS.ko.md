# 알려진 제한사항

[English](./KNOWN_LIMITATIONS.md)

Flutter-to-Figma 변환 시 Figma API의 한계로 인해 완벽히 재현할 수 없는 Flutter 위젯/효과 목록.

---

## Text Gradient (ShaderMask)

Flutter에서 텍스트에 그라디언트를 적용하려면 `ShaderMask` + `LinearGradient`를 사용한다.

```dart
ShaderMask(
  shaderCallback: (bounds) => LinearGradient(
    colors: [Colors.red, Colors.blue],
  ).createShader(bounds),
  child: Text('Gradient Text'),
)
```

**Figma 한계**: Figma의 Text 노드는 `fills`에 `GRADIENT_LINEAR`을 직접 적용할 수 있지만, `ShaderMask`는 텍스트뿐 아니라 임의의 자식 위젯에 shader를 적용하는 범용 위젯이다. 현재 크롤러는 ShaderMask의 shaderCallback을 픽셀 샘플링으로 gradient를 추출하지만, 텍스트 전용 gradient fill로 매핑하는 로직은 미구현.

**현재 동작**: ShaderMask 하위의 텍스트에 gradient가 적용되지 않고 단색으로 표시됨.

**향후 개선 가능**: ShaderMask의 자식이 단일 Text인 경우를 감지하여 Figma Text fill에 gradient를 직접 매핑.

---

## BoxFit.fill + Text (비균일 스케일)

`FittedBox(fit: BoxFit.fill)`은 자식을 부모 크기에 맞게 **비균일 스케일**(가로/세로 독립 배율)로 늘린다.

```dart
FittedBox(
  fit: BoxFit.fill,
  child: Text('fill'),
)
```

**Figma 한계**: Figma Text 노드는 `fontSize` 하나로 크기를 제어하며, 가로/세로를 독립적으로 스케일할 수 없다. `BoxFit.fill`에서 scaleX=6.8, scaleY=2.2처럼 축별 배율이 다를 때 fontSize로는 표현 불가.

**현재 동작**: `BoxFit.fill`을 `BoxFit.contain`과 동일하게 `min(scaleX, scaleY)`로 근사 처리. 텍스트가 컨테이너를 꽉 채우지 못하고 한쪽 축에만 맞춰짐.

**대안**: 해당 텍스트를 이미지로 캡처(RepaintBoundary)하면 픽셀 단위로 정확히 재현 가능하지만, 편집 불가능한 래스터 이미지가 됨.

---

## BoxFit.cover + Text (클리핑)

`BoxFit.cover`는 `max(scaleX, scaleY)`로 스케일하여 컨테이너를 완전히 채우되, 넘치는 부분은 클리핑한다.

**Figma 한계**: Figma Text 노드 자체에는 클리핑 개념이 없다. 부모 Frame의 `clipsContent`로 시각적으로 잘라낼 수는 있지만, 텍스트 크기가 컨테이너를 넘으면 레이아웃이 깨질 수 있다.

**현재 동작**: `max(scaleX, scaleY)`로 fontSize를 스케일. 텍스트가 한쪽 축에서 컨테이너를 넘칠 수 있음.

---

## Opacity + Gradient/Image (복합 투명도)

`Opacity` 위젯은 `figNode.opacity`로 매핑되며 대부분 정상 동작한다. 단, gradient fill이나 image fill과 결합 시 Figma의 opacity 적용 방식이 Flutter와 미세하게 다를 수 있다.

**현재 동작**: `figNode.opacity = value`로 노드 전체 투명도 적용. 대부분의 경우 정상.

---

## ClipOval (타원형)

정사각형 `ClipOval`은 `borderRadius = size/2`로 정확히 매핑된다. 그러나 직사각형 `ClipOval`(타원)은 Figma의 `cornerRadius`로는 완벽한 타원을 만들 수 없다.

**현재 동작**: `min(width, height) / 2`를 borderRadius로 설정. 정사각형이면 완벽한 원, 직사각형이면 근사 타원.

**대안**: Figma의 Ellipse 노드(`figma.createEllipse()`)를 사용하면 완벽한 타원 가능하지만, 자식을 포함할 수 없어 마스크로 구현해야 함.
