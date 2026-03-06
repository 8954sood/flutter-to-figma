"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initVmService = initVmService;
exports.setWebSocket = setWebSocket;
exports.getWebSocket = getWebSocket;
exports.clearPending = clearPending;
exports.sendRequest = sendRequest;
exports.setupMessageHandler = setupMessageHandler;
const ws_1 = __importDefault(require("ws"));
/**
 * VM Service 통신 관련
 */
let ws = null;
let idCounter = 1;
const pending = new Map();
let output;
/**
 * VM Service 초기화 (output 채널 설정)
 */
function initVmService(outputChannel) {
    output = outputChannel;
}
/**
 * WebSocket 연결 설정
 */
function setWebSocket(websocket) {
    ws = websocket;
}
/**
 * WebSocket 가져오기
 */
function getWebSocket() {
    return ws;
}
/**
 * 모든 pending 요청 정리
 */
function clearPending() {
    pending.clear();
}
/**
 * JSON-RPC sendRequest 유틸
 */
function sendRequest(method, params) {
    if (!ws || ws.readyState !== ws_1.default.OPEN) {
        return Promise.reject(new Error('VM Service WebSocket이 열려 있지 않습니다.'));
    }
    const id = idCounter++;
    const payload = {
        jsonrpc: '2.0',
        id,
        method,
    };
    if (params)
        payload.params = params;
    output.appendLine(`[→ VM] ${JSON.stringify(payload)}`);
    return new Promise((resolve, reject) => {
        pending.set(String(id), { resolve, reject });
        ws.send(JSON.stringify(payload));
    });
}
/**
 * WebSocket 메시지 핸들러 등록
 */
function setupMessageHandler(onMessage) {
    if (!ws)
        return;
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.id && pending.has(String(msg.id))) {
                const entry = pending.get(String(msg.id));
                pending.delete(String(msg.id));
                if (msg.error) {
                    try {
                        output.appendLine('[VM ERROR] ' + JSON.stringify(msg.error, null, 2));
                    }
                    catch { }
                    const errorObj = msg.error;
                    const details = (errorObj?.data && errorObj.data.details) ||
                        JSON.stringify(msg.error);
                    entry.reject(new Error(details));
                }
                else {
                    entry.resolve(msg.result);
                }
                return;
            }
            // 일반 메시지 처리
            onMessage(msg);
        }
        catch (e) {
            output.appendLine(`[vm message parse error] ${e?.message ?? String(e)}`);
        }
    });
}
//# sourceMappingURL=vmService.js.map