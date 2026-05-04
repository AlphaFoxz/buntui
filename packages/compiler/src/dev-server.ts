import path from 'node:path';
import process from 'node:process';
import {watch, readFileSync} from 'node:fs';
import {compile, type CompileOptions} from './compile';

export type DevServerOptions = {
  /** Path to the .vue SFC file to watch */
  file: string;
  /** Compile options forwarded to compile(). `filename` defaults to `file`. */
  compileOptions?: CompileOptions;
  /** Called to clear existing state before reload */
  onClear: () => void;
  /** Called with the compiled module's setup export */
  onReload: (setup: (scene: unknown) => void) => void;
  /** Called on compile or import errors */
  onError?: (error: Error) => void;
  /** Debounce ms (default 100) */
  debounceMs?: number;
};

const VUE_IMPORT_RE = /import\s+\w+\s+from\s+['"]([^'"]+\.vue)['"]/gv;

let tempCounter = 0;

/**
 * Recursively discover all .vue files in the import chain starting from `entryPath`.
 */
function discoverVueFiles(entryPath: string): string[] {
  const visited = new Set<string>();
  const queue: string[] = [entryPath];
  const files: string[] = [];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    files.push(current);

    try {
      const source = readFileSync(current, 'utf-8');
      const dir = path.dirname(current);
      for (const match of source.matchAll(VUE_IMPORT_RE)) {
        const resolved = path.resolve(dir, match[1]!);
        if (!visited.has(resolved)) {
          queue.push(resolved);
        }
      }
    } catch {
      // File might not exist or be unreadable, skip
    }
  }

  return files;
}

/**
 * Find the original .vue import path string used in compiled code for a given resolved path.
 */
function findVueImportPath(compiledCode: string, resolvedPath: string, baseDir: string): string | undefined {
  for (const match of compiledCode.matchAll(VUE_IMPORT_RE)) {
    const importPath = match[1]!;
    const candidate = path.resolve(baseDir, importPath);
    if (candidate === resolvedPath) {
      return importPath;
    }
  }

  return undefined;
}

function replaceImportPath(code: string, original: string, replacement: string): string {
  const normalized = replacement.replaceAll('\\', '/');
  return code
    .replaceAll(`'${original}'`, `'${normalized}'`)
    .replaceAll(`"${original}"`, `"${normalized}"`);
}

export function createDevServer(options: DevServerOptions): {close: () => void} {
  const {
    file,
    compileOptions,
    onClear,
    onReload,
    onError,
    debounceMs = 100,
  } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let extraWatchers: Array<ReturnType<typeof watch>> = [];

  async function reload() {
    try {
      onClear();

      const allVueFiles = discoverVueFiles(file);
      const baseDir = path.dirname(file);

      // Compile every .vue file
      const compiledMap = new Map<string, string>();
      for (const vueFile of allVueFiles) {
        const source = readFileSync(vueFile, 'utf-8');
        const result = compile(source, {
          filename: vueFile,
          ...compileOptions,
        });
        compiledMap.set(vueFile, result.code);
      }

      // Write children to uniquely-named temp files
      const childTemporaryMap = new Map<string, string>(); // ResolvedPath -> temporaryFilePath
      const childTemporaryFiles: string[] = [];
      const childWrites: Array<[string, string, string]> = [];

      const childFiles = allVueFiles.filter(f => f !== file);

      for (const vueFile of childFiles) {
        let childCode = compiledMap.get(vueFile)!;
        const childDir = path.dirname(vueFile);

        // Replace transitive .vue imports with already-assigned temp files
        for (const [resolvedChild, temporaryPath] of childTemporaryMap) {
          const importPath = findVueImportPath(childCode, resolvedChild, childDir);
          if (importPath) {
            childCode = replaceImportPath(childCode, importPath, temporaryPath);
          }
        }

        const childTemporary = path.join(baseDir, `_hmr_c_${tempCounter++}.ts`);
        childTemporaryFiles.push(childTemporary);
        childTemporaryMap.set(vueFile, childTemporary);
        childWrites.push([vueFile, childCode, childTemporary]);
      }

      await Promise.all(childWrites.map(async ([, code, temporaryPath]) => {
        await Bun.write(temporaryPath, code);
      }));

      // Build root code with all .vue imports replaced
      let rootCode = compiledMap.get(file)!;
      for (const [resolvedChild, temporaryPath] of childTemporaryMap) {
        const importPath = findVueImportPath(rootCode, resolvedChild, baseDir);
        if (importPath) {
          rootCode = replaceImportPath(rootCode, importPath, temporaryPath);
        }
      }

      // Write and import root temp file
      const temporaryFile = path.join(baseDir, `_hmr_${tempCounter++}.ts`);
      await Bun.write(temporaryFile, rootCode);
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- dynamic import of compiled output
        const mod = (await import(temporaryFile)) as Record<string, unknown>;
        if (typeof mod.setup !== 'function') {
          throw new TypeError('Compiled module has no setup() export');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- narrowed by typeof check above
        onReload(mod.setup as (scene: unknown) => void);
      } finally {
        await Bun.file(temporaryFile).unlink();
        await Promise.all(childTemporaryFiles.map(async f => {
          await Bun.file(f).unlink().catch(() => {
            // Ignore cleanup errors
          });
        }));
      }

      // Refresh watchers for imported .vue files after successful compile
      updateChildWatchers();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  function scheduleReload() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void reload();
    }, debounceMs);
  }

  function updateChildWatchers() {
    // Close stale watchers
    for (const w of extraWatchers) {
      w.close();
    }

    // Discover all .vue files in the import chain (excluding the entry itself)
    const allFiles = discoverVueFiles(file);
    extraWatchers = [];
    for (const f of allFiles) {
      if (f === file) {
        continue;
      }

      // Watch all event types — Windows/VS Code may emit 'rename' instead of 'change'
      const w = watch(f, () => {
        scheduleReload();
      });
      extraWatchers.push(w);
    }
  }

  // Watch the entry file (all event types for cross-platform compat)
  const mainWatcher = watch(file, () => {
    scheduleReload();
  });

  // Set up child watchers immediately on initial startup
  updateChildWatchers();

  process.on('exit', () => {
    mainWatcher.close();
    for (const w of extraWatchers) {
      w.close();
    }
  });

  return {
    close() {
      clearTimeout(timer);
      mainWatcher.close();
      for (const w of extraWatchers) {
        w.close();
      }
    },
  };
}
