import path from 'node:path';
import process from 'node:process';
import {watch} from 'node:fs';
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

  async function reload() {
    try {
      onClear();
      const source = await Bun.file(file).text();
      const result = compile(source, {
        filename: file,
        ...compileOptions,
      });
      const temporaryFile = path.join(
        path.dirname(file),
        `_hmr_${Date.now()}.ts`,
      );
      await Bun.write(temporaryFile, result.code);
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
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const watcher = watch(file, eventType => {
    if (eventType === 'change') {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void reload();
      }, debounceMs);
    }
  });

  process.on('exit', () => {
    watcher.close();
  });

  return {
    close() {
      clearTimeout(timer);
      watcher.close();
    },
  };
}
