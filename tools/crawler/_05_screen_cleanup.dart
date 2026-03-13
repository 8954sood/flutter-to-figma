/// =======================================================
/// 4. 겹친 화면 제거
/// =======================================================

/// 재귀적으로 Scaffold를 찾아 마지막 것만 남긴다.
/// Navigator 스택에 여러 페이지가 쌓여 있을 때,
/// 최상위(마지막) Scaffold만 보존.
Map<String, dynamic> _keepLastScaffold(Map<String, dynamic> root) {
  final children = root['children'] as List<Map<String, dynamic>>?;
  if (children == null || children.isEmpty) return root;

  // 현재 레벨에서 Scaffold 찾기
  final scaffoldIndices = <int>[];
  for (int i = 0; i < children.length; i++) {
    if (_containsScaffold(children[i])) {
      scaffoldIndices.add(i);
    }
  }

  if (scaffoldIndices.length > 1) {
    // 마지막 Scaffold가 있는 자식만 남기고 나머지 Scaffold 자식 제거
    final lastIdx = scaffoldIndices.last;
    final filtered = <Map<String, dynamic>>[];
    for (int i = 0; i < children.length; i++) {
      if (scaffoldIndices.contains(i) && i != lastIdx) continue;
      filtered.add(children[i]);
    }
    root['children'] = filtered;
  } else {
    // 이 레벨에 Scaffold가 0~1개면 자식으로 재귀
    for (final child in children) {
      _keepLastScaffold(child);
    }
  }
  return root;
}

bool _containsScaffold(Map<String, dynamic> node) {
  if (node['widgetName'] == 'Scaffold') return true;
  final children = node['children'] as List?;
  if (children == null) return false;
  for (final child in children) {
    if (child is Map<String, dynamic> && _containsScaffold(child)) return true;
  }
  return false;
}

