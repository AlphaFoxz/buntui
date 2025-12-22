export function rgbToRgba(hexRgb: number): number;
export function rgbToRgba(r: number, g: number, b: number): number;
export function rgbToRgba(hexRgb: string): number;
export function rgbToRgba(rgb: { r: number; g: number; b: number }): number;
export function rgbToRgba(
    color: { r: number; g: number; b: number } | string | number,
    g?: number,
    b?: number
): number {
    if (typeof color === 'string') {
        color = color.replace('#', '');
        if (color.length === 3) {
            color = color[0]! + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        if (color.length !== 6) {
            throw new Error('Invalid color: ' + color);
        }
        return (parseInt(color, 16) << 8) | 0xff;
    } else if (typeof color === 'number') {
        if (g !== undefined && b !== undefined) {
            return (color << 24) | (g << 16) | (b << 8) | 0xff;
        }
        return (color << 8) | 0xff;
    } else {
        return (color.r << 24) | (color.g << 16) | (color.b << 8) | 0xff;
    }
}

export function rgb(hexRgb: number): number;
export function rgb(r: number, g: number, b: number): number;
export function rgb(hexRgb: string): number;
export function rgb(rgb: { r: number; g: number; b: number }): number;
export function rgb(
    color: { r: number; g: number; b: number } | string | number,
    g?: number,
    b?: number
): number {
    if (typeof color === 'string') {
        color = color.replace('#', '');
        if (color.length === 3) {
            color = color[0]! + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        if (color.length !== 6) {
            throw new Error('Invalid color: ' + color);
        }
        return parseInt(color, 16);
    } else if (typeof color === 'number') {
        if (g !== undefined && b !== undefined) {
            return (color << 16) | (g << 8) | b;
        }
        return color;
    } else {
        return (color.r << 16) | (color.g << 8) | color.b;
    }
}

export function cellStyle() {}
