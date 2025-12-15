import * as vscode from 'vscode';
import WebSocket from 'ws';

/**
 * VM Service 통신 관련
 */

let ws: WebSocket | null = null;
let idCounter = 1;
const pending = new Map<
  string,
  {
    resolve: (v: any) => void;
    reject: (e: any) => void;
  }
>();

let output: vscode.OutputChannel;

/**
 * VM Service 초기화 (output 채널 설정)
 */
export function initVmService(outputChannel: vscode.OutputChannel) {
  output = outputChannel;
}

/**
 * WebSocket 연결 설정
 */
export function setWebSocket(websocket: WebSocket | null) {
  ws = websocket;
}

/**
 * WebSocket 가져오기
 */
export function getWebSocket(): WebSocket | null {
  return ws;
}

/**
 * 모든 pending 요청 정리
 */
export function clearPending() {
  pending.clear();
}

/**
 * JSON-RPC sendRequest 유틸
 */
export function sendRequest(method: string, params?: any): Promise<any> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return Promise.reject(
      new Error('VM Service WebSocket이 열려 있지 않습니다.'),
    );
  }

  const id = idCounter++;
  const payload: any = {
    jsonrpc: '2.0',
    id,
    method,
  };
  if (params) payload.params = params;

  output.appendLine(`[→ VM] ${JSON.stringify(payload)}`);

  return new Promise((resolve, reject) => {
    pending.set(String(id), { resolve, reject });
    ws!.send(JSON.stringify(payload));
  });
}

/**
 * WebSocket 메시지 핸들러 등록
 */
export function setupMessageHandler(
  onMessage: (msg: any) => void,
): void {
  if (!ws) return;

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.id && pending.has(String(msg.id))) {
        const entry = pending.get(String(msg.id))!;
        pending.delete(String(msg.id));

        if (msg.error) {
          try {
            output.appendLine(
              '[VM ERROR] ' + JSON.stringify(msg.error, null, 2),
            );
          } catch {}
          const errorObj = msg.error as any;
          const details =
            (errorObj?.data && errorObj.data.details) ||
            JSON.stringify(msg.error);
          entry.reject(new Error(details));
        } else {
          entry.resolve(msg.result);
        }
        return;
      }

      // 일반 메시지 처리
      onMessage(msg);
    } catch (e: any) {
      output.appendLine(
        `[vm message parse error] ${e?.message ?? String(e)}`,
      );
    }
  });
}

