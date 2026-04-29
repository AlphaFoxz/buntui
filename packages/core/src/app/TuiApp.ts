import path from 'node:path';
import process from 'node:process';
import {type MouseEvent, TuiEventType} from '../events/types';
import app, {TUI_CONTEXT_INSTANCE} from '../extern/app';
import {type LogLevel, type TuiAppOptions, type TuiSceneOptions} from '../extern/app/types';
import {LOGGER} from '../common/logger';
import {EVENT_BUS} from '../events';
import {DrawListBuffer} from '../draw_list/DrawListBuffer';
import TuiScene from '../extern/app/TuiScene';
import type {TuiWidgetEntity} from '../extern/widgets/TuiWidgetEntity';

export class TuiApp {
  readonly #debugMode: boolean;
  readonly #drawList = new DrawListBuffer();
  #scenes: TuiScene[] = [];
  #currentScene: TuiScene | undefined = undefined;
  #running = false;
  #mouseHandler: ((data: MouseEvent) => void) | undefined;
  #pressTarget: TuiWidgetEntity | undefined;
  #isDragging = false;
  #dragOffsetX = 0;
  #dragOffsetY = 0;

  constructor(options?: Partial<TuiAppOptions>) {
    const logLevel: LogLevel = options?.logLevel ?? 'info';
    const logFileDir = options?.logFilePath ?? path.dirname(Bun.main);
    const backendLogName = options?.backendLogName ?? 'buntui-backend.log';
    const frontendLogName = options?.frontendLogName ?? 'buntui-frontend.log';
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

    EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
      if (data.key === 'q' || data.key === 'Q') {
        setTimeout(() => {
          this.stop();
        });
      }
    });

    EVENT_BUS.on(TuiEventType.TermResizeEvent, () => {
      app.detectTermSize(TUI_CONTEXT_INSTANCE);
      LOGGER.logInfo(`Terminal resized: ${TUI_CONTEXT_INSTANCE.rows}x${TUI_CONTEXT_INSTANCE.cols}`);
    });

    this.#mouseHandler = (data: MouseEvent) => {
      const scene = this.#currentScene;
      if (!scene) {
        return;
      }

      // Mouse move (button not set, buttons may indicate held state)
      if (data.button === undefined) {
        if (this.#pressTarget && this.#pressTarget.draggable && data.buttons && data.buttons > 0) {
          if (!this.#isDragging) {
            this.#isDragging = true;
            this.#pressTarget.dispatch('dragstart', data);
          }

          const mx = data.x - 1;
          const my = data.y - 1;
          const newX = Math.max(0, mx - this.#dragOffsetX);
          const newY = Math.max(0, my - this.#dragOffsetY);
          this.#pressTarget.updateRect({
            rectX: newX,
            rectY: newY,
          });
          this.#pressTarget.dispatch('drag', data);
        }

        return;
      }

      // Press
      if (!data.isRelease) {
        this.#pressTarget = scene.hitTest(data);
        if (this.#pressTarget) {
          this.#pressTarget.dispatch('mousedown', data);
          this.#dragOffsetX = (data.x - 1) - this.#pressTarget.rect.rectX;
          this.#dragOffsetY = (data.y - 1) - this.#pressTarget.rect.rectY;
        }

        return;
      }

      // Release
      if (this.#isDragging) {
        this.#pressTarget?.dispatch('dragend', data);
        this.#isDragging = false;
        this.#pressTarget = undefined;
        return;
      }

      if (this.#pressTarget) {
        this.#pressTarget.dispatch('mouseup', data);

        // Click only if release also hits the same widget
        const releaseTarget = scene.hitTest(data);
        if (releaseTarget === this.#pressTarget) {
          this.#pressTarget.dispatch('click', data);
        }

        this.#pressTarget = undefined;
      }
    };

    EVENT_BUS.on(TuiEventType.MouseEvent, this.#mouseHandler);

    app.startApp();
    EVENT_BUS.start();
    app.detectTermSize(TUI_CONTEXT_INSTANCE);
    LOGGER.logInfo(`TUI_CONTEXT_INSTANCE.scale: ${TUI_CONTEXT_INSTANCE.rows} ${TUI_CONTEXT_INSTANCE.cols}`);
    this.#running = true;
    const render = () => {
      if (!this.#running) {
        return;
      }

      const scene = this.#currentScene;
      if (scene) {
        this.#drawList.reset();
        scene.emitDrawCommands(this.#drawList);
        this.#drawList.finish();
        app.renderDrawList(TUI_CONTEXT_INSTANCE, this.#drawList);
      }

      setTimeout(render, 5);
    };

    setTimeout(render, 0);
  }

  stop() {
    this.#running = false;
    if (this.#mouseHandler) {
      EVENT_BUS.off(TuiEventType.MouseEvent, this.#mouseHandler);
      this.#mouseHandler = undefined;
    }

    setAppInstance(undefined);
    this.#currentScene?.destroy();
    app.stopApp();
    EVENT_BUS.stop();
    LOGGER.deinit();
    // eslint-disable-next-line unicorn/no-process-exit -- TUI CLI app needs clean exit
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

