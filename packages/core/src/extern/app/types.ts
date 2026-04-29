export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export type TuiAppOptions = {
  logLevel: LogLevel;
  logFilePath: string;
  frontendLogName: string;
  backendLogName: string;
  clearLog: boolean;
  debugMode: boolean;
};

export type TuiSceneOptions = {
  visible: boolean;
  bgHexRgb?: number | string | {r: number; g: number; b: number};
};

export const TuiRenderCommandType = {
  Rect: 0,
  Text: 1,
} as const;
export type TuiRenderCommandType = Enum<typeof TuiRenderCommandType>;

export type TuiRenderCommand = {
  type: TuiRenderCommandType;
  style: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

