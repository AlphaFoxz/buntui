import {type Pointer, ptr} from '../platform/pointer';
import TuiDataViewWrapper from '../extern/TuiDataViewWrapper';
import {
  DrawCmd,
  BUFFER_HEADER_SIZE,
  CMD_HEADER_SIZE,
  BUFFER_MAGIC,
  BUFFER_VERSION,
  type CursorMode,
} from './types';

const textEncoder = new TextEncoder();

export class DrawListBuffer {
  readonly #buffer: ArrayBuffer;
  readonly #view: TuiDataViewWrapper;
  #cursor = 0;
  #synchronizedUpdate = false;

  constructor(initialSize = 64 * 1024) {
    this.#buffer = new ArrayBuffer(initialSize);
    this.#view = new TuiDataViewWrapper(this.#buffer);
  }

  get ptr(): Pointer {
    return ptr(this.#buffer);
  }

  get byteLength(): number {
    return this.#cursor;
  }

  get buffer(): ArrayBuffer {
    return this.#buffer;
  }

  // ============ Frame State ============

  reset(): void {
    this.#cursor = 0;
    this.#synchronizedUpdate = false;

    this.#view.setUint16(0, BUFFER_MAGIC, true);
    this.#view.setUint8(2, BUFFER_VERSION);
    this.#view.setUint8(3, 0);
    this.#view.setUint32(4, 0, true);
    this.#cursor = BUFFER_HEADER_SIZE;
  }

  finish(): void {
    const flags = this.#synchronizedUpdate ? 1 : 0;
    this.#view.setUint8(3, flags);
  }

  setSynchronizedUpdate(value: boolean): void {
    this.#synchronizedUpdate = value;
  }

  setBackground(bgRgba: number): void {
    this.#writeHeader(DrawCmd.SetBackground, 0, 4);
    this.#view.setUint32(this.#cursor, bgRgba, true);
    this.#cursor += 4;
  }

  setCursor(x: number, y: number): void {
    this.#writeHeader(DrawCmd.SetCursor, 0, 4);
    this.#view.setInt16(this.#cursor, x, true);
    this.#view.setInt16(this.#cursor + 2, y, true);
    this.#cursor += 4;
  }

  pushClip(x: number, y: number, width: number, height: number): void {
    this.#writeHeader(DrawCmd.PushClip, 0, 8);
    this.#view.setInt16(this.#cursor, x, true);
    this.#view.setInt16(this.#cursor + 2, y, true);
    this.#view.setInt16(this.#cursor + 4, width, true);
    this.#view.setInt16(this.#cursor + 6, height, true);
    this.#cursor += 8;
  }

  popClip(): void {
    this.#writeHeader(DrawCmd.PopClip, 0, 0);
  }

  setEntityId(entityId: bigint): void {
    this.#writeHeader(DrawCmd.SetEntityId, 0, 8);
    this.#view.setBigUint64(this.#cursor, entityId, true);
    this.#cursor += 8;
  }

  // ============ Drawing Primitives ============

  drawRect({x, y, width, height, bgRgba, fillChar = 0x00_20, fontStyle = 0}: {
    x: number;
    y: number;
    width: number;
    height: number;
    bgRgba: number;
    fillChar?: number;
    fontStyle?: number;
  }): void {
    this.#writeHeader(DrawCmd.DrawRect, 0, 16);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setInt16(offset + 4, width, true);
    this.#view.setInt16(offset + 6, height, true);
    this.#view.setUint32(offset + 8, bgRgba, true);
    this.#view.setUint16(offset + 12, fillChar, true);
    this.#view.setUint16(offset + 14, fontStyle, true);
    this.#cursor = offset + 16;
  }

  drawText({x, y, text, fgRgba, bgRgba, fontStyle = 0}: {
    x: number;
    y: number;
    text: string;
    fgRgba: number;
    bgRgba: number;
    fontStyle?: number;
  }): void {
    const encoded = textEncoder.encode(text);
    const textLength = encoded.length;
    this.#writeHeader(DrawCmd.DrawText, 0, 16 + textLength);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setUint32(offset + 4, fgRgba, true);
    this.#view.setUint32(offset + 8, bgRgba, true);
    this.#view.setUint16(offset + 12, fontStyle, true);
    this.#view.setUint16(offset + 14, textLength, true);
    new Uint8Array(this.#buffer).set(encoded, offset + 16);
    this.#cursor = offset + 16 + textLength;
  }

  drawBorder({x, y, width, height, colorRgba, style, sides}: {
    x: number;
    y: number;
    width: number;
    height: number;
    colorRgba: number;
    style: number;
    sides: number;
  }): void {
    this.#writeHeader(DrawCmd.DrawBorder, 0, 16);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setInt16(offset + 4, width, true);
    this.#view.setInt16(offset + 6, height, true);
    this.#view.setUint32(offset + 8, colorRgba, true);
    this.#view.setUint8(offset + 12, style);
    this.#view.setUint8(offset + 13, sides);
    this.#view.setUint16(offset + 14, 0, true);
    this.#cursor = offset + 16;
  }

  drawShadow({x, y, width, height, offsetX, offsetY, colorRgba}: {
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    colorRgba: number;
  }): void {
    this.#writeHeader(DrawCmd.DrawShadow, 0, 16);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setInt16(offset + 4, width, true);
    this.#view.setInt16(offset + 6, height, true);
    this.#view.setInt16(offset + 8, offsetX, true);
    this.#view.setInt16(offset + 10, offsetY, true);
    this.#view.setUint32(offset + 12, colorRgba, true);
    this.#cursor = offset + 16;
  }

  drawFill({x, y, width, height, rgba}: {
    x: number;
    y: number;
    width: number;
    height: number;
    rgba: number;
  }): void {
    this.#writeHeader(DrawCmd.DrawFill, 0, 12);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setInt16(offset + 4, width, true);
    this.#view.setInt16(offset + 6, height, true);
    this.#view.setUint32(offset + 8, rgba, true);
    this.#cursor = offset + 12;
  }

  drawChar({x, y, char, fgRgba, bgRgba, fontStyle = 0, wide = false}: {
    x: number;
    y: number;
    char: number;
    fgRgba: number;
    bgRgba: number;
    fontStyle?: number;
    wide?: boolean;
  }): void {
    const flags = wide ? 1 : 0;
    this.#writeHeader(DrawCmd.DrawChar, flags, 16);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setUint32(offset + 4, fgRgba, true);
    this.#view.setUint32(offset + 8, bgRgba, true);
    this.#view.setUint16(offset + 12, char, true);
    this.#view.setUint16(offset + 14, fontStyle, true);
    this.#cursor = offset + 16;
  }

  drawLine({x, y, length, direction, colorRgba, lineStyle}: {
    x: number;
    y: number;
    length: number;
    direction: number;
    colorRgba: number;
    lineStyle: number;
  }): void {
    this.#writeHeader(DrawCmd.DrawLine, 0, 16);
    const offset = this.#cursor;
    this.#view.setInt16(offset, x, true);
    this.#view.setInt16(offset + 2, y, true);
    this.#view.setUint16(offset + 4, length, true);
    this.#view.setUint16(offset + 6, direction, true);
    this.#view.setUint32(offset + 8, colorRgba, true);
    this.#view.setUint8(offset + 12, lineStyle);
    this.#cursor = offset + 16;
  }

  // ============ Terminal Control ============

  setTitle(title: string): void {
    const encoded = textEncoder.encode(title);
    this.#writeHeader(DrawCmd.SetTitle, 0, 2 + encoded.length);
    this.#view.setUint16(this.#cursor, encoded.length, true);
    new Uint8Array(this.#buffer).set(encoded, this.#cursor + 2);
    this.#cursor += 2 + encoded.length;
  }

  showCursor(): void {
    this.#writeHeader(DrawCmd.ShowCursor, 0, 0);
  }

  hideCursor(): void {
    this.#writeHeader(DrawCmd.HideCursor, 0, 0);
  }

  setCursorMode(mode: CursorMode): void {
    this.#writeHeader(DrawCmd.SetCursorMode, 0, 1);
    this.#view.setUint8(this.#cursor, mode);
    this.#cursor += 1;
  }

  // ============ Private ============

  #writeHeader(cmdType: number, flags: number, payloadLength: number): void {
    const needed = CMD_HEADER_SIZE + payloadLength;
    if (this.#cursor + needed > this.#buffer.byteLength) {
      throw new Error(`DrawListBuffer overflow: need ${needed} bytes at cursor ${this.#cursor}, buffer size ${this.#buffer.byteLength}`);
    }

    const offset = this.#cursor;
    this.#view.setUint16(offset, cmdType, true);
    this.#view.setUint16(offset + 2, flags, true);
    this.#view.setUint32(offset + 4, payloadLength, true);
    this.#cursor = offset + CMD_HEADER_SIZE;
  }
}
