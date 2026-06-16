import {it, expect, describe} from 'bun:test';
import {logLevelToNumber, ConsoleLogSink} from '../logger';

describe('logLevelToNumber', () => {
  it('maps debug to 0', () => {
    expect(logLevelToNumber('debug')).toBe(0);
  });

  it('maps info to 1', () => {
    expect(logLevelToNumber('info')).toBe(1);
  });

  it('maps warning to 2', () => {
    expect(logLevelToNumber('warning')).toBe(2);
  });

  it('maps error to 3', () => {
    expect(logLevelToNumber('error')).toBe(3);
  });

  it('orders levels debug < info < warning < error', () => {
    expect(logLevelToNumber('debug')).toBeLessThan(logLevelToNumber('info'));
    expect(logLevelToNumber('info')).toBeLessThan(logLevelToNumber('warning'));
    expect(logLevelToNumber('warning')).toBeLessThan(logLevelToNumber('error'));
  });
});

describe('ConsoleLogSink', () => {
  type Method = 'log' | 'error' | 'warn' | 'info' | 'debug';

  function captureConsole(): {sink: ConsoleLogSink; calls: Array<{method: Method; message: string}>; restore(): void} {
    const calls: Array<{method: Method; message: string}> = [];
    const originals: Record<Method, (...args: unknown[]) => void> = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    const record = (method: Method) => (...args: unknown[]) => {
      calls.push({method, message: args.join(' ')});
    };

    console.log = record('log') as typeof console.log;
    console.error = record('error') as typeof console.error;
    console.warn = record('warn') as typeof console.warn;
    console.info = record('info') as typeof console.info;
    console.debug = record('debug') as typeof console.debug;

    const sink = new ConsoleLogSink();

    return {
      sink,
      calls,
      restore() {
        console.log = originals.log;
        console.error = originals.error;
        console.warn = originals.warn;
        console.info = originals.info;
        console.debug = originals.debug;
      },
    };
  }

  it('routes error level to console.error', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('error', 'boom');
      expect(calls).toHaveLength(1);
      expect(calls[0]!.method).toBe('error');
    } finally {
      restore();
    }
  });

  it('routes warning level to console.warn', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('warning', 'careful');
      expect(calls[0]!.method).toBe('warn');
    } finally {
      restore();
    }
  });

  it('routes info level to console.info', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('info', 'hello');
      expect(calls[0]!.method).toBe('info');
    } finally {
      restore();
    }
  });

  it('routes debug level to console.debug', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('debug', 'trace');
      expect(calls[0]!.method).toBe('debug');
    } finally {
      restore();
    }
  });

  it('falls back to console.log for unknown levels', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('verbose', 'mystery');
      expect(calls[0]!.method).toBe('log');
    } finally {
      restore();
    }
  });

  it('prefixes the message with an ISO timestamp and the level', () => {
    const {sink, calls, restore} = captureConsole();
    try {
      sink.write('error', 'boom');
      const message = calls[0]!.message;
      expect(message).toContain('error: boom');
      expect(message.startsWith('[')).toBe(true);
      const timestamp = message.slice(1, message.indexOf(']'));
      const parsed = new Date(timestamp);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
    } finally {
      restore();
    }
  });
});
