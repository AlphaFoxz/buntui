export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export type TuiAppOptions = {
  logLevel: LogLevel;
  logFilePath: string;
  frontendLogName: string;
  backendLogName: string;
  clearLog: boolean;
  debugMode: boolean;
  tickRate?: number;
  renderRate?: number;
};

export type TuiSceneOptions = {
  visible: boolean;
  bgHexRgb?: number | string | {r: number; g: number; b: number};
};

