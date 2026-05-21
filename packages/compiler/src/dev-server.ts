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

export const VUE_IMPORT_RE = /import\s+\w+\s+from\s+['"]([^'"]+\.vue)['"]/gv;

let temporaryCounter = 0;

/**
 * Recursively discover all .vue files in the import chain starting from `entryPath`.
 */
export function discoverVueFiles(entryPath: string): string[] {
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
export function findVueImportPath(compiledCode: string, resolvedPath: string, baseDir: string): string | undefined {
  for (const match of compiledCode.matchAll(VUE_IMPORT_RE)) {
    const importPath = match[1]!;
    const candidate = path.resolve(baseDir, importPath);
    if (candidate === resolvedPath) {
      return importPath;
    }
  }

  return undefined;
}

export function replaceImportPath(code: string, original: string, replacement: string): string {
  const normalized = replacement.replaceAll('\\', '/');
  return code
    .replaceAll(`'${original}'`, `'${normalized}'`)
    .replaceAll(`"${original}"`, `"${normalized}"`);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function, @stylistic/curly-newline -- cleanup callback
const ignoreCleanupError = (): void => {};

export function cleanupStaleTemporaryFiles(dir: string): void {
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
    } catch (error) {
      const enriched = await probeChildErrors(error, file, compiledCache, childTemporaryMap, temporaryDir, baseDir);
      throw enriched;
    } finally {
      await Bun.file(temporaryFile).unlink().catch(ignoreCleanupError);
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

type PositionData = {
  line: number;
  lineText: string;
};

function extractPosition(error: unknown): PositionData | undefined {
  if (typeof error !== 'object' || error === null || !('position' in error)) {
    return undefined;
  }

  const pos = (error).position;
  if (typeof pos === 'object' && pos !== null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const p = pos as Record<string, unknown>;
    if (typeof p.line === 'number' && typeof p.lineText === 'string') {
      return {line: p.line, lineText: p.lineText};
    }
  }

  return undefined;
}

function findLineByText(vueSource: string, lineText: string): number | undefined {
  const trimmed = lineText.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const lines = vueSource.split('\n');
  for (const [i, line] of lines.entries()) {
    if (line.trim() === trimmed) {
      return i + 1;
    }
  }

  for (const [i, line] of lines.entries()) {
    if (line.includes(trimmed)) {
      return i + 1;
    }
  }

  return undefined;
}

function mapGenLineToVueLine(vueSource: string, genCode: string, genLine: number): number | undefined {
  const genLines = genCode.split('\n');

  let setupIdx = -1;
  for (const [i, genLine_] of genLines.entries()) {
    if (genLine_?.includes('export function setup(__scene)')) {
      setupIdx = i;
      break;
    }
  }

  if (setupIdx === -1) {
    return undefined;
  }

  const bodyStartGen = setupIdx + 1;
  const bodyLineIdx = genLine - 1 - bodyStartGen;
  if (bodyLineIdx < 0) {
    return undefined;
  }

  const vueLines = vueSource.split('\n');
  let scriptTagIdx = -1;
  for (const [i, vueLine] of vueLines.entries()) {
    if (/<script\s+setup/v.test(vueLine)) {
      scriptTagIdx = i;
      break;
    }
  }

  if (scriptTagIdx === -1) {
    return undefined;
  }

  let importCount = 0;
  for (let i = scriptTagIdx + 1; i < vueLines.length; i++) {
    const trimmed = vueLines[i]!.trimStart();
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      importCount++;
    } else {
      break;
    }
  }

  const bodyStartVue = scriptTagIdx + 1 + importCount;
  return bodyStartVue + bodyLineIdx + 1;
}

async function probeChildErrors(
  originalError: unknown,
  rootFile: string,
  compiledCache: Map<string, string>,
  childTemporaryMap: Map<string, string>,
  temporaryDir: string,
  baseDir: string,
): Promise<Error> {
  for (const [vueFile] of childTemporaryMap) {
    const genCode = compiledCache.get(vueFile);
    if (!genCode) {
      continue;
    }

    const probeTemporary = path.join(temporaryDir, `_hmr_probe_${temporaryCounter++}.ts`);
    // eslint-disable-next-line no-await-in-loop
    await Bun.write(probeTemporary, genCode);
    try {
      // eslint-disable-next-line no-await-in-loop
      await import(probeTemporary);
    } catch (probeError) {
      // eslint-disable-next-line no-await-in-loop
      await Bun.file(probeTemporary).unlink().catch(ignoreCleanupError);
      return enrichWithVueLocation(probeError, vueFile, genCode, baseDir);
    }

    // eslint-disable-next-line no-await-in-loop
    await Bun.file(probeTemporary).unlink().catch(ignoreCleanupError);
  }

  const rootRelPath = path.relative(baseDir, rootFile).replaceAll('\\', '/');
  const rootMessage = originalError instanceof Error ? originalError.message : String(originalError);
  return new Error(`${rootRelPath}\n${rootMessage}`);
}

function enrichWithVueLocation(probeError: unknown, vueFile: string, genCode: string, baseDir: string): Error {
  const vueRelPath = path.relative(baseDir, vueFile).replaceAll('\\', '/');
  const pos = extractPosition(probeError);
  const message = probeError instanceof Error
    ? probeError.message
    : (typeof probeError === 'object' && probeError !== null && 'message' in probeError

      ? String((probeError).message)
      : String(probeError));

  try {
    const vueSource = readFileSync(vueFile, 'utf-8');

    if (pos) {
      const vueLine = findLineByText(vueSource, pos.lineText) ?? mapGenLineToVueLine(vueSource, genCode, pos.line);
      if (vueLine) {
        const vueLines = vueSource.split('\n');
        const sourceLine = vueLines[vueLine - 1]?.trim() ?? '';
        return new Error(`${vueRelPath}:${vueLine}\n  ${sourceLine}\n${message}`);
      }
    }
  } catch {
    // Can't read .vue source
  }

  return new Error(`${vueRelPath}\n${message}`);
}
