import type {TuiBackend} from '../app/TuiBackend';
import {ConsoleLogSink, type LogSink} from '../common/logger';

export function getNodeProcess(): typeof globalThis.process | undefined {
  return undefined;
}

export function createBackend(): TuiBackend {
  throw new Error('No backend provided. Pass a backend option for non-Bun environments.');
}

export function getDefaultLogDir(): string {
  return '.';
}

export function createFileLogSink(_logFileDir: string, _logName: string, _clearLog: boolean): LogSink {
  return new ConsoleLogSink();
}
