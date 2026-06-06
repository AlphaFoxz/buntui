import {it, expect, describe} from 'bun:test';
import path from 'node:path';

function rewriteImports(content: string, originalPath: string, fileMap: Map<string, string>): string {
  const originalDir = path.dirname(originalPath);
  for (const [otherPath, otherName] of fileMap) {
    if (otherPath === originalPath) {
      continue;
    }

    const rel = path.relative(originalDir, otherPath).replaceAll('\\', '/');
    const escaped = rel.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
    content = content.replaceAll(
      new RegExp(String.raw`from\s*(["'])${escaped}\1`, 'gu'),
      `from $1./${otherName}$1`,
    );
    content = content.replaceAll(
      new RegExp(String.raw`import\s*\(\s*(["'])${escaped}\1\s*\)`, 'gu'),
      `import("./${otherName}")`,
    );
  }

  return content;
}

function makeRelative(fromDir: string, toPath: string): string {
  return path.relative(fromDir, toPath).replaceAll('\\', '/');
}

describe('rewriteImports', () => {
  const distDir = '/project/dist';

  it('rewrites static import with double quotes', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const chunkPath = path.join(distDir, 'chunk-abc123.js');
    const rel = makeRelative(path.join(distDir, 'demo'), chunkPath);
    const fileMap = new Map<string, string>([
      [chunkPath, '__common.js'],
    ]);
    const content = `import {foo} from "${rel}";`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(`import {foo} from "./__common.js";`);
  });

  it('rewrites static import with single quotes', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const chunkPath = path.join(distDir, 'chunk-abc.js');
    const rel = makeRelative(path.join(distDir, 'demo'), chunkPath);
    const fileMap = new Map<string, string>([
      [chunkPath, '__common.js'],
    ]);
    const content = `import {bar} from '${rel}';`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(`import {bar} from './__common.js';`);
  });

  it('rewrites dynamic import()', () => {
    const originalPath = path.join(distDir, 'video-player', 'main.js');
    const chunkPath = path.join(distDir, 'chunk-xyz.js');
    const rel = makeRelative(path.join(distDir, 'video-player'), chunkPath);
    const fileMap = new Map<string, string>([
      [chunkPath, '__common.js'],
    ]);
    const content = `const mod = import("${rel}");`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(`const mod = import("./__common.js");`);
  });

  it('rewrites multiple different imports', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const chunk1 = path.join(distDir, 'chunk-a.js');
    const chunk2 = path.join(distDir, 'chunk-b.js');
    const rel1 = makeRelative(path.join(distDir, 'demo'), chunk1);
    const rel2 = makeRelative(path.join(distDir, 'demo'), chunk2);
    const fileMap = new Map<string, string>([
      [chunk1, '__common.js'],
      [chunk2, '__common-1.js'],
    ]);
    const content = `import {a} from "${rel1}";\nimport {b} from "${rel2}";`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toContain('from "./__common.js"');
    expect(result).toContain('from "./__common-1.js"');
  });

  it('does not rewrite own path', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const fileMap = new Map<string, string>([
      [originalPath, 'demo.js'],
    ]);
    const content = `console.log("hello");`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(content);
  });

  it('does not modify unrelated imports', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const chunkPath = path.join(distDir, 'chunk-a.js');
    const fileMap = new Map<string, string>([
      [chunkPath, '__common.js'],
    ]);
    const content = `import {foo} from "@buntui/core";`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(content);
  });

  it('handles same-directory relative path', () => {
    const originalPath = path.join(distDir, 'demo', 'main.js');
    const sameDirPath = path.join(distDir, 'demo', 'helper.js');
    const rel = makeRelative(path.join(distDir, 'demo'), sameDirPath);
    const fileMap = new Map<string, string>([
      [sameDirPath, '__common.js'],
    ]);
    const content = `import {x} from "${rel}";`;
    const result = rewriteImports(content, originalPath, fileMap);
    expect(result).toBe(`import {x} from "./__common.js";`);
  });
});
