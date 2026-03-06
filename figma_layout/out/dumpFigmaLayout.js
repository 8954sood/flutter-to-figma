"use strict";
// dumpFigmaLayout.ts
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
exports.initDumpFigmaLayout = initDumpFigmaLayout;
exports.dumpFigmaLayout = dumpFigmaLayout;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ws_1 = __importDefault(require("ws"));
const utils_1 = require("./utils");
const vmService_1 = require("./vmService");
const flutterRunner_1 = require("./flutterRunner");
const hotReloadInject_1 = require("./hotReloadInject");
let output;
/**
 * Dump Figma Layout 초기화
 */
function initDumpFigmaLayout(outputChannel) {
    output = outputChannel;
}
/**
 * 이미지를 Base64로 변환하여 JSON에 임베딩하는 함수 (재귀)
 * - 5MB 이하: node.properties.imageBase64 에 직접 넣음
 * - 5MB 초과: largeImages[] 에 따로 저장 + node.properties.largeImageId 만 남김
 */
function embedImagesInJson(node, projectRoot, largeImages) {
    // ==========================
    // 1) 일반 / 배경 Image 처리
    // ==========================
    if (node.type === 'Image' && node.properties?.imagePath) {
        try {
            let rawPath = node.properties.imagePath;
            // "assets/..." 또는 'assets/...' 추출
            const match = rawPath.match(/["']([^"']+)["']/);
            if (match && match[1]) {
                rawPath = match[1];
            }
            else {
                // 따옴표가 없으면 Image(...) 래퍼 제거를 시도
                rawPath = rawPath
                    .replace(/^.*Image\(.*name:\s*/, '')
                    .replace(/\)$/, '');
            }
            // 경로 정규화
            const relativePath = path.normalize(rawPath);
            const fullPath = path.join(projectRoot, relativePath);
            const isBackground = !!node.properties.isBackgroundImage;
            const kind = isBackground ? 'background' : 'image';
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                output.appendLine(`[Image] ${relativePath} 파일 크기: ${stats.size} bytes (~${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
                if (stats.size <= 5 * 1024 * 1024) {
                    // 5MB 이하 → inline
                    const bitmap = fs.readFileSync(fullPath);
                    node.properties.imageBase64 = bitmap.toString('base64');
                    output.appendLine(`[Image] 변환 성공 (inline): ${relativePath}`);
                }
                else {
                    // 5MB 초과 → largeImages에 분리
                    const bitmap = fs.readFileSync(fullPath);
                    const base64 = bitmap.toString('base64');
                    const id = node.properties.largeImageId ||
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
                    output.appendLine(`[Image] 큰 이미지 분리 저장: ${relativePath} -> id=${id}`);
                }
            }
            else {
                output.appendLine(`[WARN] 파일을 찾을 수 없습니다 (원본: ${node.properties.imagePath}) -> 시도한 경로: ${fullPath}`);
                node.properties.error = 'Image file not found';
            }
        }
        catch (e) {
            output.appendLine(`[ERROR] 이미지 처리 중 오류: ${e.message}`);
        }
    }
    // ==========================
    // 2) 자식 재귀 순회
    // ==========================
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child) => embedImagesInJson(child, projectRoot, largeImages));
    }
}
/**
 * 새로운 방식: Figma 최적화 크롤러 (Hot Reload 방식)
 */
async function dumpFigmaLayout(context) {
    let cleanup;
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('워크스페이스 폴더가 없습니다.');
            return;
        }
        const projectPath = folders[0].uri.fsPath;
        output.appendLine(`[Hot Reload] Project path: ${projectPath}`);
        // VM Service URI 확인 (실행 중인 디버그 세션 또는 수동 입력)
        let vmServiceUri;
        // 1. 실행 중인 Flutter 디버그 세션 확인
        const debugSession = vscode.debug.activeDebugSession;
        if (debugSession && debugSession.type === 'dart') {
            try {
                const vmService = await debugSession.customRequest('getVM');
                output.appendLine(`[Hot Reload] 실행 중인 디버그 세션 발견: ${debugSession.id}`);
            }
            catch (e) {
                output.appendLine(`[Hot Reload] 디버그 세션에서 VM Service URI 추출 실패: ${e}`);
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
            images: [],
        };
        fs.writeFileSync(initLargeImagesPath, JSON.stringify(initPayload, null, 2), 'utf-8');
        output.appendLine(`[Init] figma_large_images.json 초기 생성: ${initLargeImagesPath}`);
        // 2. 수동 입력 또는 자동 실행
        if (!vmServiceUri) {
            const manualUri = await vscode.window.showInputBox({
                title: 'Flutter VM Service URI 입력 (비우면 자동 실행)',
                prompt: '이미 실행 중인 앱의 VM Service URI (예: ws://127.0.0.1:8181/ws). 비우면 flutter run --machine 으로 자동 실행합니다.',
                placeHolder: 'ws://127.0.0.1:8181/ws',
                ignoreFocusOut: true,
                value: '',
            });
            if (manualUri && manualUri.trim().length > 0) {
                vmServiceUri = manualUri.trim();
                output.appendLine(`[Hot Reload] [Manual] Using VM Service: ${vmServiceUri}`);
                console.log('[FigmaLayout] 코드 주입 시작 (수동 URI)');
                output.appendLine('[Hot Reload] 코드 주입 중...');
                const injection = (0, hotReloadInject_1.injectFigmaCrawlerViaHotReload)(projectPath, context);
                cleanup = injection.cleanup;
                console.log('[FigmaLayout] 코드 주입 완료');
            }
            else {
                console.log('[FigmaLayout] 코드 주입 시작 (자동)');
                output.appendLine('[Hot Reload] 코드 주입 중...');
                const injection = (0, hotReloadInject_1.injectFigmaCrawlerViaHotReload)(projectPath, context);
                cleanup = injection.cleanup;
                console.log('[FigmaLayout] 코드 주입 완료, Flutter 앱 실행...');
                output.appendLine('[Hot Reload] Flutter 앱 실행 중...');
                const result = await (0, flutterRunner_1.runFlutterAndGetVmServiceUri)(projectPath);
                vmServiceUri = result.wsUri;
                output.appendLine(`[Hot Reload] [Auto] VM Service from flutter run: ${vmServiceUri}`);
            }
        }
        else {
            output.appendLine('[Hot Reload] 코드 주입 중...');
            const injection = (0, hotReloadInject_1.injectFigmaCrawlerViaHotReload)(projectPath, context);
            cleanup = injection.cleanup;
        }
        if (!vmServiceUri) {
            throw new Error('VM Service URI를 얻지 못했습니다.');
        }
        // 3. Hot Reload 실행 (VM Service를 통해 직접 수행)
        if (cleanup !== undefined) {
            output.appendLine('[Hot Reload] VM Service를 통해 Hot Reload 실행 중...');
            try {
                const reloadWs = new ws_1.default(vmServiceUri);
                await new Promise((resolveReload, rejectReload) => {
                    reloadWs.on('error', rejectReload);
                    reloadWs.on('open', async () => {
                        try {
                            const reloadMsg = JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'reloadSources',
                                params: { isolateId: '' },
                            });
                            // getVM으로 isolateId 가져오기
                            const vmMsg = JSON.stringify({
                                jsonrpc: '2.0',
                                id: 0,
                                method: 'getVM',
                                params: {},
                            });
                            reloadWs.send(vmMsg);
                            reloadWs.on('message', (data) => {
                                try {
                                    const resp = JSON.parse(data.toString());
                                    if (resp.id === 0 && resp.result?.isolates?.length > 0) {
                                        const isoId = resp.result.isolates[0].id;
                                        reloadWs.send(JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: 1,
                                            method: 'reloadSources',
                                            params: { isolateId: isoId },
                                        }));
                                    }
                                    if (resp.id === 1) {
                                        reloadWs.close();
                                        resolveReload();
                                    }
                                }
                                catch { }
                            });
                        }
                        catch (e) {
                            rejectReload(e);
                        }
                    });
                });
                await (0, utils_1.sleep)(3000);
                console.log('[FigmaLayout] ✅ VM Service Hot Reload 완료');
            }
            catch (e) {
                console.log(`[FigmaLayout] ❌ VM Service Hot Reload 실패: ${e.message}`);
                try {
                    await vscode.commands.executeCommand('flutter.hotReload');
                    await (0, utils_1.sleep)(2000);
                }
                catch { }
            }
        }
        // 4. VM Service 접속 & evaluate로 함수 호출
        await dumpFigmaLayoutFromVm(vmServiceUri, dumpDir, projectPath);
        vscode.window.showInformationMessage(`Figma 데이터가 클립보드에 복사되었습니다! (이미지 포함 / 큰 이미지는 figma_large_images.json에 저장)`);
    }
    catch (err) {
        const msg = err?.message ?? String(err);
        vscode.window.showErrorMessage(`Figma layout dump failed: ${msg}`);
        output.appendLine(`[Hot Reload ERROR] ${msg}`);
        if (err?.stack)
            output.appendLine(String(err.stack));
    }
    finally {
        if (cleanup) {
            cleanup();
        }
    }
}
async function dumpFigmaLayoutFromVm(vmServiceUri, dumpDir, projectPath) {
    const ws = new ws_1.default(vmServiceUri);
    (0, vmService_1.setWebSocket)(ws);
    return new Promise((resolve, reject) => {
        ws.on('error', (err) => reject(err));
        (0, vmService_1.setupMessageHandler)(() => {
            // 일반 메시지는 무시
        });
        ws.on('open', async () => {
            try {
                console.log('[FigmaLayout] WebSocket connected, calling getVM...');
                const vm = await (0, vmService_1.sendRequest)('getVM');
                console.log('[FigmaLayout] getVM result:', JSON.stringify(vm.isolates?.map((i) => ({ id: i.id, name: i.name }))));
                const isolates = vm.isolates;
                if (!isolates || isolates.length === 0) {
                    throw new Error('VM에 isolates가 없습니다.');
                }
                const isolateId = isolates[0].id;
                output.appendLine(`[Hot Reload] isolate: ${isolateId}`);
                console.log('[FigmaLayout] getIsolate 호출...');
                output.appendLine('[Hot Reload] figma_temp_crawler 라이브러리 찾는 중...');
                const isolate = await (0, vmService_1.sendRequest)('getIsolate', { isolateId });
                const libraries = isolate.libraries;
                let crawlerLib = libraries.find((lib) => lib.uri.includes('figma_temp_crawler.dart'));
                if (!crawlerLib) {
                    crawlerLib = libraries.find((lib) => lib.uri.endsWith('figma_temp_crawler.dart') ||
                        lib.uri.includes('figma_temp_crawler'));
                }
                console.log(`[FigmaLayout] 총 ${libraries.length}개 라이브러리`);
                if (!crawlerLib) {
                    console.log('[FigmaLayout] ❌ figma_temp_crawler 못찾음. 라이브러리 목록:');
                    libraries.forEach((lib) => console.log(`  - ${lib.uri}`));
                }
                if (crawlerLib) {
                    console.log(`[FigmaLayout] ✅ 라이브러리 찾음: ${crawlerLib.uri} (${crawlerLib.id})`);
                }
                else {
                    console.log('[FigmaLayout] 전역 컨텍스트로 fallback');
                }
                await (0, utils_1.sleep)(1500);
                console.log('[FigmaLayout] evaluate 호출 시작...');
                let result;
                if (crawlerLib) {
                    try {
                        console.log(`[FigmaLayout] 라이브러리 컨텍스트 evaluate (targetId: ${crawlerLib.id})`);
                        result = await (0, vmService_1.sendRequest)('evaluate', {
                            isolateId,
                            targetId: crawlerLib.id,
                            expression: 'figmaExtractorEntryPoint()',
                        });
                        console.log('[FigmaLayout] ✅ evaluate 성공:', JSON.stringify(result).substring(0, 500));
                    }
                    catch (e) {
                        console.log('[FigmaLayout] ❌ 라이브러리 컨텍스트 실패:', JSON.stringify(e?.data ?? e.message));
                        console.log('[FigmaLayout] 전역 컨텍스트로 재시도...');
                        result = await (0, vmService_1.sendRequest)('evaluate', {
                            isolateId,
                            expression: 'figmaExtractorEntryPoint()',
                        });
                        console.log('[FigmaLayout] 전역 결과:', JSON.stringify(result).substring(0, 500));
                    }
                }
                else {
                    try {
                        console.log('[FigmaLayout] 전역 컨텍스트 evaluate...');
                        result = await (0, vmService_1.sendRequest)('evaluate', {
                            isolateId,
                            expression: 'figmaExtractorEntryPoint()',
                        });
                        console.log('[FigmaLayout] ✅ 전역 evaluate 성공:', JSON.stringify(result).substring(0, 500));
                    }
                    catch (e) {
                        console.log('[FigmaLayout] ❌ 전역 evaluate 실패:', JSON.stringify(e?.data ?? e.message));
                        throw new Error(`함수를 찾을 수 없습니다. Hot Reload가 완료되었는지 확인하세요: ${JSON.stringify(e?.data ?? e.message)}`);
                    }
                }
                let jsonString;
                if (result && typeof result === 'object') {
                    if (result.valueAsString && result.valueAsStringIsTruncated !== true) {
                        jsonString = result.valueAsString;
                    }
                    else if (result.id) {
                        output.appendLine(`[Hot Reload] 결과가 잘려있어 전체 객체를 요청합니다... (ID: ${result.id})`);
                        const fullObject = await (0, vmService_1.sendRequest)('getObject', {
                            isolateId,
                            objectId: result.id,
                        });
                        if (fullObject && fullObject.valueAsString) {
                            if (fullObject.valueAsStringIsTruncated === true) {
                                output.appendLine('[Hot Reload] 전체 객체에서도 문자열이 잘려있습니다. 부분적으로 가져옵니다...');
                                jsonString = fullObject.valueAsString;
                                output.appendLine(`[Hot Reload] 경고: 가져온 문자열이 여전히 잘려있을 수 있습니다. 길이: ${jsonString.length}`);
                            }
                            else {
                                jsonString = fullObject.valueAsString;
                            }
                        }
                        else {
                            throw new Error('전체 객체에서 문자열 값을 찾을 수 없습니다: ' +
                                JSON.stringify(fullObject));
                        }
                    }
                    else {
                        throw new Error('예상치 못한 결과 형식 (ID 없음): ' + JSON.stringify(result));
                    }
                }
                else if (typeof result === 'string') {
                    jsonString = result;
                }
                else {
                    throw new Error('예상치 못한 결과 형식: ' + JSON.stringify(result));
                }
                output.appendLine(`[Hot Reload] JSON 문자열 길이: ${jsonString.length} 문자`);
                const rawJsonPath = path.join(dumpDir, 'figma_layout_raw.json');
                fs.writeFileSync(rawJsonPath, jsonString, 'utf-8');
                output.appendLine(`[Hot Reload] 원본 JSON 저장: ${rawJsonPath}`);
                let figmaData;
                try {
                    figmaData = JSON.parse(jsonString);
                }
                catch (e) {
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
                        errorLog += `오류 주변 텍스트 (${start}-${end}):\n${jsonString.substring(start, end)}\n\n`;
                    }
                    errorLog += `JSON 처음 1000자:\n${jsonString.substring(0, 1000)}\n\n`;
                    if (jsonString.length > 1000) {
                        errorLog += `JSON 마지막 1000자:\n${jsonString.substring(jsonString.length - 1000)}\n`;
                    }
                    fs.writeFileSync(errorLogPath, errorLog, 'utf-8');
                    const errorMsg = `JSON 파싱 실패: ${e.message}\n\n` +
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
                const largeImages = [];
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
                fs.writeFileSync(largeImagesPath, JSON.stringify(payload, null, 2), 'utf-8');
                if (largeImages.length > 0) {
                    output.appendLine(`[Process] 큰 이미지 ${largeImages.length}개를 figma_large_images.json에 저장했습니다: ${largeImagesPath}`);
                }
                else {
                    output.appendLine(`[Process] 5MB 초과 이미지는 발견되지 않았습니다. (빈 figma_large_images.json 유지)`);
                }
                // 최종 JSON 문자열
                const finalJsonString = JSON.stringify(figmaData, null, 2);
                const figmaPath = path.join(dumpDir, 'figma_layout.json');
                fs.writeFileSync(figmaPath, finalJsonString, 'utf-8');
                output.appendLine(`[Hot Reload] figma_layout.json 저장: ${figmaPath}`);
                await vscode.env.clipboard.writeText(finalJsonString);
                output.appendLine('[Process] 클립보드에 복사 완료');
                const successLogPath = path.join(dumpDir, 'success_log.txt');
                const successLog = `Figma Layout 추출 성공!\n\n` +
                    `추출 시간: ${new Date().toISOString()}\n` +
                    `JSON 길이: ${jsonString.length} 문자\n` +
                    `노드 개수: ${(0, utils_1.countNodes)(figmaData)}개\n\n` +
                    `생성된 파일:\n` +
                    `- ${figmaPath}\n` +
                    `- ${rawJsonPath}\n` +
                    `- ${largeImagesPath}\n`;
                fs.writeFileSync(successLogPath, successLog, 'utf-8');
                const nodeCount = (0, utils_1.countNodes)(figmaData);
                output.appendLine(`[Hot Reload] 총 ${nodeCount}개 노드 추출 완료`);
                ws.close();
                resolve();
            }
            catch (err) {
                const msg = err?.message ?? String(err);
                output.appendLine(`[Hot Reload ERROR] ${msg}`);
                if (err.data) {
                    const errorDetails = JSON.stringify(err.data, null, 2);
                    output.appendLine(`[Hot Reload ERROR] 상세 오류 데이터:\n${errorDetails}`);
                    const detailedError = new Error(`${msg}\n\n상세 정보:\n${errorDetails}`);
                    reject(detailedError);
                }
                else {
                    reject(err);
                }
            }
        });
    });
}
//# sourceMappingURL=dumpFigmaLayout.js.map