import {type LogLevel} from '../extern/app/types';
import {nextTick, cancelTick} from '../platform/next-tick';
import {createFileLogSink} from '../platform';

export type LoggerOptions = {
  logFileDir: string;
  logLevel: LogLevel;
  clearLog: boolean;
  frontendLogName: string;
  backendLogName: string;
};

export type LogSink = {
  write(level: string, message: string): void;
};

const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARNING = 2;
const LOG_LEVEL_ERROR = 3;

export function logLevelToNumber(level: LogLevel): number {
  switch (level) {
    case 'debug': {
      return LOG_LEVEL_DEBUG;
    }

    case 'info': {
      return LOG_LEVEL_INFO;
    }

    case 'warning': {
      return LOG_LEVEL_WARNING;
    }

    case 'error': {
      return LOG_LEVEL_ERROR;
    }
  }
}

class ConsoleLogSink implements LogSink {
  write(level: string, message: string): void {
    const timestamp = `[${new Date().toISOString()}]`;
    const formatted = `${timestamp} ${level}: ${message}`;
    switch (level) {
      case 'error': {
        console.error(formatted);
        break;
      }

      case 'warning': {
        console.warn(formatted);
        break;
      }

      default: {
        console.log(formatted);
      }
    }
  }
}

class LoggerImpl {
  #sink: LogSink = new ConsoleLogSink();
  #logLevel: number = LOG_LEVEL_INFO;
  readonly #taskQueue: Array<() => void> = [];
  #running = false;
  #immediateId: ReturnType<typeof nextTick> | undefined;

  init(options: LoggerOptions) {
    this.#logLevel = logLevelToNumber(options.logLevel);
    this.#sink = createFileLogSink(options.logFileDir, options.frontendLogName, options.clearLog);

    this.#running = true;
    const consume = () => {
      if (!this.#running) {
        return;
      }

      try {
        while (this.#taskQueue.length > 0) {
          const task = this.#taskQueue.shift();
          if (task) {
            task();
          }
        }
      } finally {
        this.#immediateId = nextTick(consume);
      }
    };

    this.#immediateId = nextTick(consume);
  }

  setSink(sink: LogSink) {
    this.#sink = sink;
  }

  deinit() {
    this.#running = false;
    if (this.#immediateId !== undefined) {
      cancelTick(this.#immediateId);
      this.#immediateId = undefined;
    }

    for (const task of this.#taskQueue) {
      task();
    }

    this.#taskQueue.length = 0;
  }

  logDebug(content: string) {
    if (this.#logLevel === LOG_LEVEL_DEBUG) {
      this.#taskQueue.push(() => {
        this.#sink.write('debug', content);
      });
    }
  }

  logInfo(content: string) {
    if (this.#logLevel <= LOG_LEVEL_INFO) {
      this.#taskQueue.push(() => {
        this.#sink.write('info', content);
      });
    }
  }

  logWarning(content: string) {
    if (this.#logLevel <= LOG_LEVEL_WARNING) {
      this.#taskQueue.push(() => {
        this.#sink.write('warning', content);
      });
    }
  }

  logError(content: string) {
    if (this.#logLevel <= LOG_LEVEL_ERROR) {
      this.#taskQueue.push(() => {
        this.#sink.write('error', content);
      });
    }
  }
}

export const LOGGER = new LoggerImpl();
export {ConsoleLogSink};
