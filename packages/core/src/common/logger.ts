import fs from 'node:fs';
import path from 'node:path';
import {appendFile} from 'node:fs/promises';
import {type LogLevel} from '../extern/app/types';

export type LoggerOptions = {
  logFileDir: string;
  logLevel: LogLevel;
  clearLog: boolean;
  frontendLogName: string;
  backendLogName: string;
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

let cachedTimestampString = '';
let cachedTimestamp = 0;
function timestampString() {
  const date = new Date();
  const time = date.getTime();
  if (time === cachedTimestamp) {
    return cachedTimestampString;
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  cachedTimestamp = time;
  cachedTimestampString = `[${year}-${fillZero(month)}-${fillZero(day)} ${fillZero(hour)}:${fillZero(minute)}:${fillZero(second)}]`;
  return cachedTimestampString;
}

function fillZero(number_: number, length = 2) {
  let string_ = number_.toString();
  while (string_.length < length) {
    string_ = '0' + string_;
  }

  return string_;
}

class LoggerImpl {
  #logFileDir = '';
  #logFile = '';
  #logLevel: number = LOG_LEVEL_INFO;
  readonly #taskQueue: Array<() => Promise<void>> = [];
  #running = false;
  #immediateId: ReturnType<typeof setImmediate> | undefined;
  async init(options: LoggerOptions) {
    this.#logFileDir = options.logFileDir;
    const {logLevel, clearLog} = options;
    this.#logFile = path.resolve(this.#logFileDir, options.frontendLogName);
    this.#logLevel = logLevelToNumber(logLevel);

    if (!fs.existsSync(this.#logFileDir)) {
      fs.mkdirSync(this.#logFileDir);
    }

    if (clearLog) {
      fs.writeFileSync(this.#logFile, '');
    }

    this.#running = true;
    const consume = async () => {
      if (!this.#running) {
        return;
      }

      try {
        const tasks: Array<Promise<void>> = [];
        while (this.#taskQueue.length > 0) {
          const task = this.#taskQueue.shift();
          if (task) {
            tasks.push(task());
          }
        }

        await Promise.all(tasks);
      } finally {
        this.#immediateId = setImmediate(() => {
          void consume();
        });
      }
    };

    this.#immediateId = setImmediate(() => {
      void consume();
    });
  }

  deinit() {
    this.#running = false;
    if (this.#immediateId !== undefined) {
      clearImmediate(this.#immediateId);
      this.#immediateId = undefined;
    }

    for (const task of this.#taskQueue) {
      void task();
    }

    this.#taskQueue.length = 0;
  }

  logDebug(content: string) {
    if (this.#logLevel === LOG_LEVEL_DEBUG) {
      this.#taskQueue.push(async () => {
        await appendFile(this.#logFile, `${timestampString()} debug: ${content}\n`);
      });
    }
  }

  logInfo(content: string) {
    if (this.#logLevel <= LOG_LEVEL_INFO) {
      this.#taskQueue.push(async () => {
        await appendFile(this.#logFile, `${timestampString()} info: ${content}\n`);
      });
    }
  }

  logWarning(content: string) {
    if (this.#logLevel <= LOG_LEVEL_WARNING) {
      this.#taskQueue.push(async () => {
        await appendFile(this.#logFile, `${timestampString()} warning: ${content}\n`);
      });
    }
  }

  logError(content: string) {
    if (this.#logLevel <= LOG_LEVEL_ERROR) {
      this.#taskQueue.push(async () => {
        await appendFile(this.#logFile, `${timestampString()} error: ${content}\n`);
      });
    }
  }
}

export const LOGGER = new LoggerImpl();
