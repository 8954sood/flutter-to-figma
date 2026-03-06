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
exports.sleep = sleep;
exports.getFlutterCommand = getFlutterCommand;
exports.countNodes = countNodes;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/**
 * 유틸리티 함수들
 */
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
/**
 * Flutter 명령어 경로 자동 감지
 */
function getFlutterCommand() {
    // 1. 환경 변수에서 Flutter 경로 확인
    const flutterHome = process.env.FLUTTER_ROOT || process.env.FLUTTER_HOME;
    if (flutterHome) {
        const flutterBin = path.join(flutterHome, 'bin', 'flutter');
        if (os.platform() === 'win32') {
            return flutterBin + '.bat';
        }
        return flutterBin;
    }
    // 2. PATH에 등록된 flutter 명령어 사용 (가장 일반적)
    // Windows에서는 'flutter.bat' 또는 'flutter' 둘 다 가능
    if (os.platform() === 'win32') {
        return 'flutter.bat';
    }
    return 'flutter';
}
/**
 * 노드 트리의 총 노드 개수 계산
 */
function countNodes(node) {
    if (!node || typeof node !== 'object')
        return 0;
    let count = 1;
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            count += countNodes(child);
        }
    }
    return count;
}
//# sourceMappingURL=utils.js.map