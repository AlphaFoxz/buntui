/* eslint-disable @typescript-eslint/no-require-imports, unicorn/prefer-module -- Bun FFI native platform module uses CommonJS require for conditional loading */
import type {TuiBackend} from '../app/TuiBackend';
import type {LogSink} from '../common/logger';
import {setPtr} from './pointer';

const {ptr: bunPtr} = require('bun:ffi') as {ptr: (buffer: ArrayBuffer | ArrayBufferView) => number};

// eslint-disable-next-line unicorn/no-top-level-side-effects -- platform bootstrap: must register FFI ptr function before any extern call
setPtr(bunPtr);

type NodeProcess = typeof globalThis.process;

export function getNodeProcess(): NodeProcess | undefined {
  return require('node:process') as NodeProcess;
}

export function createBackend(): TuiBackend {
  const {NativeBackend} = require('../app/NativeBackend') as {NativeBackend: new () => TuiBackend};
  return new NativeBackend();
}

export function getDefaultLogDir(): string {
  const path = require('node:path') as {dirname(p: string): string};
  return path.dirname(Bun.main);
}

export function createFileLogSink(logFileDir: string, logName: string, clearLog: boolean): LogSink {
  const {FileLogSink} = require('../common/file-log-sink') as {FileLogSink: new () => LogSink & {init(dir: string, name: string, clear: boolean): void}};
  const sink = new FileLogSink();
  sink.init(logFileDir, logName, clearLog);
  return sink;
}
