#!/usr/bin/env bun
import path from 'node:path';
import process from 'node:process';
import {TuiEventType} from '../events/types';
import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import {type LogLevel, type TuiAppOptions, type TuiSceneOptions} from '../extern/app/types';
import {LOGGER} from '../common/logger';
import {EVENT_BUS} from '../events';
import TuiScene from '../extern/app/TuiScene';
import {FocusManager} from './FocusManager';
import {PointerManager} from './PointerManager';
import {RenderLoop} from './RenderLoop';
import {type TuiBackend} from './TuiBackend';
import {NativeBackend} from './NativeBackend';

export class TuiApp {
  readonly #debugMode: boolean;
  readonly #backend: TuiBackend;
  #scenes: TuiScene[] = [];
  #currentScene: TuiScene | undefined = undefined;
  readonly #focusManager = new FocusManager();
  readonly #pointerManager: PointerManager;
  readonly #renderLoop: RenderLoop;

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
    this.#pointerManager = new PointerManager(getScene, this.#focusManager);
    this.#renderLoop = new RenderLoop(getScene, this.#backend);
    setAppInstance(this);
  }

  start() {
    if (this.#debugMode) {
      EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
        LOGGER.logDebug(`按键事件：${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(TuiEventType.WheelEvent, data => {
        LOGGER.logDebug(`鼠标滚轮事件：${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(TuiEventType.MouseEvent, data => {
        LOGGER.logDebug(`鼠标事件：${JSON.stringify(data)}`);
      });
    }

    this.#focusManager.start(data => {
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

  stop() {
    this.#renderLoop.stop();
    this.#pointerManager.stop();
    this.#focusManager.stop();

    setAppInstance(undefined);
    this.#currentScene?.destroy();
    this.#backend.stopApp();
    EVENT_BUS.stop();
    LOGGER.deinit();
    process.exit(0);
  }

  createScene(options?: Partial<TuiSceneOptions>) {
    const scene = new TuiScene(options);
    if (scene.visible) {
      if (this.#currentScene) {
        for (const s of this.#scenes) {
          s.setVisible(false);
        }
      }

      this.#currentScene = scene;
    }

    this.#scenes.push(scene);
    return scene;
  }

  destroyScene(scene: TuiScene | bigint) {
    const id = typeof scene === 'bigint' ? scene : scene.id;
    const target = this.#scenes.find(s => s.id === id);
    if (!target) {
      return;
    }

    target.destroy();
    this.#scenes = this.#scenes.filter(s => s.id !== id);
    const leastScene = this.#scenes.at(-1);
    this.#currentScene = leastScene;
    leastScene?.setVisible(true);
  }

  switchScene(scene: TuiScene) {
    const id = this.#scenes.find(s => s.id === scene.id)?.id;
    if (!id) {
      return;
    }

    for (const s of this.#scenes) {
      s.setVisible(s.id === id);
    }
  }
}

let appInstance: TuiApp | undefined;

function setAppInstance(instance: TuiApp | undefined) {
  appInstance = instance;
}

function onUnexceptExit(error: unknown) {
  let errorString = 'Unexcept exit';
  const errorType = typeof error;
  if (errorType === 'object') {
    errorString += JSON.stringify(error);
  } else if (errorType === 'string' || errorType === 'number' || errorType === 'boolean') {
    errorString += String(error);
  } else {
    errorString += `Unknown error, error type: \`${errorType}\``;
  }

  LOGGER.logError(errorString);
  setTimeout(() => {
    if (appInstance) {
      appInstance.stop();
    }
  });
}

process.on('unhandledRejection', onUnexceptExit);
process.on('uncaughtException', onUnexceptExit);

export default TuiApp;
