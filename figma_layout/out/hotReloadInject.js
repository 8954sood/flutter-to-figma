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
exports.initHotReloadInject = initHotReloadInject;
exports.injectFigmaCrawlerViaHotReload = injectFigmaCrawlerViaHotReload;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let output;
/**
 * Hot Reload Inject 초기화
 */
function initHotReloadInject(outputChannel) {
    output = outputChannel;
}
/**
 * Hot Reload 방식: 임시 파일 생성 및 main.dart 수정
 */
function injectFigmaCrawlerViaHotReload(projectPath, context) {
    const extensionPath = context.extensionPath;
    const exporterSourcePath = path.join(extensionPath, 'resources', 'figma_exporter_inject.dart');
    // 1. 임시 크롤러 파일 생성 (lib/figma_temp_crawler.dart)
    const tempCrawlerPath = path.join(projectPath, 'lib', 'figma_temp_crawler.dart');
    const exporterCode = fs.readFileSync(exporterSourcePath, 'utf-8');
    fs.writeFileSync(tempCrawlerPath, exporterCode, 'utf-8');
    output.appendLine(`[Hot Reload] 임시 크롤러 파일 생성: ${tempCrawlerPath}`);
    // 2. 원본 main.dart 백업 및 수정
    const mainPath = path.join(projectPath, 'lib', 'main.dart');
    if (!fs.existsSync(mainPath)) {
        throw new Error('lib/main.dart 파일을 찾을 수 없습니다.');
    }
    const originalMainCode = fs.readFileSync(mainPath, 'utf-8');
    let modifiedMainCode = originalMainCode;
    // import 추가 (이미 있으면 스킵)
    if (!modifiedMainCode.includes("import 'figma_temp_crawler.dart'")) {
        // 마지막 import 뒤에 추가
        const importRegex = /^import\s+['"].*['"];?\s*$/gm;
        const imports = modifiedMainCode.match(importRegex);
        if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const lastImportIndex = modifiedMainCode.lastIndexOf(lastImport) + lastImport.length;
            modifiedMainCode =
                modifiedMainCode.slice(0, lastImportIndex) +
                    "\nimport 'figma_temp_crawler.dart';\n" +
                    modifiedMainCode.slice(lastImportIndex);
        }
        else {
            // import가 없으면 맨 위에 추가
            modifiedMainCode = "import 'figma_temp_crawler.dart';\n" + modifiedMainCode;
        }
    }
    // 수정된 main.dart 저장
    fs.writeFileSync(mainPath, modifiedMainCode, 'utf-8');
    output.appendLine(`[Hot Reload] main.dart에 import 추가 완료`);
    // cleanup: 파일을 그대로 유지 (삭제하지 않음)
    const cleanup = () => {
        output.appendLine(`[Hot Reload] 크롤러 파일 유지: ${tempCrawlerPath}`);
    };
    return { cleanup };
}
//# sourceMappingURL=hotReloadInject.js.map