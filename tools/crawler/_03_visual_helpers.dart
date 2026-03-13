/// =======================================================
/// 2. 헬퍼: visual 속성 추출
/// =======================================================

/// borderRadius 문자열에서 숫자 추출
double? _parseBorderRadius(dynamic br) {
  if (br == null) return null;
  final s = br.toString();
  if (s.contains('zero')) return 0.0;
  final m = RegExp(r'\d+\.?\d*').firstMatch(s);
  if (m != null) return double.tryParse(m.group(0)!);
  return double.tryParse(s);
}

/// BorderRadius에서 per-corner 값 추출
/// uniform이면 단일 double, non-uniform이면 {tl, tr, bl, br} Map 반환
dynamic _extractBorderRadius(BorderRadius br) {
  final tl = br.topLeft.x;
  final tr = br.topRight.x;
  final bl = br.bottomLeft.x;
  final bRight = br.bottomRight.x;
  if (tl == tr && tr == bl && bl == bRight) {
    return tl; // uniform
  }
  return {'tl': tl, 'tr': tr, 'bl': bl, 'br': bRight};
}

/// gradient 추출 (LinearGradient, RadialGradient, SweepGradient)
Map<String, dynamic>? _extractGradient(dynamic gradient) {
  if (gradient == null) return null;
  final colors = <String>[];
  final stops = <double>[];
  try {
    final colorList = gradient.colors as List<Color>;
    for (final c in colorList) {
      colors.add(_colorToHex(c)!);
    }
    final stopList = gradient.stops as List<double>?;
    if (stopList != null) {
      stops.addAll(stopList);
    } else {
      for (int i = 0; i < colors.length; i++) {
        stops.add(i / (colors.length - 1));
      }
    }
  } catch (_) {
    return null;
  }

  final map = <String, dynamic>{'colors': colors, 'stops': stops};

  final typeName = gradient.runtimeType.toString();
  if (typeName.contains('LinearGradient')) {
    map['type'] = 'linear';
    try {
      final begin = gradient.begin as Alignment;
      final end = gradient.end as Alignment;
      map['begin'] = {'x': (begin.x + 1) / 2, 'y': (begin.y + 1) / 2};
      map['end'] = {'x': (end.x + 1) / 2, 'y': (end.y + 1) / 2};
    } catch (_) {
      map['begin'] = {'x': 0.5, 'y': 0.0};
      map['end'] = {'x': 0.5, 'y': 1.0};
    }
  } else if (typeName.contains('RadialGradient')) {
    map['type'] = 'radial';
    try {
      final center = gradient.center as Alignment;
      map['center'] = {'x': (center.x + 1) / 2, 'y': (center.y + 1) / 2};
      map['radius'] = gradient.radius as double;
    } catch (_) {
      map['center'] = {'x': 0.5, 'y': 0.5};
      map['radius'] = 0.5;
    }
  } else if (typeName.contains('SweepGradient')) {
    map['type'] = 'sweep';
    try {
      final center = gradient.center as Alignment;
      map['center'] = {'x': (center.x + 1) / 2, 'y': (center.y + 1) / 2};
      map['startAngle'] = gradient.startAngle as double;
      map['endAngle'] = gradient.endAngle as double;
    } catch (_) {
      map['center'] = {'x': 0.5, 'y': 0.5};
    }
  }
  return map;
}

/// 노드 트리에 실질적 콘텐츠(Text, Image, visual 있는 Frame)가 있는지
bool _hasContentRecursive(Map<String, dynamic> node) {
  final type = node['type'];
  if (type == 'Text' || type == 'Image') return true;
  final vis = node['visual'] as Map<String, dynamic>? ?? {};
  if (vis['content'] != null ||
      vis['backgroundColor'] != null ||
      vis['gradient'] != null ||
      vis['border'] != null ||
      vis['imagePath'] != null)
    return true;
  final children = node['children'] as List?;
  if (children == null) return false;
  for (final c in children) {
    if (c is Map<String, dynamic> && _hasContentRecursive(c)) return true;
  }
  return false;
}

/// visual 속성이 있는지 (배경, 테두리, 그림자 등)
bool _hasVisualProps(Map<String, dynamic> visual) {
  return visual['backgroundColor'] != null ||
      (visual['border'] != null) ||
      (visual['shadow'] != null) ||
      visual['borderRadius'] != null ||
      visual['isIconBox'] == true ||
      visual['isSvgBox'] == true ||
      visual['isTextField'] == true ||
      visual['isDivider'] == true ||
      visual['backgroundBlur'] != null;
}

