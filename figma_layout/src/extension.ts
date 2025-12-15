// src/extension.ts

import * as vscode from 'vscode';
import WebSocket from 'ws';
import { initVmService, getWebSocket, clearPending } from './vmService';
import { initFlutterRunner } from './flutterRunner';
import { initHotReloadInject } from './hotReloadInject';
import { initDumpFullDesign, dumpFullDesign } from './dumpFullDesign';
import { initDumpFigmaLayout, dumpFigmaLayout } from './dumpFigmaLayout';

// =======================================
// Extension activate / deactivate
// =======================================
export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Flutter Inspector');
  output.appendLine('Flutter Inspector extension activated');

  // 각 모듈 초기화
  initVmService(output);
  initFlutterRunner(output);
  initHotReloadInject(output);
  initDumpFullDesign(output);
  initDumpFigmaLayout(output);

  // 기존 방식: 외부 인스펙터 API 사용
  const dumpDesignCmd = vscode.commands.registerCommand(
    'flutterInspector.dumpFullDesign',
    async () => {
      await dumpFullDesign();
    },
  );

  // 새로운 방식: 내부 RenderTree 크롤러 (Figma 최적화)
  const dumpFigmaLayoutCmd = vscode.commands.registerCommand(
    'flutterInspector.dumpFigmaLayout',
    async () => {
      await dumpFigmaLayout(context);
    },
  );

  context.subscriptions.push(dumpDesignCmd, dumpFigmaLayoutCmd, output);
}

export function deactivate() {
  const ws = getWebSocket();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  clearPending();
}
