#!/usr/bin/env dart
// 테스트: DDS 프로세스에서 VM Service URI → redirect → WS URI 파싱

import 'dart:io';

void main() async {
  print('=== Step 1: ps에서 development-service 프로세스 찾기 ===');

  final ps = await Process.run('ps', ['-eo', 'pid,args']);
  final lines = (ps.stdout as String).split('\n');

  String? rawVmUri;
  for (final line in lines) {
    if (!line.contains('development-service')) continue;
    if (line.contains('grep')) continue;
    print('[PS] $line');

    final match = RegExp(r'vm-service-uri=(http://[^\s]+)').firstMatch(line);
    if (match != null) {
      rawVmUri = match.group(1)!;
      print('[Found] Raw VM Service URI: $rawVmUri');
    }
  }

  if (rawVmUri == null) {
    print('[ERROR] development-service 프로세스를 찾을 수 없습니다.');
    print('Flutter 앱이 디버그 모드로 실행 중인지 확인하세요.');
    exit(1);
  }

  print('');
  print('=== Step 2: HTTP GET → redirect 따라가기 ===');

  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 5);

  try {
    // redirect를 수동으로 따라감
    final uri = Uri.parse(rawVmUri);
    final request = await client.getUrl(uri);
    request.followRedirects = false; // 수동 추적
    final response = await request.close();

    print('[HTTP] Status: ${response.statusCode}');
    print('[HTTP] Headers location: ${response.headers.value("location")}');

    if (response.isRedirect || response.statusCode == 302 || response.statusCode == 301) {
      final redirectUrl = response.headers.value('location');
      print('[Redirect] $redirectUrl');

      if (redirectUrl != null) {
        final redirectUri = Uri.parse(redirectUrl);
        final wsUri = redirectUri.queryParameters['uri'];
        print('');
        print('=== Step 3: uri 쿼리 파라미터 파싱 ===');
        print('[WS URI] $wsUri');

        if (wsUri != null) {
          print('');
          print('========================================');
          print(' 최종 결과: $wsUri');
          print('========================================');
        }
      }
    } else {
      // redirect가 아닌 경우 body 확인
      print('[HTTP] redirect가 아닙니다. body 읽는 중...');
      final body = await response.transform(SystemEncoding().decoder).join();
      print('[Body] ${body.substring(0, body.length.clamp(0, 500))}');

      // body에서 ws:// URI 찾기
      final wsMatch = RegExp(r'ws://[^\s"<>]+').firstMatch(body);
      if (wsMatch != null) {
        print('');
        print('========================================');
        print(' Body에서 WS URI 발견: ${wsMatch.group(0)}');
        print('========================================');
      }
    }
  } catch (e) {
    print('[ERROR] HTTP 요청 실패: $e');
  } finally {
    client.close();
  }
}
