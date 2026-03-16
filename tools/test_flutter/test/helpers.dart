import 'dart:convert';
import 'dart:io';
import 'package:test_crawler/crawler.dart';

/// Verify that lib/crawler_source.dart is up-to-date with crawler source fragments.
/// Re-reads all tools/crawler/_*.dart, strips all whitespace, and compares against
/// lib/crawler_source.dart (also stripped). This catches real code changes while
/// ignoring dart format differences between package contexts.
/// Throws if they differ — means `dart run tools/merge.dart` was not run after editing.
void verifyCrawlerSourceSync() {
  final libCopy = File('lib/crawler_source.dart');
  if (!libCopy.existsSync()) {
    throw StateError(
      'lib/crawler_source.dart not found. Run: dart run tools/merge.dart',
    );
  }

  final crawlerDir = Directory('../crawler');
  if (!crawlerDir.existsSync()) {
    throw StateError(
      'tools/crawler/ not found.',
    );
  }

  // Re-merge source fragments (same logic as merge.dart Step A)
  final files = crawlerDir
      .listSync()
      .whereType<File>()
      .where((f) =>
          f.uri.pathSegments.last.startsWith('_') && f.path.endsWith('.dart'))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));

  final buffer = StringBuffer();
  for (var i = 0; i < files.length; i++) {
    buffer.writeln(files[i].readAsStringSync().trimRight());
    if (i < files.length - 1) buffer.writeln();
  }
  final freshSource = buffer.toString();

  // Strip ALL whitespace to ignore formatting differences
  String stripWs(String s) => s.replaceAll(RegExp(r'\s'), '');
  if (stripWs(libCopy.readAsStringSync()) != stripWs(freshSource)) {
    throw StateError(
      'lib/crawler_source.dart is stale (content differs from crawler/_*.dart sources).\n'
      'Run: dart run tools/merge.dart',
    );
  }
}

/// Run the crawler and return parsed JSON
Map<String, dynamic> runCrawler() {
  final jsonStr = figmaExtractorEntryPoint();
  return jsonDecode(jsonStr) as Map<String, dynamic>;
}

/// DFS find first node matching predicate
Map<String, dynamic>? findNode(
  Map<String, dynamic> tree,
  bool Function(Map<String, dynamic>) predicate,
) {
  if (predicate(tree)) return tree;
  final children = tree['children'] as List?;
  if (children == null) return null;
  for (final child in children) {
    if (child is Map<String, dynamic>) {
      final found = findNode(child, predicate);
      if (found != null) return found;
    }
  }
  return null;
}

/// Find all nodes matching predicate
List<Map<String, dynamic>> findAllNodes(
  Map<String, dynamic> tree,
  bool Function(Map<String, dynamic>) predicate,
) {
  final results = <Map<String, dynamic>>[];
  void walk(Map<String, dynamic> node) {
    if (predicate(node)) results.add(node);
    final children = node['children'] as List?;
    if (children == null) return;
    for (final child in children) {
      if (child is Map<String, dynamic>) walk(child);
    }
  }

  walk(tree);
  return results;
}

/// Count total nodes in tree
int countNodes(Map<String, dynamic> tree) {
  int count = 1;
  final children = tree['children'] as List?;
  if (children != null) {
    for (final child in children) {
      if (child is Map<String, dynamic>) count += countNodes(child);
    }
  }
  return count;
}

/// Snapshot comparison
/// Set env UPDATE_SNAPSHOTS=1 to regenerate
bool get updateSnapshots => Platform.environment['UPDATE_SNAPSHOTS'] == '1';

String _snapshotDir() {
  final dir = Directory('test/snapshots');
  if (!dir.existsSync()) dir.createSync(recursive: true);
  return dir.path;
}

void matchSnapshot(String name, Map<String, dynamic> actual) {
  final path = '${_snapshotDir()}/$name.snap.json';
  final file = File(path);
  final encoded = const JsonEncoder.withIndent('  ').convert(actual) + '\n';

  if (updateSnapshots) {
    file.writeAsStringSync(encoded);
    return;
  }

  if (!file.existsSync()) {
    throw Exception(
      'Snapshot not found: $path\n'
      'Run with UPDATE_SNAPSHOTS=1 to create.',
    );
  }

  final expected = file.readAsStringSync();
  if (encoded != expected) {
    throw Exception(
      'Snapshot mismatch for $name.\n'
      'Run with UPDATE_SNAPSHOTS=1 to update.\n'
      'File: $path',
    );
  }
}
