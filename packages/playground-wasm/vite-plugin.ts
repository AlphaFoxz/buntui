import {spawn} from 'node:child_process';
import path from 'node:path';
import type {Plugin} from 'vite';

function concatChunks(chunks: Uint8Array[]): string {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(merged);
}

async function compileViaBun(filePath: string): Promise<string> {
  const scriptPath = path.resolve(import.meta.dirname, 'scripts/compile-sfc.ts');
  return new Promise<string>((resolve, reject) => {
    const proc = spawn('bun', ['run', scriptPath, filePath], {stdio: ['pipe', 'pipe', 'pipe']});
    const chunks: Uint8Array[] = [];
    const errorChunks: Uint8Array[] = [];
    proc.stdout.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    proc.stderr.on('data', (chunk: Uint8Array) => {
      errorChunks.push(chunk);
    });
    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(concatChunks(chunks));
      } else {
        reject(new Error(`SFC compilation failed: ${concatChunks(errorChunks)}`));
      }
    });
  });
}

export function buntuiSfcPlugin(): Plugin {
  return {
    name: 'buntui-sfc',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.vue')) {
        return;
      }

      const code = await compileViaBun(id);
      return {code, map: null};
    },
  };
}
