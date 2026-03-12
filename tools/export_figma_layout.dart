#!/usr/bin/env dart
// tools/export_figma_layout.dart
//
// ⚠️  이 파일을 직접 실행하지 마세요!
// merge.dart로 generated_export_figma_layout.dart를 생성한 후 실행하세요:
//   dart tools/merge.dart
//   dart tools/generated_export_figma_layout.dart
//
// Pure Dart CLI — 외부 패키지 의존성 0개, 크롤러 소스 내장 (빌드 시 치환)
// 실행 중인 Flutter 앱에서 레이아웃 JSON을 추출합니다.
//
// Android Studio External Tool 설정:
//   Program:           dart
//   Arguments:         /path/to/tools/generated_export_figma_layout.dart
//   Working directory: $ProjectFileDir$

import 'dart:async';
import 'dart:convert';
import 'dart:io';

// =============================================================
// 임베디드 크롤러 소스 (figma_exporter_inject.dart)
// =============================================================

const _crawlerSource = r"""%%CRAWLER_SOURCE%%""";

// =============================================================
// JSON-RPC 2.0 over WebSocket
// =============================================================

int _rpcId = 1;
final Map<int, Completer<dynamic>> _pending = {};

Future<dynamic> rpcCall(
  WebSocket ws,
  String method, [
  Map<String, dynamic>? params,
]) {
  final id = _rpcId++;
  final completer = Completer<dynamic>();
  _pending[id] = completer;

  final payload = <String, dynamic>{
    'jsonrpc': '2.0',
    'id': id,
    'method': method,
  };
  if (params != null) payload['params'] = params;

  ws.add(jsonEncode(payload));
  return completer.future.timeout(const Duration(seconds: 30));
}

void _onWsData(dynamic data) {
  try {
    final msg = jsonDecode(data as String);
    if (msg is Map<String, dynamic>) {
      final id = msg['id'];
      if (id is int && _pending.containsKey(id)) {
        final c = _pending.remove(id)!;
        if (msg.containsKey('error')) {
          c.completeError(Exception(jsonEncode(msg['error'])));
        } else {
          c.complete(msg['result']);
        }
      }
    }
  } catch (e) {
    _log('WS parse error: $e');
  }
}

// =============================================================
// 로깅
// =============================================================

void _log(String msg) => stderr.writeln(msg);

// =============================================================
// VM Service URI 자동 탐지
// =============================================================

/// Strategy 1 (가장 정확): ps에서 development-service 프로세스 찾기
/// → raw VM Service URI 추출 → HTTP redirect → DDS WS URI (토큰 포함)
Future<String?> _discoverViaDds() async {
  _log('[Discovery] ps에서 development-service 프로세스 탐색...');

  final ps = await Process.run('ps', ['-eo', 'pid,args']);
  final lines = (ps.stdout as String).split('\n');

  String? rawVmUri;
  for (final line in lines) {
    if (!line.contains('development-service')) continue;
    if (line.contains('grep')) continue;
    final match = RegExp(r'vm-service-uri=(http://[^\s]+)').firstMatch(line);
    if (match != null) {
      rawVmUri = match.group(1)!;
      _log('[Discovery] Raw VM Service URI: $rawVmUri');
      break;
    }
  }

  if (rawVmUri == null) return null;

  // HTTP GET → redirect 따라가서 DDS WS URI 얻기
  _log('[Discovery] HTTP redirect 추적 중...');
  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 5);

  try {
    final request = await client.getUrl(Uri.parse(rawVmUri));
    request.followRedirects = false;
    final response = await request.close();
    // body 소비
    await response.drain<void>();

    _log('[Discovery] HTTP ${response.statusCode}');

    if (response.statusCode == 302 || response.statusCode == 301) {
      final redirectUrl = response.headers.value('location');
      _log('[Discovery] Redirect → $redirectUrl');
      if (redirectUrl != null) {
        final wsUri = Uri.parse(redirectUrl).queryParameters['uri'];
        if (wsUri != null) {
          _log('[Discovery] DDS WS URI: $wsUri');
          return wsUri;
        }
      }
    }
  } catch (e) {
    _log('[Discovery] HTTP 요청 실패: $e');
  } finally {
    client.close();
  }

  // redirect 실패 시 raw URI를 ws로 변환해서 시도
  var fallback = rawVmUri
      .replaceFirst('http://', 'ws://')
      .replaceFirst('https://', 'wss://');
  if (!fallback.endsWith('/ws')) {
    fallback = fallback.endsWith('/') ? '${fallback}ws' : '$fallback/ws';
  }
  _log('[Discovery] Redirect 실패 → fallback: $fallback');
  return fallback;
}

/// Strategy 2 (fallback): lsof로 Dart 프로세스 포트 스캔
Future<String?> _scanDartPorts() async {
  _log('[Discovery] lsof 포트 스캔...');
  try {
    final result = await Process.run('lsof', ['-i', '-P', '-n']);
    for (final line in (result.stdout as String).split('\n')) {
      if (!line.toLowerCase().contains('dart')) continue;
      if (!line.contains('LISTEN')) continue;
      final m = RegExp(r':(\d+)\s+\(LISTEN\)').firstMatch(line);
      if (m != null) {
        final uri = 'ws://127.0.0.1:${m.group(1)}/ws';
        _log('[Discovery] lsof에서 포트 발견: $uri');
        return uri;
      }
    }
  } catch (_) {}
  return null;
}

Future<String?> discoverVmServiceUri() async {
  _log('[Discovery] VM Service 자동 탐색 중...');

  // 1차: DDS 프로세스 → redirect → 정확한 WS URI (토큰 포함)
  final fromDds = await _discoverViaDds();
  if (fromDds != null) return fromDds;

  // 2차: lsof 포트 스캔 (토큰 없이 시도, --disable-service-auth-codes 필요)
  final fromPort = await _scanDartPorts();
  if (fromPort != null) return fromPort;

  return null;
}

// =============================================================
// 크롤러 주입 (내장 소스 → 파일 생성 + import 추가)
// =============================================================

/// 크롤러 주입. 이미 주입돼 있으면 false, 새로 주입하면 true 반환.
bool injectCrawler(String projectPath) {
  final destPath = '$projectPath/lib/figma_temp_crawler.dart';
  final mainPath = '$projectPath/lib/main.dart';

  if (!File(mainPath).existsSync()) {
    throw Exception('$mainPath 파일을 찾을 수 없습니다.');
  }

  // 내장 소스를 파일로 쓰기 (항상 최신으로 덮어쓰기)
  File(destPath).writeAsStringSync(_crawlerSource);
  _log('[Inject] 크롤러 생성 → $destPath');

  // main.dart에 import 추가
  var mainCode = File(mainPath).readAsStringSync();
  if (mainCode.contains("import 'figma_temp_crawler.dart'")) {
    _log('[Inject] import 이미 존재 → hot reload 불필요');
    return false;
  }

  final importRe = RegExp(
    '^import\\s+[\\x27\\x22].*[\\x27\\x22];?\\s*\$',
    multiLine: true,
  );
  final matches = importRe.allMatches(mainCode).toList();
  if (matches.isNotEmpty) {
    final end = matches.last.end;
    mainCode =
        '${mainCode.substring(0, end)}'
        "\nimport 'figma_temp_crawler.dart';\n"
        '${mainCode.substring(end)}';
  } else {
    mainCode = "import 'figma_temp_crawler.dart';\n$mainCode";
  }

  File(mainPath).writeAsStringSync(mainCode);
  _log('[Inject] main.dart에 import 추가 완료');
  return true;
}

// =============================================================
// 메인
// =============================================================

Future<void> main(List<String> args) async {
  final projectPath = Directory.current.path;
  _log('========================================');
  _log(' Flutter → Figma Layout Exporter');
  _log('========================================');
  _log('[Project] $projectPath');

  // ---- VM Service URI ----
  String? vmUri;
  if (args.isNotEmpty) {
    vmUri = args[0];
    _log('[URI] 수동 지정: $vmUri');
  } else {
    vmUri = await discoverVmServiceUri();
  }
  if (vmUri == null) {
    _log('');
    _log('[ERROR] 실행 중인 Flutter 앱을 찾을 수 없습니다.');
    _log('');
    _log('해결 방법:');
    _log('  1) Flutter 앱을 디버그 모드로 먼저 실행하세요.');
    _log('  2) 콘솔에 출력된 VM Service URI를 인자로 전달하세요:');
    _log(
      '     dart tools/export_figma_layout.dart ws://127.0.0.1:PORT/TOKEN=/ws',
    );
    exit(1);
  }

  // ---- 크롤러 주입 ----
  final needsReload = injectCrawler(projectPath);

  // ---- WebSocket 연결 ----
  _log('[Connect] $vmUri');
  late WebSocket ws;
  try {
    ws = await WebSocket.connect(vmUri);
  } catch (e) {
    _log('[ERROR] WebSocket 연결 실패: $e');
    _log('URI가 올바른지, Flutter 앱이 디버그 모드로 실행 중인지 확인하세요.');
    exit(1);
  }
  ws.listen(_onWsData, onError: (e) => _log('[WS ERROR] $e'));

  try {
    // ---- getVM → isolateId ----
    final vm = await rpcCall(ws, 'getVM') as Map<String, dynamic>;
    final isolates = (vm['isolates'] as List).cast<Map<String, dynamic>>();
    if (isolates.isEmpty) throw Exception('VM에 isolate가 없습니다.');
    final isolateId = isolates[0]['id'] as String;
    _log('[VM] isolate: $isolateId');

    // ---- Hot Reload (필요 시) ----
    if (needsReload) {
      _log('[HotReload] reloadSources 호출 중...');
      await rpcCall(ws, 'reloadSources', {'isolateId': isolateId});
      await Future.delayed(const Duration(seconds: 3));
      _log('[HotReload] 완료');
    }

    // ---- 크롤러 라이브러리 찾기 ----
    final iso =
        await rpcCall(ws, 'getIsolate', {'isolateId': isolateId})
            as Map<String, dynamic>;
    final libs = (iso['libraries'] as List).cast<Map<String, dynamic>>();
    final crawlerLib = libs.cast<Map<String, dynamic>?>().firstWhere(
      (l) => (l!['uri'] as String).contains('figma_temp_crawler'),
      orElse: () => null,
    );

    await Future.delayed(const Duration(milliseconds: 1500));

    // ---- evaluate (이미지 포함 async export 시도) ----
    _log('[Evaluate] figmaStartExportWithImages() 호출...');
    dynamic result;
    if (crawlerLib != null) {
      try {
        // Phase 1: async export 시작
        await rpcCall(ws, 'evaluate', {
          'isolateId': isolateId,
          'targetId': crawlerLib['id'],
          'expression': 'figmaStartExportWithImages()',
        });

        // Phase 2: 결과 폴링 (최대 30초)
        for (int i = 0; i < 60; i++) {
          await Future.delayed(const Duration(milliseconds: 500));
          final pollResult =
              await rpcCall(ws, 'evaluate', {
                    'isolateId': isolateId,
                    'targetId': crawlerLib['id'],
                    'expression': 'figmaGetExportResult()',
                  })
                  as Map<String, dynamic>;
          if (pollResult['valueAsString'] != null &&
              pollResult['valueAsString'] != 'null') {
            result = pollResult;
            _log('[Evaluate] async export 완료 (${i * 500}ms)');
            break;
          }
        }

        // 폴링 타임아웃 시 sync fallback
        if (result == null) {
          _log('[Evaluate] async export 타임아웃 → sync fallback');
          result = await rpcCall(ws, 'evaluate', {
            'isolateId': isolateId,
            'targetId': crawlerLib['id'],
            'expression': 'figmaExtractorEntryPoint()',
          });
        }
      } catch (_) {
        _log('[Evaluate] 라이브러리 컨텍스트 실패 → 전역 컨텍스트 재시도');
        result = await rpcCall(ws, 'evaluate', {
          'isolateId': isolateId,
          'expression': 'figmaExtractorEntryPoint()',
        });
      }
    } else {
      result = await rpcCall(ws, 'evaluate', {
        'isolateId': isolateId,
        'expression': 'figmaExtractorEntryPoint()',
      });
    }

    // ---- 결과 추출 (truncation 처리) ----
    final res = result as Map<String, dynamic>;
    String jsonString;
    if (res['valueAsString'] != null &&
        res['valueAsStringIsTruncated'] != true) {
      jsonString = res['valueAsString'] as String;
    } else if (res['id'] != null) {
      _log('[Evaluate] 결과가 잘림 → getObject로 전체 가져오기...');
      final full =
          await rpcCall(ws, 'getObject', {
                'isolateId': isolateId,
                'objectId': res['id'],
              })
              as Map<String, dynamic>;
      jsonString = full['valueAsString'] as String;
    } else {
      throw Exception('예상치 못한 결과: ${jsonEncode(result)}');
    }

    // ---- 저장 ----
    final dumpDir = Directory('$projectPath/flutter_figma_dump');
    if (!dumpDir.existsSync()) dumpDir.createSync(recursive: true);

    File('${dumpDir.path}/figma_layout_raw.json').writeAsStringSync(jsonString);

    final data = jsonDecode(jsonString);
    final pretty = const JsonEncoder.withIndent('  ').convert(data);
    File('${dumpDir.path}/figma_layout.json').writeAsStringSync(pretty);

    // 클립보드 (macOS)
    try {
      final pb = await Process.start('pbcopy', []);
      pb.stdin.write(pretty);
      await pb.stdin.close();
      await pb.exitCode;
      _log('[Done] 클립보드에 복사 완료');
    } catch (_) {}

    _log('[Done] 저장 → flutter_figma_dump/figma_layout.json');
    _log('[Done] JSON 길이: ${jsonString.length} chars');
    _log('========================================');
  } finally {
    await ws.close();
  }
}
