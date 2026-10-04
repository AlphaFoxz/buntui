declare module 'virtual:buntui-dev' {
  export const appName: string;
  export const appOptions: {
    logLevel?: 'debug' | 'info' | 'warning' | 'error';
    shouldClearLog?: boolean;
    isDebugMode?: boolean;
    shouldQuitOnQ?: boolean;
    tickRate?: number;
    renderRate?: number;
  };
}
