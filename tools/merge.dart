#!/usr/bin/env dart
// tools/merge.dart
//
// Step A: tools/crawler/_*.dart → tools/crawler_source.dart
// Step B: figma_plugin/src/_*.js → figma_plugin/code.js
// Step C: crawler_source.dart + export_figma_layout.dart → generated_export_figma_layout.dart
//
// 순수 Dart CLI (외부 패키지 없음)
//
// 사용법:
//   dart tools/merge.dart

import 'dart:io';

/// 디렉토리 내 _* 패턴 파일을 이름순 정렬 후 결합
String _mergeFragments(String dirPath, String glob) {
  final dir = Directory(dirPath);
  if (!dir.existsSync()) {
    stderr.writeln('ERROR: $dirPath 디렉토리를 찾을 수 없습니다.');
    exit(1);
  }

  final files =
      dir
          .listSync()
          .whereType<File>()
          .where(
            (f) =>
                f.uri.pathSegments.last.startsWith('_') &&
                f.uri.pathSegments.last.endsWith(glob),
          )
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));

  if (files.isEmpty) {
    stderr.writeln('ERROR: $dirPath 에 $glob 파일이 없습니다.');
    exit(1);
  }

  final buffer = StringBuffer();
  for (var i = 0; i < files.length; i++) {
    final content = files[i].readAsStringSync();
    buffer.write(content);
    // 파일이 개행으로 끝나지 않으면 개행 추가
    if (content.isNotEmpty && !content.endsWith('\n')) {
      buffer.writeln();
    }
  }
  // 파일 끝 trailing whitespace 정리 (dart format 호환)
  return buffer.toString().trimRight() + '\n';
}

void main() {
  // 이 스크립트가 위치한 디렉토리 기준으로 경로 결정
  final scriptDir = File(Platform.script.toFilePath()).parent.path;

  // ── Step A: Dart 모듈 결합 → crawler_source.dart ──
  final crawlerDir = '$scriptDir/crawler';
  final crawlerOutputPath = '$scriptDir/crawler_source.dart';

  final dartSource = _mergeFragments(crawlerDir, '.dart');
  File(crawlerOutputPath).writeAsStringSync(dartSource);
  print('Step A: Generated $crawlerOutputPath');

  // ── Step B: JS 모듈 결합 → code.js ──
  final jsDir = '$scriptDir/../figma_plugin/src';
  final jsOutputPath = '$scriptDir/../figma_plugin/code.js';

  final jsSource = _mergeFragments(jsDir, '.js');
  File(jsOutputPath).writeAsStringSync(jsSource);
  print('Step B: Generated $jsOutputPath');

  // ── Step C: crawler_source.dart → generated_export_figma_layout.dart ──
  final crawlerPath = crawlerOutputPath;
  final skeletonPath = '$scriptDir/export_figma_layout.dart';
  final outputPath = '$scriptDir/generated_export_figma_layout.dart';

  // 파일 읽기
  final crawlerFile = File(crawlerPath);
  if (!crawlerFile.existsSync()) {
    stderr.writeln('ERROR: $crawlerPath 파일을 찾을 수 없습니다.');
    exit(1);
  }
  final skeletonFile = File(skeletonPath);
  if (!skeletonFile.existsSync()) {
    stderr.writeln('ERROR: $skeletonPath 파일을 찾을 수 없습니다.');
    exit(1);
  }

  final crawlerSource = crawlerFile.readAsStringSync();
  final skeleton = skeletonFile.readAsStringSync();

  // crawler_source.dart 상단의 파일 전용 헤더 주석만 제거
  // (import 문과 나머지 코드는 유지 — figma_temp_crawler.dart에 필요)
  final lines = crawlerSource.split('\n');
  final processedLines = <String>[];
  bool inFileHeader = true;

  for (final line in lines) {
    if (inFileHeader) {
      final trimmed = line.trim();
      // 파일 헤더: "// tools/crawler_source.dart" 등 파일 전용 주석만 건너뛰기
      // 빈 줄을 만나면 헤더 종료 → 나머지는 모두 포함
      if (trimmed.startsWith('// tools/') ||
          trimmed.startsWith('// 크롤러') ||
          trimmed.startsWith('// IDE에서')) {
        continue;
      }
      inFileHeader = false;
    }
    processedLines.add(line);
  }

  final processedCrawlerSource = processedLines.join('\n');

  // 플레이스홀더 치환
  if (!skeleton.contains('%%CRAWLER_SOURCE%%')) {
    stderr.writeln(
      'ERROR: export_figma_layout.dart에 %%CRAWLER_SOURCE%% 플레이스홀더가 없습니다.',
    );
    exit(1);
  }

  final output = skeleton.replaceFirst(
    '%%CRAWLER_SOURCE%%',
    processedCrawlerSource,
  );

  // 출력
  File(outputPath).writeAsStringSync(output);
  print('Step C: Generated $outputPath');
}
