import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'helpers.dart';

void main() {
  test('Step D: lib/crawler_source.dart exists', () {
    final libCopy = File('lib/crawler_source.dart');
    expect(libCopy.existsSync(), isTrue,
        reason:
            'lib/crawler_source.dart must exist. Run: dart run tools/merge.dart');
  });

  test('Step D: crawler source fragments dir exists', () {
    final crawlerDir = Directory('../crawler');
    expect(crawlerDir.existsSync(), isTrue,
        reason: 'tools/crawler/ directory must exist');
  });

  test('Step D: verifyCrawlerSourceSync succeeds when in sync', () {
    // Should not throw
    verifyCrawlerSourceSync();
  });

  test('Step D: verifyCrawlerSourceSync detects stale copy', () {
    final libCopy = File('lib/crawler_source.dart');
    final original = libCopy.readAsStringSync();

    try {
      // Tamper with the copy — add new function that doesn't exist in sources
      libCopy.writeAsStringSync(
          '$original\nvoid _tampered_function_for_test() {}');

      expect(
        () => verifyCrawlerSourceSync(),
        throwsA(isA<StateError>().having(
          (e) => e.message,
          'message',
          contains('stale'),
        )),
      );
    } finally {
      // Restore
      libCopy.writeAsStringSync(original);
    }
  });
}
