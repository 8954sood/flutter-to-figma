// dumpFigmaLayout.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws';

import { sleep, countNodes } from './utils';
import { sendRequest, setWebSocket, setupMessageHandler } from './vmService';
import { runFlutterAndGetVmServiceUri } from './flutterRunner';
import { injectFigmaCrawlerViaHotReload } from './hotReloadInject';

let output: vscode.OutputChannel;

/**
 * 큰 이미지(>5MB)를 별도 파일로 저장하기 위한 레코드 타입
 */
type LargeImageRecord = {
  id: string;                   // 노드에 심어줄 largeImageId
  path: string;                 // 프로젝트 내 상대 경로 (assets/...)
  base64: string;               // 이미지 데이터 (base64)
  kind: 'image' | 'background'; // 일반 이미지 / 배경 이미지 구분
};

/**
 * Dump Figma Layout 초기화
 */
export function initDumpFigmaLayout(outputChannel: vscode.OutputChannel) {
  output = outputChannel;
}

/**
 * 이미지를 Base64로 변환하여 JSON에 임베딩하는 함수 (재귀)
 * - 5MB 이하: node.properties.imageBase64 에 직접 넣음
 * - 5MB 초과: largeImages[] 에 따로 저장 + node.properties.largeImageId 만 남김
 */
function embedImagesInJson(
  node: any,
  projectRoot: string,
  largeImages: LargeImageRecord[],
) {
  // ==========================
  // 1) 일반 / 배경 Image 처리
  // ==========================
  if (node.type === 'Image' && node.properties?.imagePath) {
    try {
      let rawPath: string = node.properties.imagePath;

      // "assets/..." 또는 'assets/...' 추출
      const match = rawPath.match(/["']([^"']+)["']/);
      if (match && match[1]) {
        rawPath = match[1];
      } else {
        // 따옴표가 없으면 Image(...) 래퍼 제거를 시도
        rawPath = rawPath
          .replace(/^.*Image\(.*name:\s*/, '')
          .replace(/\)$/, '');
      }

      // 경로 정규화
      const relativePath = path.normalize(rawPath);
      const fullPath = path.join(projectRoot, relativePath);

      const isBackground = !!node.properties.isBackgroundImage;
      const kind: LargeImageRecord['kind'] = isBackground ? 'background' : 'image';

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        output.appendLine(
          `[Image] ${relativePath} 파일 크기: ${stats.size} bytes (~${(
            stats.size / (1024 * 1024)
          ).toFixed(2)} MB)`,
        );

        if (stats.size <= 5 * 1024 * 1024) {
          // 5MB 이하 → inline
          const bitmap = fs.readFileSync(fullPath);
          node.properties.imageBase64 = bitmap.toString('base64');
          output.appendLine(`[Image] 변환 성공 (inline): ${relativePath}`);
        } else {
          // 5MB 초과 → largeImages에 분리
          const bitmap = fs.readFileSync(fullPath);
          const base64 = bitmap.toString('base64');

          const id: string =
            node.properties.largeImageId ||
            `L_${relativePath.replace(/[\\/]/g, '_')}`;

          node.properties.largeImageId = id;
          node.properties.error =
            'Image too large (>5MB), stored in figma_large_images.json';

          largeImages.push({
            id,
            path: relativePath,
            base64,
            kind,
          });

          output.appendLine(
            `[Image] 큰 이미지 분리 저장: ${relativePath} -> id=${id}`,
          );
        }
      } else {
        output.appendLine(
          `[WARN] 파일을 찾을 수 없습니다 (원본: ${node.properties.imagePath}) -> 시도한 경로: ${fullPath}`,
        );
        node.properties.error = 'Image file not found';
      }
    } catch (e: any) {
      output.appendLine(`[ERROR] 이미지 처리 중 오류: ${e.message}`);
    }
  }

  // ==========================
  // 2) 자식 재귀 순회
  // ==========================
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) =>
      embedImagesInJson(child, projectRoot, largeImages),
    );
  }
}

/**
 * 새로운 방식: Figma 최적화 크롤러 (Hot Reload 방식)
 */
export async function dumpFigmaLayout(context: vscode.ExtensionContext) {
  let cleanup: (() => void) | undefined;
  try {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage('워크스페이스 폴더가 없습니다.');
      return;
    }
    const projectPath = folders[0].uri.fsPath;
    output.appendLine(`[Hot Reload] Project path: ${projectPath}`);

    // VM Service URI 확인 (실행 중인 디버그 세션 또는 수동 입력)
    let vmServiceUri: string | undefined;

    // 1. 실행 중인 Flutter 디버그 세션 확인
    const debugSession = vscode.debug.activeDebugSession;
    if (debugSession && debugSession.type === 'dart') {
      try {
        const vmService = await debugSession.customRequest('getVM');
        output.appendLine(
          `[Hot Reload] 실행 중인 디버그 세션 발견: ${debugSession.id}`,
        );
      } catch (e) {
        output.appendLine(
          `[Hot Reload] 디버그 세션에서 VM Service URI 추출 실패: ${e}`,
        );
      }
    }

    // 덤프 저장 디렉토리
    const dumpDir = path.join(projectPath, 'flutter_figma_dump');
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    // ✅ 여기서 무조건 figma_large_images.json “빈 파일” 생성
    const initLargeImagesPath = path.join(dumpDir, 'figma_large_images.json');
    const initPayload = {
      generatedAt: new Date().toISOString(),
      count: 0,
      images: [] as LargeImageRecord[],
    };
    fs.writeFileSync(
      initLargeImagesPath,
      JSON.stringify(initPayload, null, 2),
      'utf-8',
    );
    output.appendLine(
      `[Init] figma_large_images.json 초기 생성: ${initLargeImagesPath}`,
    );

    // 2. 수동 입력 또는 자동 실행
    if (!vmServiceUri) {
      const manualUri = await vscode.window.showInputBox({
        title: 'Flutter VM Service URI 입력 (비우면 자동 실행)',
        prompt:
          '이미 실행 중인 앱의 VM Service URI (예: ws://127.0.0.1:8181/ws). 비우면 flutter run --machine 으로 자동 실행합니다.',
        placeHolder: 'ws://127.0.0.1:8181/ws',
        ignoreFocusOut: true,
        value: '',
      });

      if (manualUri && manualUri.trim().length > 0) {
        vmServiceUri = manualUri.trim();
        output.appendLine(
          `[Hot Reload] [Manual] Using VM Service: ${vmServiceUri}`,
        );

        output.appendLine('[Hot Reload] 코드 주입 중...');
        const injection = injectFigmaCrawlerViaHotReload(projectPath, context);
        cleanup = injection.cleanup;
      } else {
        output.appendLine('[Hot Reload] 코드 주입 중...');
        const injection = injectFigmaCrawlerViaHotReload(projectPath, context);
        cleanup = injection.cleanup;

        output.appendLine('[Hot Reload] Flutter 앱 실행 중...');
        const result = await runFlutterAndGetVmServiceUri(projectPath);
        vmServiceUri = result.wsUri;
        output.appendLine(
          `[Hot Reload] [Auto] VM Service from flutter run: ${vmServiceUri}`,
        );
      }
    } else {
      output.appendLine('[Hot Reload] 코드 주입 중...');
      const injection = injectFigmaCrawlerViaHotReload(projectPath, context);
      cleanup = injection.cleanup;
    }

    if (!vmServiceUri) {
      throw new Error('VM Service URI를 얻지 못했습니다.');
    }

    // 3. Hot Reload 실행 (코드 주입이 이미 되어 있으면)
    if (cleanup !== undefined) {
      output.appendLine('[Hot Reload] Hot Reload 실행 중...');
      try {
        await vscode.commands.executeCommand('flutter.hotReload');
        await sleep(2000);
        output.appendLine('[Hot Reload] Hot Reload 완료');
      } catch (e: any) {
        output.appendLine(
          `[Hot Reload] Hot Reload 실패 (무시 가능): ${e.message}`,
        );
      }
    }

    // 4. VM Service 접속 & evaluate로 함수 호출
    await dumpFigmaLayoutFromVm(vmServiceUri, dumpDir, projectPath);

    vscode.window.showInformationMessage(
      `Figma 데이터가 클립보드에 복사되었습니다! (이미지 포함 / 큰 이미지는 figma_large_images.json에 저장)`,
    );
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    vscode.window.showErrorMessage(`Figma layout dump failed: ${msg}`);
    output.appendLine(`[Hot Reload ERROR] ${msg}`);
    if (err?.stack) output.appendLine(String(err.stack));
  } finally {
    if (cleanup) {
      cleanup();
    }
  }
}

async function dumpFigmaLayoutFromVm(
  vmServiceUri: string,
  dumpDir: string,
  projectPath: string,
): Promise<void> {
  const ws = new WebSocket(vmServiceUri);
  setWebSocket(ws);

  return new Promise((resolve, reject) => {
    ws.on('error', (err) => reject(err));

    setupMessageHandler(() => {
      // 일반 메시지는 무시
    });

    ws.on('open', async () => {
      try {
        const vm = await sendRequest('getVM');
        const isolates = vm.isolates as Array<{ id: string; name: string }>;
        if (!isolates || isolates.length === 0) {
          throw new Error('VM에 isolates가 없습니다.');
        }
        const isolateId = isolates[0].id;
        output.appendLine(`[Hot Reload] isolate: ${isolateId}`);

        output.appendLine('[Hot Reload] figma_temp_crawler 라이브러리 찾는 중...');
        const isolate = await sendRequest('getIsolate', { isolateId });
        const libraries = isolate.libraries as Array<{
          id: string;
          uri: string;
        }>;

        let crawlerLib = libraries.find((lib) =>
          lib.uri.includes('figma_temp_crawler.dart'),
        );
        if (!crawlerLib) {
          crawlerLib = libraries.find(
            (lib) =>
              lib.uri.endsWith('figma_temp_crawler.dart') ||
              lib.uri.includes('figma_temp_crawler'),
          );
        }

        if (!crawlerLib) {
          output.appendLine('[Hot Reload] 사용 가능한 라이브러리 목록:');
          libraries.slice(0, 10).forEach((lib) => {
            output.appendLine(`  - ${lib.uri}`);
          });
          if (libraries.length > 10) {
            output.appendLine(`  ... 외 ${libraries.length - 10}개`);
          }
        }

        if (crawlerLib) {
          output.appendLine(
            `[Hot Reload] 라이브러리 찾음: ${crawlerLib.uri} (${crawlerLib.id})`,
          );
        } else {
          output.appendLine(
            '[Hot Reload] 경고: figma_temp_crawler 라이브러리를 찾지 못했습니다. 전역 컨텍스트에서 시도합니다.',
          );
        }

        await sleep(1500);

        output.appendLine(
          '[Hot Reload] evaluate로 figmaExtractorEntryPoint() 호출 중...',
        );
        let result: any;

        if (crawlerLib) {
          try {
            result = await sendRequest('evaluate', {
              isolateId,
              targetId: crawlerLib.id,
              expression: 'figmaExtractorEntryPoint()',
            });
          } catch (e: any) {
            output.appendLine(
              `[Hot Reload] 라이브러리 컨텍스트 실패, 전역에서 시도: ${e.message}`,
            );
            result = await sendRequest('evaluate', {
              isolateId,
              expression: 'figmaExtractorEntryPoint()',
            });
          }
        } else {
          output.appendLine(
            '[Hot Reload] 전역 컨텍스트에서 함수 호출 시도...',
          );
          try {
            result = await sendRequest('evaluate', {
              isolateId,
              expression: 'figmaExtractorEntryPoint()',
            });
          } catch (e: any) {
            throw new Error(
              `함수를 찾을 수 없습니다. Hot Reload가 완료되었는지 확인하세요: ${e.message}`,
            );
          }
        }

        let jsonString: string;
        if (result && typeof result === 'object') {
          if (result.valueAsString && result.valueAsStringIsTruncated !== true) {
            jsonString = result.valueAsString;
          } else if (result.id) {
            output.appendLine(
              `[Hot Reload] 결과가 잘려있어 전체 객체를 요청합니다... (ID: ${result.id})`,
            );

            const fullObject = await sendRequest('getObject', {
              isolateId,
              objectId: result.id,
            });

            if (fullObject && fullObject.valueAsString) {
              if (fullObject.valueAsStringIsTruncated === true) {
                output.appendLine(
                  '[Hot Reload] 전체 객체에서도 문자열이 잘려있습니다. 부분적으로 가져옵니다...',
                );
                jsonString = fullObject.valueAsString;
                output.appendLine(
                  `[Hot Reload] 경고: 가져온 문자열이 여전히 잘려있을 수 있습니다. 길이: ${jsonString.length}`,
                );
              } else {
                jsonString = fullObject.valueAsString;
              }
            } else {
              throw new Error(
                '전체 객체에서 문자열 값을 찾을 수 없습니다: ' +
                  JSON.stringify(fullObject),
              );
            }
          } else {
            throw new Error(
              '예상치 못한 결과 형식 (ID 없음): ' + JSON.stringify(result),
            );
          }
        } else if (typeof result === 'string') {
          jsonString = result;
        } else {
          throw new Error(
            '예상치 못한 결과 형식: ' + JSON.stringify(result),
          );
        }

        output.appendLine(
          `[Hot Reload] JSON 문자열 길이: ${jsonString.length} 문자`,
        );

        const rawJsonPath = path.join(dumpDir, 'figma_layout_raw.json');
        fs.writeFileSync(rawJsonPath, jsonString, 'utf-8');
        output.appendLine(`[Hot Reload] 원본 JSON 저장: ${rawJsonPath}`);

        let figmaData: any;
        try {
          figmaData = JSON.parse(jsonString);
        } catch (e: any) {
          const errorLogPath = path.join(dumpDir, 'error_log.txt');
          let errorLog = 'JSON 파싱 오류 발생\n';
          errorLog += `오류 메시지: ${e.message}\n`;
          errorLog += `JSON 길이: ${jsonString.length} 문자\n\n`;

          const errorPosition = e.message.match(/position (\d+)/);
          if (errorPosition) {
            const pos = parseInt(errorPosition[1], 10);
            const start = Math.max(0, pos - 200);
            const end = Math.min(jsonString.length, pos + 200);
            errorLog += `오류 위치: ${pos}\n`;
            errorLog += `오류 주변 텍스트 (${start}-${end}):\n${jsonString.substring(
              start,
              end,
            )}\n\n`;
          }

          errorLog += `JSON 처음 1000자:\n${jsonString.substring(
            0,
            1000,
          )}\n\n`;
          if (jsonString.length > 1000) {
            errorLog += `JSON 마지막 1000자:\n${jsonString.substring(
              jsonString.length - 1000,
            )}\n`;
          }

          fs.writeFileSync(errorLogPath, errorLog, 'utf-8');

          const errorMsg =
            `JSON 파싱 실패: ${e.message}\n\n` +
            `원본 JSON이 저장되었습니다: ${rawJsonPath}\n` +
            `오류 상세 로그: ${errorLogPath}\n\n` +
            `JSON 길이: ${jsonString.length} 문자\n` +
            `처음 500자: ${jsonString.substring(0, 500)}...`;

          output.appendLine(`[Hot Reload ERROR] ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (figmaData.error) {
          const errorMsg = figmaData.error;
          const debugInfo = figmaData.debug
            ? `\n디버그 정보: ${figmaData.debug}`
            : '';
          const hint = figmaData.hint ? `\n힌트: ${figmaData.hint}` : '';
          const stackTrace = figmaData.stackTrace
            ? `\n\n스택 트레이스:\n${figmaData.stackTrace}`
            : '';
          throw new Error(`${errorMsg}${debugInfo}${hint}${stackTrace}`);
        }

        // 5MB 초과 이미지를 따로 모을 배열
        const largeImages: LargeImageRecord[] = [];

        // 이미지 인라인 + large 이미지 분리
        output.appendLine('[Process] 이미지 에셋을 Base64로 변환 중...');
        embedImagesInJson(figmaData, projectPath, largeImages);

        // figma_large_images.json 갱신 (초기 파일 위에 덮어씀)
        const largeImagesPath = path.join(dumpDir, 'figma_large_images.json');
        const payload = {
          generatedAt: new Date().toISOString(),
          count: largeImages.length,
          images: largeImages,
        };
        fs.writeFileSync(
          largeImagesPath,
          JSON.stringify(payload, null, 2),
          'utf-8',
        );

        if (largeImages.length > 0) {
          output.appendLine(
            `[Process] 큰 이미지 ${largeImages.length}개를 figma_large_images.json에 저장했습니다: ${largeImagesPath}`,
          );
        } else {
          output.appendLine(
            `[Process] 5MB 초과 이미지는 발견되지 않았습니다. (빈 figma_large_images.json 유지)`,
          );
        }

        // 최종 JSON 문자열
        const finalJsonString = JSON.stringify(figmaData, null, 2);

        const figmaPath = path.join(dumpDir, 'figma_layout.json');
        fs.writeFileSync(figmaPath, finalJsonString, 'utf-8');
        output.appendLine(
          `[Hot Reload] figma_layout.json 저장: ${figmaPath}`,
        );

        await vscode.env.clipboard.writeText(finalJsonString);
        output.appendLine('[Process] 클립보드에 복사 완료');

        const successLogPath = path.join(dumpDir, 'success_log.txt');
        const successLog =
          `Figma Layout 추출 성공!\n\n` +
          `추출 시간: ${new Date().toISOString()}\n` +
          `JSON 길이: ${jsonString.length} 문자\n` +
          `노드 개수: ${countNodes(figmaData)}개\n\n` +
          `생성된 파일:\n` +
          `- ${figmaPath}\n` +
          `- ${rawJsonPath}\n` +
          `- ${largeImagesPath}\n`;
        fs.writeFileSync(successLogPath, successLog, 'utf-8');

        const nodeCount = countNodes(figmaData);
        output.appendLine(
          `[Hot Reload] 총 ${nodeCount}개 노드 추출 완료`,
        );

        ws.close();
        resolve();
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        output.appendLine(`[Hot Reload ERROR] ${msg}`);

        if (err.data) {
          const errorDetails = JSON.stringify(err.data, null, 2);
          output.appendLine(
            `[Hot Reload ERROR] 상세 오류 데이터:\n${errorDetails}`,
          );
          const detailedError = new Error(
            `${msg}\n\n상세 정보:\n${errorDetails}`,
          );
          reject(detailedError);
        } else {
          reject(err);
        }
      }
    });
  });
}
