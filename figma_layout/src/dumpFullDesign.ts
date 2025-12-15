import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws';
import { sleep } from './utils';
import { sendRequest, setWebSocket, setupMessageHandler, clearPending } from './vmService';
import { runFlutterAndGetVmServiceUri } from './flutterRunner';

let output: vscode.OutputChannel;

/**
 * Dump Full Design 초기화
 */
export function initDumpFullDesign(outputChannel: vscode.OutputChannel) {
  output = outputChannel;
}

/**
 * 메인 커맨드: 전체 화면 디자인 덤프
 */
export async function dumpFullDesign() {
  try {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage('워크스페이스 폴더가 없습니다.');
      return;
    }
    const projectPath = folders[0].uri.fsPath;
    output.appendLine(`Project path: ${projectPath}`);

    const manualUri = await vscode.window.showInputBox({
      title: 'Flutter VM Service URI 입력 (비우면 자동 실행)',
      prompt:
        '이미 실행 중인 앱의 VM Service URI (예: ws://127.0.0.1:8181/ws). 비우면 flutter run --machine 으로 자동 실행합니다.',
      placeHolder: 'ws://127.0.0.1:8181/ws',
      ignoreFocusOut: true,
      value: '',
    });

    let vmServiceUri: string;
    if (manualUri && manualUri.trim().length > 0) {
      vmServiceUri = manualUri.trim();
      output.appendLine(`[Manual] Using VM Service: ${vmServiceUri}`);
    } else {
      const result = await runFlutterAndGetVmServiceUri(projectPath);
      vmServiceUri = result.wsUri;
      output.appendLine(`[Auto] VM Service from flutter run: ${vmServiceUri}`);
    }

    // 덤프 저장 디렉토리
    const dumpDir = path.join(projectPath, 'flutter_inspector_dump');
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    // VM Service 접속 & 전체 덤프
    await dumpFullDesignFromVm(vmServiceUri, dumpDir);

    vscode.window.showInformationMessage(
      `Flutter 화면 디자인 정보를 JSON으로 덤프했습니다: ${dumpDir}`,
    );
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    vscode.window.showErrorMessage(`Full design dump failed: ${msg}`);
    output.appendLine(`[ERROR] ${msg}`);
    if (err?.stack) output.appendLine(String(err.stack));
  }
}

/**
 * dumpFullDesign용: VM 연결 후 전체 트리 + 모든 노드의 layout/details 덤프
 */
async function dumpFullDesignFromVm(
  vmServiceUri: string,
  dumpDir: string,
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
        output.appendLine(`[Inspector] dump용 isolate: ${isolateId}`);

        // inspector 초기화
        try {
          await sendRequest('ext.flutter.inspector.setSelectionById', {
            id: '0',
            objectGroup: 'vscode-inspector',
            isolateId,
          });
        } catch (e: any) {
          output.appendLine(
            `[Inspector] setSelectionById(0) 오류 (무시 가능): ${
              e?.message ?? String(e)
            }`,
          );
        }

        try {
          await sendRequest('ext.flutter.inspector.getSelectedWidget', {
            objectGroup: 'vscode-inspector',
            isolateId,
          });
        } catch (e: any) {
          output.appendLine(
            `[Inspector] getSelectedWidget 오류 (무시 가능): ${
              e?.message ?? String(e)
            }`,
          );
        }

        await sleep(200);

        // 1) Root Widget Summary Tree
        const tree = await waitForRootWidgetSummaryTree(isolateId);
        const summaryPath = path.join(dumpDir, 'summary_tree.json');
        fs.writeFileSync(summaryPath, JSON.stringify(tree, null, 2), 'utf-8');
        output.appendLine(`[DUMP] summary_tree.json 저장: ${summaryPath}`);

        // 2) 트리에서 diagnostics valueId 전체 수집
        const valueIds = collectAllValueIds(tree);
        output.appendLine(
          `[DUMP] 총 ${valueIds.length}개 diagnostics valueId 수집`,
        );

        const layoutById: Record<string, any> = {};
        const detailsById: Record<string, any> = {};

        // 3) 각 valueId에 대해 layout + details 호출
        for (const id of valueIds) {
          output.appendLine(`[DUMP] 처리 중: ${id}`);

          // LayoutExplorerNode
          try {
            const layoutNode = await sendRequest(
              'ext.flutter.inspector.getLayoutExplorerNode',
              {
                id,
                groupName: 'vscode-inspector',
                subtreeDepth: '1',
                isolateId,
              },
            );
            layoutById[id] = layoutNode;
          } catch (e: any) {
            output.appendLine(
              `[WARN] getLayoutExplorerNode(${id}) 실패: ${
                e?.message ?? String(e)
              }`,
            );
          }

          // DetailsSubtree
          try {
            const detailsNode = await sendRequest(
              'ext.flutter.inspector.getDetailsSubtree',
              {
                objectGroup: 'vscode-inspector',
                arg: id,
                subtreeDepth: '2',
                isolateId,
              },
            );
            detailsById[id] = detailsNode;
          } catch (e: any) {
            output.appendLine(
              `[WARN] getDetailsSubtree(${id}) 실패: ${
                e?.message ?? String(e)
              }`,
            );
          }

          await sleep(10);
        }

        const layoutPath = path.join(dumpDir, 'layout_by_id.json');
        const detailsPath = path.join(dumpDir, 'details_by_id.json');

        fs.writeFileSync(layoutPath, JSON.stringify(layoutById, null, 2), 'utf-8');
        fs.writeFileSync(detailsPath, JSON.stringify(detailsById, null, 2), 'utf-8');

        output.appendLine(`[DUMP] layout_by_id.json 저장: ${layoutPath}`);
        output.appendLine(`[DUMP] details_by_id.json 저장: ${detailsPath}`);

        ws.close();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Root Widget Summary Tree 재시도 로직
 */
async function waitForRootWidgetSummaryTree(
  isolateId: string,
): Promise<any> {
  const maxAttempts = 20;
  const delayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      output.appendLine(
        `[Inspector] getRootWidgetSummaryTree 시도 ${attempt}/${maxAttempts}`,
      );
      const tree = await sendRequest(
        'ext.flutter.inspector.getRootWidgetSummaryTree',
        {
          objectGroup: 'vscode-inspector',
          isSummaryTree: true,
          withPreviews: true,
          isolateId,
        },
      );
      output.appendLine('[Inspector] getRootWidgetSummaryTree 성공');
      return tree;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('Null check operator used on a null value')) {
        output.appendLine(
          `[Inspector] widget tree not ready yet (Null check). ${delayMs}ms 후 재시도...`,
        );
        await sleep(delayMs);
        continue;
      }
      output.appendLine(
        `[Inspector] getRootWidgetSummaryTree 치명적 오류: ${msg}`,
      );
      throw e;
    }
  }

  throw new Error(
    'Widget tree not ready after multiple attempts (getRootWidgetSummaryTree 계속 실패)',
  );
}

/**
 * 요약 트리에서 모든 diagnostics valueId 수집
 */
function collectAllValueIds(tree: any): string[] {
  const ids = new Set<string>();

  function dfs(node: any) {
    if (!node || typeof node !== 'object') return;

    if (typeof node.valueId === 'string') {
      ids.add(node.valueId);
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) dfs(child);
    }

    // tree.result 구조를 위해 다른 필드도 탐색
    for (const key of Object.keys(node)) {
      if (key === 'children') continue;
      const child = (node as any)[key];
      if (child && typeof child === 'object') {
        dfs(child);
      }
    }
  }

  if (tree && typeof tree === 'object' && 'result' in tree) {
    dfs(tree.result);
  } else {
    dfs(tree);
  }

  return Array.from(ids);
}

