import path from 'path';
import TuiScene from './TuiScene';
import { EventType } from '../events/types';
import app from '../extern/app';
import type { LogLevel, TuiAppOptions, TuiSceneOptions } from '../extern/app/types';
import { Logger } from '../common/logger';
import { EventBus } from '../events';
import { TuiContext } from '../extern/app';

export class TuiApp {
    #debugMode = false;
    #context = new TuiContext();
    #scenes: TuiScene[] = [];
    #currentScene: TuiScene | null = null;
    #running = false;

    constructor(options?: Partial<TuiAppOptions>) {
        const logLevel: LogLevel = options?.logLevel || 'info';
        const logFileDir = options?.logFilePath || path.dirname(Bun.main);
        const backendLogName = options?.backendLogName || 'term_bed-backend.log';
        const frontendLogName = options?.frontendLogName || 'term_bed-frontend.log';
        const clearLog = options?.clearLog || false;
        Logger.init({
            logFileDir,
            logLevel,
            clearLog,
            frontendLogName,
            backendLogName,
        });
        this.#debugMode = options?.debugMode || false;
        app.setupLogger(logFileDir, backendLogName, logLevel);
    }

    start() {
        if (this.#debugMode) {
            EventBus.on(EventType.KeyboardEvent, async (data) => {
                Logger.logDebug(`按键事件：${JSON.stringify(data)}`);
            });
            EventBus.on(EventType.WheelEvent, async (data) => {
                Logger.logDebug(`鼠标滚轮事件：${JSON.stringify(data)}`);
            });
            EventBus.on(EventType.MouseEvent, async (data) => {
                Logger.logDebug(`鼠标事件：${JSON.stringify(data)}`);
            });
        }
        EventBus.on(EventType.KeyboardEvent, async (data) => {
            if (data.key === 'q' || data.key === 'Q') {
                setTimeout(() => {
                    this.stop();
                });
            }
        });
        app.startApp();
        EventBus.start();
        app.detectTermSize(this.#context);
        this.#running = true;
        const render = () => {
            if (!this.#running) {
                return;
            }
            app.renderFrame(this.#context);
            setImmediate(render);
        };
        render();
    }

    stop() {
        this.#running = false;
        app.stopApp();
        EventBus.stop();
        Logger.deinit();
    }

    createScene(options?: Partial<TuiSceneOptions>) {
        const scene = new TuiScene(options);
        if (scene.visible) {
            if (this.#currentScene) {
                this.#scenes.forEach((s) => s.setVisible(false));
            }
            this.#currentScene = scene;
        }
        this.#scenes.push(scene);
        return scene;
    }

    destroyScene(scene: TuiScene | bigint) {
        const id = typeof scene === 'bigint' ? scene : scene.id;
        this.#scenes = this.#scenes.filter((s) => s.id !== id);
        const leastScene = this.#scenes[this.#scenes.length - 1];
        this.#currentScene = leastScene || null;
        leastScene?.setVisible(true);
    }

    switchScene(scene: TuiScene) {
        const id = this.#scenes.find((s) => s.id === scene.id)?.id;
        if (!id) {
            return;
        }
        for (const s of this.#scenes) {
            s.setVisible(s.id === id);
        }
    }
}

let appInstance: TuiApp | undefined = undefined;
async function onUnexceptExit(err: unknown) {
    let errStr = 'Unexcept exit';
    if (!err) {
    } else if (typeof err === 'object') {
        errStr += errStr = JSON.stringify(err);
    } else {
        errStr += err;
    }
    Logger.logError(errStr);
    await new Promise((resolve) => setTimeout(resolve));
    if (appInstance) {
        appInstance.stop();
    }
}
process.on('unhandledRejection', onUnexceptExit);
process.on('uncaughtException', onUnexceptExit);

export default TuiApp;
