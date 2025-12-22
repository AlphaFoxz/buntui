import type { TuiSceneOptions } from '../extern/app/types';
import type { Entity, WidgetLike } from '../extern/types';
import { rgb } from '../utils/styles';
import { genId } from '../utils/gen-id';

export class TuiScene implements Entity {
    #id: bigint;
    #widgets: WidgetLike<any>[] = [];
    #visible: boolean = false;
    #bgHexRgb: number = 0x000000;
    constructor(options?: Partial<TuiSceneOptions>) {
        this.#id = genId();
        this.#visible = options?.visible || false;
        this.#bgHexRgb = options?.bgHexRgb || 0x000000;
    }
    setVisible(visible: boolean) {
        this.#visible = visible;
    }
    get visible() {
        return this.#visible;
    }
    mount(widget: WidgetLike<any>) {
        this.#widgets.push(widget);
        widget.mounted();
        return this;
    }
    unmount(widget: WidgetLike<any>) {
        const index = this.#widgets.indexOf(widget);
        if (index >= 0) {
            this.#widgets[index]?.unmounted();
            this.#widgets.splice(this.#widgets.indexOf(widget), 1);
        }
    }

    get id() {
        return this.#id;
    }
    get widgets() {
        return this.#widgets;
    }
    get bgHexRgb() {
        return this.#bgHexRgb;
    }

    setBgRgb(hexRgb: number): void;
    setBgRgb(r: number, g: number, b: number): void;
    setBgRgb(hexRgb: string): void;
    setBgRgb(rgbColor: { r: number; g: number; b: number }): void;
    setBgRgb(
        color: { r: number; g: number; b: number } | string | number,
        g?: number,
        b?: number
    ): void {
        this.#bgHexRgb = rgb(color as any, g!, b!);
    }
}

export default TuiScene;
