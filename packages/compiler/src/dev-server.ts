import path from 'node:path';
import process from 'node:process';
import {
  watch,
  readFileSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import {compile, type CompileOptions} from './compile';

export type DevServerOptions = {
  /** Path to the .vue SFC file to watch */
  file: string;
  /** Directory for HMR temporary files (default: same directory as `file`) */
  tempDir?: string;
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

let temporaryCounter = 0;

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

// eslint-disable-next-line @typescript-eslint/no-empty-function, @stylistic/curly-newline -- cleanup callback
const ignoreCleanupError = (): void => {};

function cleanupStaleTemporaryFiles(dir: string): void {
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('_hmr_') && entry.endsWith('.ts')) {
        try {
          unlinkSync(path.join(dir, entry));
        } catch {
          // File might be locked, skip
        }
      }
    }
  } catch {
    // Directory might not exist
  }
}

export function createDevServer(options: DevServerOptions): {close: () => void} {
  const {
    file,
    tempDir: temporaryDirOption,
    compileOptions,
    onClear,
    onReload,
    onError,
    debounceMs = 100,
  } = options;

  const baseDir = path.dirname(file);
  const temporaryDir = temporaryDirOption ?? baseDir;
  mkdirSync(temporaryDir, {recursive: true});

  // Clean up stale temporary files from previous sessions
  cleanupStaleTemporaryFiles(temporaryDir);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let extraWatchers: Array<ReturnType<typeof watch>> = [];

  // Persistent state across reloads for incremental compilation
  const compiledCache = new Map<string, string>(); // ResolvedPath -> compiled code
  const childTemporaryMap = new Map<string, string>(); // ResolvedPath -> temp file path
  const allTemporaryFiles = new Set<string>();
  let firstLoad = true;
  let needsFullReload = false;

  /**
   * Full reload: compile all files, write all temp files.
   * Used on first load, root file change, or import graph change.
   */
  async function fullReload() {
    const allVueFiles = discoverVueFiles(file);

    // Compile every .vue file
    compiledCache.clear();
    for (const vueFile of allVueFiles) {
      const source = readFileSync(vueFile, 'utf-8');
      const result = compile(source, {
        filename: vueFile,
        ...compileOptions,
      });
      compiledCache.set(vueFile, result.code);
    }

    // Delete old child temp files
    const oldDeletions: Array<Promise<void>> = [];
    for (const temporaryPath of childTemporaryMap.values()) {
      allTemporaryFiles.delete(temporaryPath);
      oldDeletions.push(Bun.file(temporaryPath).unlink().catch(ignoreCleanupError));
    }

    await Promise.all(oldDeletions);
    childTemporaryMap.clear();

    // Write children to temp files
    const childFiles = allVueFiles.filter(f => f !== file);
    const childWrites: Array<Promise<void>> = [];
    for (const vueFile of childFiles) {
      let childCode = compiledCache.get(vueFile)!;
      const childDir = path.dirname(vueFile);

      // Replace transitive .vue imports with already-assigned temp files
      for (const [resolvedChild, temporaryPath] of childTemporaryMap) {
        const importPath = findVueImportPath(childCode, resolvedChild, childDir);
        if (importPath) {
          childCode = replaceImportPath(childCode, importPath, './' + path.basename(temporaryPath));
        }
      }

      const childTemporary = path.join(temporaryDir, `_hmr_c_${temporaryCounter++}.ts`);
      childTemporaryMap.set(vueFile, childTemporary);
      allTemporaryFiles.add(childTemporary);
      childWrites.push(Bun.write(childTemporary, childCode).then(ignoreCleanupError));
    }

    await Promise.all(childWrites);

    // Build and import root
    await writeAndImportRoot();
  }

  /**
   * Incremental reload: only recompile the changed child file.
   * Write a new temp file for it; unchanged children keep their temp files (Bun cache hit).
   */
  async function incrementalReload(changedFile: string) {
    // Recompile only the changed child
    const source = readFileSync(changedFile, 'utf-8');
    const result = compile(source, {
      filename: changedFile,
      ...compileOptions,
    });
    compiledCache.set(changedFile, result.code);

    let childCode = result.code;
    const childDir = path.dirname(changedFile);

    // Replace transitive .vue imports in the changed child
    for (const [resolvedChild, temporaryPath] of childTemporaryMap) {
      if (resolvedChild === changedFile) {
        continue;
      }

      const importPath = findVueImportPath(childCode, resolvedChild, childDir);
      if (importPath) {
        childCode = replaceImportPath(childCode, importPath, './' + path.basename(temporaryPath));
      }
    }

    // Write new temp file for the changed child
    const oldTemporary = childTemporaryMap.get(changedFile);
    const newTemporary = path.join(temporaryDir, `_hmr_c_${temporaryCounter++}.ts`);
    childTemporaryMap.set(changedFile, newTemporary);
    allTemporaryFiles.add(newTemporary);
    await Bun.write(newTemporary, childCode);

    // Delete old temp file
    if (oldTemporary) {
      allTemporaryFiles.delete(oldTemporary);
      await Bun.file(oldTemporary).unlink().catch(ignoreCleanupError);
    }

    // Build and import root with updated import paths
    await writeAndImportRoot();
  }

  /**
   * Generate root temp file with all .vue imports replaced by child temp paths,
   * then import it and call onReload.
   */
  async function writeAndImportRoot() {
    let rootCode = compiledCache.get(file)!;
    for (const [resolvedChild, temporaryPath] of childTemporaryMap) {
      const importPath = findVueImportPath(rootCode, resolvedChild, baseDir);
      if (importPath) {
        rootCode = replaceImportPath(rootCode, importPath, './' + path.basename(temporaryPath));
      }
    }

    const temporaryFile = path.join(temporaryDir, `_hmr_${temporaryCounter++}.ts`);
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
    }
  }

  async function reload(changedFile?: string) {
    try {
      onClear();

      if (firstLoad || needsFullReload || !changedFile || changedFile === file) {
        firstLoad = false;
        needsFullReload = false;
        await fullReload();
      } else {
        await incrementalReload(changedFile);
      }

      // Refresh watchers for imported .vue files after successful compile
      updateChildWatchers();
    } catch (error) {
      needsFullReload = true;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  function scheduleReload(changedFile?: string) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void reload(changedFile);
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
        scheduleReload(f);
      });
      extraWatchers.push(w);
    }
  }

  // Watch the entry file (all event types for cross-platform compat)
  const mainWatcher = watch(file, () => {
    scheduleReload(file);
  });

  // Set up child watchers immediately on initial startup
  updateChildWatchers();

  process.on('exit', () => {
    mainWatcher.close();
    for (const w of extraWatchers) {
      w.close();
    }

    for (const temporaryPath of allTemporaryFiles) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // Already deleted
      }
    }
  });

  return {
    close() {
      clearTimeout(timer);
      mainWatcher.close();
      for (const w of extraWatchers) {
        w.close();
      }

      for (const temporaryPath of allTemporaryFiles) {
        try {
          unlinkSync(temporaryPath);
        } catch {
          // Already deleted
        }
      }

      allTemporaryFiles.clear();
      childTemporaryMap.clear();
    },
  };
}
