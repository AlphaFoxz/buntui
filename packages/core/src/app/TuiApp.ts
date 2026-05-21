#!/usr/bin/env bun
import path from 'node:path';
import process from 'node:process';
import {TuiEventType} from '../events/types';
import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import {type LogLevel, type TuiAppOptions, type TuiSceneOptions} from '../extern/app/types';
import type {Disposable} from '../extern/types';
import {LOGGER} from '../common/logger';
import {EVENT_BUS} from '../events';
import TuiScene from '../extern/app/TuiScene';
import {setTheme as setGlobalTheme} from '../theme/provider';
import type {TuiTheme} from '../theme/types';
import {FocusManager} from './FocusManager';
import {PointerManager} from './PointerManager';
import {RenderLoop} from './RenderLoop';
import {type TuiBackend} from './TuiBackend';
import {NativeBackend} from './NativeBackend';
import {runSetup} from './scene-context';

/**
 * Structural type for compiled SFC modules.
 * Uses `Record<string, unknown>` so it accepts Volar's `DefineComponent`
 * without core depending on vue.
 */
export type TuiSFCModule = Record<string, unknown>;

export class TuiApp implements Disposable {
  readonly #debugMode: boolean;
  readonly #backend: TuiBackend;
  #scenes: TuiScene[] = [];
  #currentScene: TuiScene | undefined = undefined;
  readonly #focusManager: FocusManager;
  readonly #pointerManager: PointerManager;
  readonly #renderLoop: RenderLoop;
  readonly #cleanups = new Map<bigint, () => void>();

  constructor(options?: Partial<TuiAppOptions> & {backend?: TuiBackend}) {
    this.#backend = options?.backend ?? new NativeBackend();
    const logLevel: LogLevel = options?.logLevel ?? 'info';
    const logFileDir = options?.logFilePath ?? path.dirname(Bun.main);
    const backendLogName = options?.backendLogName ?? 'buntui-backend.log';
    const frontendLogName = options?.frontendLogName ?? 'buntui-frontend.log';
    const clearLog = options?.clearLog ?? false;
    this.#backend.setupLogger(logFileDir, backendLogName, logLevel, clearLog);
    this.#debugMode = options?.debugMode ?? false;
    void LOGGER.init({
      logFileDir,
      logLevel,
      clearLog,
      frontendLogName,
      backendLogName,
    });

    const getScene = () => this.#currentScene;
    this.#focusManager = new FocusManager(getScene);
    this.#pointerManager = new PointerManager(getScene, this.#focusManager);
    this.#renderLoop = new RenderLoop(getScene, this.#backend, {
      tickRate: options?.tickRate,
      renderRate: options?.renderRate,
    });
    setAppInstance(this);
  }

  start() {
    interceptConsole();

    if (this.#debugMode) {
      EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
        LOGGER.logDebug(`keyboard event: ${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(TuiEventType.WheelEvent, data => {
        LOGGER.logDebug(`wheel event: ${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(TuiEventType.MouseEvent, data => {
        LOGGER.logDebug(`mouse event: ${JSON.stringify(data)}`);
      });
    }

    this.#focusManager.start();

    // Global 'q' to quit — independent of focus state
    EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
      if (data.key === 'q' || data.key === 'Q') {
        setTimeout(() => {
          this.stop();
        });
      }
    });

    EVENT_BUS.attach(this.#backend);
    EVENT_BUS.on(TuiEventType.TermResizeEvent, () => {
      this.#backend.detectTermSize(TUI_CONTEXT_INSTANCE);
      LOGGER.logInfo(`Terminal resized: ${TUI_CONTEXT_INSTANCE.rows}x${TUI_CONTEXT_INSTANCE.cols}`);
    });

    this.#pointerManager.start();

    this.#backend.startApp();
    EVENT_BUS.start();
    this.#backend.detectTermSize(TUI_CONTEXT_INSTANCE);
    LOGGER.logInfo(`TUI_CONTEXT_INSTANCE.scale: ${TUI_CONTEXT_INSTANCE.rows} ${TUI_CONTEXT_INSTANCE.cols}`);
    this.#renderLoop.start();
  }

  get focusedWidget() {
    return this.#focusManager.focusedWidget;
  }

  focusWidget(widget: Parameters<FocusManager['focusWidget']>[0]): void {
    this.#focusManager.focusWidget(widget);
  }

  blurWidget(): void {
    this.#focusManager.blurWidget();
  }

  getFocusableWidgets(): ReturnType<FocusManager['getFocusableWidgets']> {
    return this.#focusManager.getFocusableWidgets();
  }

  dispose() {
    this.#renderLoop.stop();
    this.#pointerManager.stop();
    this.#focusManager.stop();

    restoreConsole();
    flushConsole();
    setAppInstance(undefined);
    this.#currentScene?.destroy();
    this.#backend.stopApp();
    EVENT_BUS.stop();
    LOGGER.logInfo('TUI application stopped');
    LOGGER.deinit();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.dispose();
  }

  stop() {
    this.dispose();
    process.exit(0);
  }

  setTheme(theme: TuiTheme): void {
    setGlobalTheme(theme);
  }

  createScene<T extends TuiSFCModule>(module: T, options?: Partial<TuiSceneOptions>): TuiScene {
    const scene = new TuiScene(options);

    const moduleRecord = module as Record<string, unknown>;
    if (typeof moduleRecord.setup === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const setup = moduleRecord.setup as (scene: TuiScene) => (() => void) | void;
      const cleanup = runSetup(scene, () => setup(scene));
      this.#cleanups.set(scene.id, cleanup);
    }

    this.#scenes.push(scene);

    if (scene.visible) {
      this.activateScene(scene);
    }

    return scene;
  }

  destroyScene(scene: TuiScene | bigint) {
    const id = typeof scene === 'bigint' ? scene : scene.id;
    const target = this.#scenes.find(s => s.id === id);
    if (!target) {
      return;
    }

    const cleanup = this.#cleanups.get(id);
    if (cleanup) {
      cleanup();
      this.#cleanups.delete(id);
    }

    target.destroy();
    this.#scenes = this.#scenes.filter(s => s.id !== id);

    if (this.#currentScene === target) {
      this.#currentScene = undefined;
      this.#focusManager.blurWidget();
      this.#pointerManager.resetState();
      const fallback = this.#scenes.at(-1);
      if (fallback) {
        this.activateScene(fallback);
      }
    }
  }

  switchScene(scene: TuiScene) {
    if (!this.#scenes.some(s => s.id === scene.id)) {
      return;
    }

    this.activateScene(scene);
  }

  /**
   * Activate a scene: deactivate the current one first (blur focus,
   * reset pointer state), then make the new scene visible and emit lifecycle.
   */
  activateScene(scene: TuiScene) {
    if (this.#currentScene === scene) {
      return;
    }

    // Deactivate old scene
    if (this.#currentScene) {
      this.#currentScene.setVisible(false);
      this.#focusManager.blurWidget();
      this.#pointerManager.resetState();
      this.#currentScene.emitLifecycle('exit');
    }

    // Activate new scene
    this.#currentScene = scene;
    scene.setVisible(true);
    scene.emitLifecycle('enter');
  }
}

let appInstance: TuiApp | undefined;

function setAppInstance(instance: TuiApp | undefined) {
  appInstance = instance;
}

type ConsoleMethod = (...args: unknown[]) => void;

const originalConsoleLog: ConsoleMethod = console.log;
const originalConsoleError: ConsoleMethod = console.error;
const originalConsoleWarn: ConsoleMethod = console.warn;

const pendingConsoleOutput: Array<{level: 'log' | 'error' | 'warn'; message: string}> = [];

function interceptConsole() {
  console.log = (...args: unknown[]) => {
    const message = args.map(a => formatArg(a)).join(' ');
    LOGGER.logInfo(message);
    pendingConsoleOutput.push({level: 'log', message});
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(a => formatArg(a)).join(' ');
    LOGGER.logError(message);
    pendingConsoleOutput.push({level: 'error', message});
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(a => formatArg(a)).join(' ');
    LOGGER.logWarning(message);
    pendingConsoleOutput.push({level: 'warn', message});
  };
}

function flushConsole() {
  for (const {level, message} of pendingConsoleOutput) {
    switch (level) {
      case 'error': {
        originalConsoleError(message);
        break;
      }

      case 'warn': {
        originalConsoleWarn(message);
        break;
      }

      case 'log': {
        originalConsoleLog(message);
        break;
      }
    }
  }

  pendingConsoleOutput.length = 0;
}

function restoreConsole() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }

  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return '[object]';
    }
  }

  return String(arg);
}

function onUnexpectedExit(error: unknown) {
  const message = error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);

  LOGGER.logError(`Unhandled error: ${message}`);
  pendingConsoleOutput.push({level: 'error', message});
  restoreConsole();
  flushConsole();
  setTimeout(() => {
    appInstance?.dispose();
    process.exit(1);
  });
}

process.on('unhandledRejection', onUnexpectedExit);
process.on('uncaughtException', onUnexpectedExit);

export default TuiApp;
