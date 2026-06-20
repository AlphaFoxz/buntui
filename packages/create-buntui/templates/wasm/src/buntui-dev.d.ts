declare module 'virtual:buntui-dev' {
  export const appName: string;
  export const appOptions: {
    logLevel?: 'debug' | 'info' | 'warning' | 'error';
    clearLog?: boolean;
    debugMode?: boolean;
    quitOnQ?: boolean;
    tickRate?: number;
    renderRate?: number;
  };
}
