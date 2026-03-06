"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFlutterRunner = initFlutterRunner;
exports.runFlutterAndGetVmServiceUri = runFlutterAndGetVmServiceUri;
const cp = __importStar(require("child_process"));
const os = __importStar(require("os"));
const utils_1 = require("./utils");
const vmService_1 = require("./vmService");
let output;
/**
 * Flutter Runner 초기화
 */
function initFlutterRunner(outputChannel) {
    output = outputChannel;
    (0, vmService_1.initVmService)(outputChannel);
}
/**
 * flutter run --machine → debugPort(wsUri) 얻기
 */
function runFlutterAndGetVmServiceUri(projectPath) {
    return new Promise((resolve, reject) => {
        const flutterCmd = (0, utils_1.getFlutterCommand)();
        const args = ['run', '--machine'];
        output.appendLine(`Run: ${flutterCmd} ${args.join(' ')}`);
        const proc = cp.spawn(flutterCmd, args, {
            cwd: projectPath,
            env: process.env,
            shell: os.platform() === 'win32',
        });
        let stdoutBuf = '';
        const onLine = (line) => {
            const trimmed = line.trim();
            if (!trimmed)
                return;
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
            }
            catch {
                // JSON이 아닐 수도 있으니 무시
            }
        };
        proc.stdout.on('data', (data) => {
            stdoutBuf += data.toString();
            let idx;
            while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
                const line = stdoutBuf.slice(0, idx);
                stdoutBuf = stdoutBuf.slice(idx + 1);
                onLine(line);
            }
        });
        proc.stderr.on('data', (data) => {
            output.appendLine('[flutter stderr] ' + data.toString());
        });
        proc.on('error', (err) => {
            reject(err);
        });
        proc.on('exit', (code, signal) => {
            output.appendLine(`flutter run exited: code=${code} signal=${signal ?? ''}`);
        });
        setTimeout(() => {
            reject(new Error('flutter run에서 app.debugPort를 찾지 못했습니다. (타임아웃 60초)'));
        }, 60000);
    });
}
//# sourceMappingURL=flutterRunner.js.map