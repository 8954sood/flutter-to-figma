# Known Limitations

[한국어](./KNOWN_LIMITATIONS.ko.md)

A list of Flutter widgets/effects that cannot be perfectly reproduced in Figma due to Figma API constraints.

---

## Text Gradient (ShaderMask)

In Flutter, applying a gradient to text requires `ShaderMask` + `LinearGradient`.

```dart
ShaderMask(
  shaderCallback: (bounds) => LinearGradient(
    colors: [Colors.red, Colors.blue],
  ).createShader(bounds),
  child: Text('Gradient Text'),
)
```

**Figma limitation**: Figma Text nodes can apply `GRADIENT_LINEAR` directly to `fills`, but `ShaderMask` is a general-purpose widget that applies shaders to any child widget. The crawler currently extracts gradients from ShaderMask via pixel sampling, but mapping to text-specific gradient fills is not yet implemented.

**Current behavior**: Text under ShaderMask renders as a solid color without gradient.

**Future improvement**: Detect when ShaderMask's child is a single Text widget and map the gradient directly to Figma Text fills.

---

## BoxFit.fill + Text (Non-uniform Scale)

`FittedBox(fit: BoxFit.fill)` stretches its child to fit the parent with **non-uniform scaling** (independent horizontal/vertical scale factors).

```dart
FittedBox(
  fit: BoxFit.fill,
  child: Text('fill'),
)
```

**Figma limitation**: Figma Text nodes control size with a single `fontSize` and cannot scale horizontally and vertically independently. When `BoxFit.fill` produces different per-axis ratios (e.g., scaleX=6.8, scaleY=2.2), `fontSize` alone cannot represent this.

**Current behavior**: `BoxFit.fill` is approximated as `BoxFit.contain` using `min(scaleX, scaleY)`. Text won't fully fill the container — it fits only one axis.

**Alternative**: Capturing the text as an image (RepaintBoundary) would reproduce it pixel-perfectly, but the result would be a non-editable raster image.

---

## BoxFit.cover + Text (Clipping)

`BoxFit.cover` scales by `max(scaleX, scaleY)` to fully cover the container, clipping overflow.

**Figma limitation**: Figma Text nodes have no native clipping concept. While a parent Frame's `clipsContent` can visually clip, text exceeding the container may break layout.

**Current behavior**: fontSize is scaled by `max(scaleX, scaleY)`. Text may overflow the container on one axis.

---

## Opacity + Gradient/Image (Composite Opacity)

The `Opacity` widget maps to `figNode.opacity` and works correctly in most cases. However, when combined with gradient fills or image fills, Figma's opacity application may differ slightly from Flutter.

**Current behavior**: `figNode.opacity = value` applies whole-node opacity. Works correctly in most cases.

---

## ClipOval (Elliptical)

Square `ClipOval` maps exactly with `borderRadius = size/2`. However, rectangular `ClipOval` (ellipse) cannot produce a perfect ellipse using Figma's `cornerRadius`.

**Current behavior**: `min(width, height) / 2` is set as borderRadius. Perfect circle for squares, approximate ellipse for rectangles.

**Alternative**: Using Figma's Ellipse node (`figma.createEllipse()`) would produce a perfect ellipse, but it cannot contain children — a mask-based approach would be required.
