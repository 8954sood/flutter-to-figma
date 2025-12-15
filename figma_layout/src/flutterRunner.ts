import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import { getFlutterCommand } from './utils';
import { initVmService } from './vmService';

let output: vscode.OutputChannel;

/**
 * Flutter Runner 초기화
 */
export function initFlutterRunner(outputChannel: vscode.OutputChannel) {
  output = outputChannel;
  initVmService(outputChannel);
}

/**
 * flutter run --machine → debugPort(wsUri) 얻기
 */
export function runFlutterAndGetVmServiceUri(
  projectPath: string,
): Promise<{ wsUri: string }> {
  return new Promise((resolve, reject) => {
    const flutterCmd = getFlutterCommand();
    const args = ['run', '--machine'];
    output.appendLine(`Run: ${flutterCmd} ${args.join(' ')}`);

    const proc = cp.spawn(flutterCmd, args, {
      cwd: projectPath,
      env: process.env,
      shell: os.platform() === 'win32',
    });

    let stdoutBuf = '';

    const onLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const msg = JSON.parse(trimmed);
        if (msg.event === 'app.debugPort') {
          const wsUri = msg.params?.wsUri;
          if (!wsUri) {
            reject(new Error('app.debugPort 이벤트에 wsUri가 없습니다.'));
            return;
          }
          resolve({ wsUri });
        }
      } catch {
        // JSON이 아닐 수도 있으니 무시
      }
    };

    proc.stdout.on('data', (data: Buffer) => {
      stdoutBuf += data.toString();
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx);
        stdoutBuf = stdoutBuf.slice(idx + 1);
        onLine(line);
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      output.appendLine('[flutter stderr] ' + data.toString());
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('exit', (code, signal) => {
      output.appendLine(
        `flutter run exited: code=${code} signal=${signal ?? ''}`,
      );
    });

    setTimeout(() => {
      reject(
        new Error(
          'flutter run에서 app.debugPort를 찾지 못했습니다. (타임아웃 60초)',
        ),
      );
    }, 60000);
  });
}

