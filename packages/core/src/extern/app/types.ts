import type {Scheduler} from '../../platform/next-tick';

const LogLevel = {
  Debug: 'debug',
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
} as const;
export type LogLevel = Enum<typeof LogLevel>;

export type TuiAppOptions = {
  logLevel: LogLevel;
  logFilePath: string;
  frontendLogName: string;
  backendLogName: string;
  clearLog: boolean;
  debugMode: boolean;
  quitOnQ?: boolean;
  tickRate?: number;
  renderRate?: number;
  scheduler?: Scheduler;
};

export type TuiSceneOptions = {
  visible: boolean;
  bgHexRgb?: number | string | {r: number; g: number; b: number};
};

