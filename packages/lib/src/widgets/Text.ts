import { createWidgetInfo } from './common';
import type { RectWidgetInfoOptions } from './types';
import type { RectWidget, RectWidgetInfo } from '../extern/types';

export default class Text implements RectWidget {
    #refrenceCount: number = 0;
    #baseInfo: RectWidgetInfo;
    #text: string;

    constructor(text: string, options?: Partial<RectWidgetInfoOptions>) {
        this.#baseInfo = createWidgetInfo({
            x: options?.x || 0,
            y: options?.y || 0,
            width: options?.width || 20,
            height: options?.height || 1,
            zIndex: options?.zIndex || 0,
            visible: options?.visible || true,
        });
        this.#text = text;
    }

    get id() {
        return 1n;
    }
    get baseInfo() {
        return this.#baseInfo;
    }
    get text() {
        return this.#text;
    }
    set text(text: string) {
        this.#text = text;
    }
    mounted() {
        this.#refrenceCount += 1;
    }
    unmounted() {
        this.#refrenceCount -= 1;
    }
}
