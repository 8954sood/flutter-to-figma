import * as os from 'os';
import * as path from 'path';

/**
 * 유틸리티 함수들
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Flutter 명령어 경로 자동 감지
 */
export function getFlutterCommand(): string {
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
export function countNodes(node: any): number {
  if (!node || typeof node !== 'object') return 0;
  let count = 1;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

