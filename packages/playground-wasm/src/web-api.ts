import {
  createApp,
  HtmlBackend,
  WasmModule,
  animationFrameScheduler, type TerminalLike, type TuiSFCModule,
} from '@buntui/core';

type TuiApp = ReturnType<typeof createApp>;

export type WebAppOptions = {
  wasmUrl: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  tickRate?: number;
  renderRate?: number;
};

export async function createWebApp(
  terminal: TerminalLike,
  appModule: TuiSFCModule,
  options: WebAppOptions,
): Promise<TuiApp> {
  const wasm = new WasmModule();
  await wasm.load(fetch(options.wasmUrl));

  const ref: {app: TuiApp | undefined} = {app: undefined};

  const backend = new HtmlBackend({
    terminal,
    wasmModule: wasm,
    isTextInputFocused() {
      const w = ref.app?.focusedWidget;
      return w !== null && w !== undefined && 'getSelection' in w;
    },
  });

  ref.app = createApp({
    backend,
    logLevel: options.logLevel ?? 'info',
    tickRate: 60,
    renderRate: 30,
    scheduler: animationFrameScheduler,
  });

  ref.app.createScene(appModule, {visible: true});
  ref.app.start();

  return ref.app;
}
