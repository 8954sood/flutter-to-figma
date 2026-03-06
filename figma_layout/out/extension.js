"use strict";
// src/extension.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
const vmService_1 = require("./vmService");
const flutterRunner_1 = require("./flutterRunner");
const hotReloadInject_1 = require("./hotReloadInject");
const dumpFullDesign_1 = require("./dumpFullDesign");
const dumpFigmaLayout_1 = require("./dumpFigmaLayout");
// =======================================
// Extension activate / deactivate
// =======================================
function activate(context) {
    const output = vscode.window.createOutputChannel('Flutter Inspector');
    output.appendLine('Flutter Inspector extension activated');
    // 각 모듈 초기화
    (0, vmService_1.initVmService)(output);
    (0, flutterRunner_1.initFlutterRunner)(output);
    (0, hotReloadInject_1.initHotReloadInject)(output);
    (0, dumpFullDesign_1.initDumpFullDesign)(output);
    (0, dumpFigmaLayout_1.initDumpFigmaLayout)(output);
    // 기존 방식: 외부 인스펙터 API 사용
    const dumpDesignCmd = vscode.commands.registerCommand('flutterInspector.dumpFullDesign', async () => {
        await (0, dumpFullDesign_1.dumpFullDesign)();
    });
    // 새로운 방식: 내부 RenderTree 크롤러 (Figma 최적화)
    const dumpFigmaLayoutCmd = vscode.commands.registerCommand('flutterInspector.dumpFigmaLayout', async () => {
        await (0, dumpFigmaLayout_1.dumpFigmaLayout)(context);
    });
    context.subscriptions.push(dumpDesignCmd, dumpFigmaLayoutCmd, output);
}
function deactivate() {
    const ws = (0, vmService_1.getWebSocket)();
    if (ws && ws.readyState === ws_1.default.OPEN) {
        ws.close();
    }
    (0, vmService_1.clearPending)();
}
//# sourceMappingURL=extension.js.map