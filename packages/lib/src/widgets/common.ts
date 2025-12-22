import type { RectWidgetInfoOptions } from './types';

export function createWidgetInfo(options: RectWidgetInfoOptions) {
    return {
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
        zIndex: options.zIndex,
        visible: options.visible,
    };
}
