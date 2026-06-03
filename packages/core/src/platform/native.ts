import type {TuiBackend} from '../app/TuiBackend';
import type {LogSink} from '../common/logger';
import {setPtr} from './pointer';

// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
const {ptr: bunPtr} = require('bun:ffi') as {ptr: (buffer: ArrayBuffer | ArrayBufferView) => number};

setPtr(bunPtr);

type NodeProcess = typeof globalThis.process;

export function getNodeProcess(): NodeProcess | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  return require('node:process') as NodeProcess;
}

export function createBackend(): TuiBackend {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const {NativeBackend} = require('../app/NativeBackend') as {NativeBackend: new () => TuiBackend};
  return new NativeBackend();
}

export function getDefaultLogDir(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const path = require('node:path') as {dirname(p: string): string};
  return path.dirname(Bun.main);
}

export function createFileLogSink(logFileDir: string, logName: string, clearLog: boolean): LogSink {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const {FileLogSink} = require('../common/file-log-sink') as {FileLogSink: new () => LogSink & {init(dir: string, name: string, clear: boolean): void}};
  const sink = new FileLogSink();
  sink.init(logFileDir, logName, clearLog);
  return sink;
}
