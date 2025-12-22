export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface TuiAppOptions {
    logLevel: LogLevel;
    logFilePath: string;
    frontendLogName: string;
    backendLogName: string;
    clearLog: boolean;
    debugMode: boolean;
}

export interface TuiSceneOptions {
    visible: boolean;
    bgHexRgb: number;
}

export enum TuiRenderCommandType {
    RECT = 0,
    TEXT = 1,
}

export interface TuiRenderCommand {
    type: TuiRenderCommandType;
    style: number;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
}
