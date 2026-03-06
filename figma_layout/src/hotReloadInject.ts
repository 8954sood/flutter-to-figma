import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let output: vscode.OutputChannel;

/**
 * Hot Reload Inject 초기화
 */
export function initHotReloadInject(outputChannel: vscode.OutputChannel) {
  output = outputChannel;
}

/**
 * Hot Reload 방식: 임시 파일 생성 및 main.dart 수정
 */
export function injectFigmaCrawlerViaHotReload(
  projectPath: string,
  context: vscode.ExtensionContext,
): { cleanup: () => void } {
  const extensionPath = context.extensionPath;
  const exporterSourcePath = path.join(
    extensionPath,
    'resources',
    'figma_exporter_inject.dart',
  );

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
    } else {
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

