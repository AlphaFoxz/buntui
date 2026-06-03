import fs from 'node:fs';
import path from 'node:path';
import type {LogSink} from './logger';

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
  const pad = (n: number) => String(n).padStart(2, '0');
  cachedTimestampString = `[${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}]`;
  return cachedTimestampString;
}

export class FileLogSink implements LogSink {
  #logFile = '';
  init(logFileDir: string, logName: string, clearLog: boolean) {
    this.#logFile = path.resolve(logFileDir, logName);
    if (!fs.existsSync(logFileDir)) {
      fs.mkdirSync(logFileDir, {recursive: true});
    }

    if (clearLog) {
      fs.writeFileSync(this.#logFile, '');
    }
  }

  write(level: string, message: string): void {
    fs.appendFileSync(this.#logFile, `${timestampString()} ${level}: ${message}\n`);
  }
}
