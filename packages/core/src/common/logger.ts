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
  async init(options: LoggerOptions) {
    this.#logFileDir = options.logFileDir;
    const {logLevel} = options;
    const {clearLog} = options;
    this.#logFile = path.resolve(this.#logFileDir, options.frontendLogName);
    switch (logLevel) {
      case 'debug': {
        this.#logLevel = LOG_LEVEL_DEBUG;
        break;
      }

      case 'info': {
        this.#logLevel = LOG_LEVEL_INFO;
        break;
      }

      case 'warning': {
        this.#logLevel = LOG_LEVEL_WARNING;
        break;
      }

      case 'error': {
        this.#logLevel = LOG_LEVEL_ERROR;
        break;
      }
    }

    if (!fs.existsSync(this.#logFileDir)) {
      fs.mkdirSync(this.#logFileDir);
    }

    const backendLogPath = path.resolve(
      this.#logFileDir,
      options.backendLogName || 'buntui.log',
    );
    // TODO zig should do this
    if (!fs.existsSync(backendLogPath)) {
      fs.writeFileSync(backendLogPath, '');
    }

    if (!fs.existsSync(this.#logFile) && clearLog) {
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
        setImmediate(() => {
          void consume();
        });
      }
    };

    void consume();
  }

  deinit() {
    this.#running = false;
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
