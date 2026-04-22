import path from 'node:path';
import process from 'node:process';
import {EventType} from '../events/types';
import app, {TUI_CONTEXT_INSTANCE} from '../extern/app';
import {type LogLevel, type TuiAppOptions, type TuiSceneOptions} from '../extern/app/types';
import {LOGGER} from '../common/logger';
import {EVENT_BUS} from '../events';
import TuiScene from '../extern/app/TuiScene';

export class TuiApp {
  readonly #debugMode: boolean;
  #scenes: TuiScene[] = [];
  #currentScene: TuiScene | undefined = undefined;
  #running = false;

  constructor(options?: Partial<TuiAppOptions>) {
    const logLevel: LogLevel = options?.logLevel ?? 'info';
    const logFileDir = options?.logFilePath ?? path.dirname(Bun.main);
    const backendLogName = options?.backendLogName ?? 'term_bed-backend.log';
    const frontendLogName = options?.frontendLogName ?? 'term_bed-frontend.log';
    const clearLog = options?.clearLog ?? false;
    app.setupLogger(logFileDir, backendLogName, logLevel, clearLog);
    this.#debugMode = options?.debugMode ?? false;
    void LOGGER.init({
      logFileDir,
      logLevel,
      clearLog,
      frontendLogName,
      backendLogName,
    });
  }

  start() {
    if (this.#debugMode) {
      EVENT_BUS.on(EventType.KeyboardEvent, data => {
        LOGGER.logDebug(`按键事件：${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(EventType.WheelEvent, data => {
        LOGGER.logDebug(`鼠标滚轮事件：${JSON.stringify(data)}`);
      });
      EVENT_BUS.on(EventType.MouseEvent, data => {
        LOGGER.logDebug(`鼠标事件：${JSON.stringify(data)}`);
      });
    }

    EVENT_BUS.on(EventType.KeyboardEvent, data => {
      if (data.key === 'q' || data.key === 'Q') {
        setTimeout(() => {
          this.stop();
        });
      }
    });
    app.startApp();
    EVENT_BUS.start();
    app.detectTermSize(TUI_CONTEXT_INSTANCE);
    LOGGER.logInfo(`TUI_CONTEXT_INSTANCE.scale: ${TUI_CONTEXT_INSTANCE.rows} ${TUI_CONTEXT_INSTANCE.cols}`);
    this.#running = true;
    const render = () => {
      if (!this.#running) {
        return;
      }

      app.renderFrame(TUI_CONTEXT_INSTANCE, this.#currentScene ?? null);
      setImmediate(render);
    };

    render();
  }

  stop() {
    this.#running = false;
    this.#currentScene?.destroy();
    app.stopApp();
    EVENT_BUS.stop();
    LOGGER.deinit();
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

const appInstance: TuiApp | undefined = undefined;
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

