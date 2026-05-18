import {it, expect, describe} from 'bun:test';
import {DrawListBuffer} from '../DrawListBuffer';
import {
  DrawCmd,
  BUFFER_HEADER_SIZE,
  CMD_HEADER_SIZE,
  BUFFER_MAGIC,
  BUFFER_VERSION,
  BorderSides,
  CursorMode,
  resolveCursorMode,
} from '../types';

function createBuffer(): DrawListBuffer {
  const buf = new DrawListBuffer(4096);
  buf.reset();
  return buf;
}

function readCmdHeader(buf: ArrayBuffer, offset: number) {
  const view = new DataView(buf);
  return {
    cmdType: view.getUint16(offset, true),
    flags: view.getUint16(offset + 2, true),
    payloadLen: view.getUint32(offset + 4, true),
  };
}

describe('buffer header', () => {
  it('writes magic and version on reset', () => {
    const buf = createBuffer();
    const view = new DataView(buf.buffer);
    expect(view.getUint16(0, true)).toBe(BUFFER_MAGIC);
    expect(view.getUint8(2)).toBe(BUFFER_VERSION);
    expect(buf.byteLength).toBe(BUFFER_HEADER_SIZE);
  });

  it('sets sync flag in finish', () => {
    const buf = createBuffer();
    buf.setSynchronizedUpdate(true);
    buf.finish();
    const view = new DataView(buf.buffer);
    expect(view.getUint8(3)).toBe(1);
  });

  it('clears sync flag when not set', () => {
    const buf = createBuffer();
    buf.finish();
    const view = new DataView(buf.buffer);
    expect(view.getUint8(3)).toBe(0);
  });

  it('reset clears cursor and sync state', () => {
    const buf = createBuffer();
    buf.setBackground(0xFF_FF_FF_FF);
    buf.reset();
    expect(buf.byteLength).toBe(BUFFER_HEADER_SIZE);
    buf.finish();
    const view = new DataView(buf.buffer);
    expect(view.getUint8(3)).toBe(0);
  });
});

describe('command header layout', () => {
  it('writeHeader encodes cmd_type, flags, payload_len as LE', () => {
    const buf = createBuffer();
    buf.pushClip(0, 0, 10, 10);
    const hdr = readCmdHeader(buf.buffer, BUFFER_HEADER_SIZE);
    expect(hdr.cmdType).toBe(DrawCmd.PushClip);
    expect(hdr.flags).toBe(0);
    expect(hdr.payloadLen).toBe(8); // 4 × u16
  });
});

describe('pushClip / popClip', () => {
  it('encodes clip rect as 4 × u16 LE', () => {
    const buf = createBuffer();
    buf.pushClip(1, 2, 30, 40);
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);     // x
    expect(view.getUint16(offset + 2, true)).toBe(2); // y
    expect(view.getUint16(offset + 4, true)).toBe(30); // width
    expect(view.getUint16(offset + 6, true)).toBe(40); // height
  });

  it('popClip has zero payload', () => {
    const buf = createBuffer();
    buf.pushClip(0, 0, 10, 10);
    buf.popClip();
    const popOffset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE + 8;
    const hdr = readCmdHeader(buf.buffer, popOffset);
    expect(hdr.cmdType).toBe(DrawCmd.PopClip);
    expect(hdr.payloadLen).toBe(0);
  });
});

describe('setCursor', () => {
  it('encodes x, y as 2 × u16 LE', () => {
    const buf = createBuffer();
    buf.setCursor(42, 7);
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(42);
    expect(view.getUint16(offset + 2, true)).toBe(7);
  });
});

describe('setBackground', () => {
  it('encodes color as u32 LE', () => {
    const buf = createBuffer();
    buf.setBackground(0x1E_1E_2E_FF);
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint32(offset, true)).toBe(0x1E_1E_2E_FF);
  });
});

describe('setEntityId', () => {
  it('encodes id as u64 LE', () => {
    const buf = createBuffer();
    buf.setEntityId(123n);
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getBigUint64(offset, true)).toBe(123n);
  });
});

describe('drawRect', () => {
  it('encodes rect + colors + fillChar + fontStyle', () => {
    const buf = createBuffer();
    buf.drawRect({x: 1, y: 2, width: 3, height: 4, bgRgba: 0xA0_B0_C0_FF, fillChar: 0x00_20, fontStyle: 1});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);       // x
    expect(view.getUint16(offset + 2, true)).toBe(2);   // y
    expect(view.getUint16(offset + 4, true)).toBe(3);   // width
    expect(view.getUint16(offset + 6, true)).toBe(4);   // height
    expect(view.getUint32(offset + 8, true)).toBe(0xA0_B0_C0_FF); // bgRgba
    expect(view.getUint16(offset + 12, true)).toBe(0x00_20); // fillChar
    expect(view.getUint16(offset + 14, true)).toBe(1); // fontStyle
  });
});

describe('drawText', () => {
  it('encodes position + colors + fontStyle + textLength + UTF-8 bytes', () => {
    const buf = createBuffer();
    buf.drawText({x: 5, y: 6, text: 'Hi', fgRgba: 0xFF_FF_FF_FF, bgRgba: 0x00_00_00_00, fontStyle: 2});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(5);           // x
    expect(view.getUint16(offset + 2, true)).toBe(6);       // y
    expect(view.getUint32(offset + 4, true)).toBe(0xFF_FF_FF_FF); // fgRgba
    expect(view.getUint32(offset + 8, true)).toBe(0x00_00_00_00); // bgRgba
    expect(view.getUint16(offset + 12, true)).toBe(2);      // fontStyle
    expect(view.getUint16(offset + 14, true)).toBe(2);      // textLength ("Hi" = 2 bytes)
    // UTF-8 bytes
    const bytes = new Uint8Array(buf.buffer, offset + 16, 2);
    expect(bytes[0]).toBe(0x48); // 'H'
    expect(bytes[1]).toBe(0x69); // 'i'
  });

  it('encodes CJK text as multi-byte UTF-8', () => {
    const buf = createBuffer();
    buf.drawText({x: 0, y: 0, text: '你好', fgRgba: 0, bgRgba: 0});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    const textLen = view.getUint16(offset + 14, true);
    expect(textLen).toBe(6); // 3 bytes per CJK char × 2
  });

  it('empty string produces zero-length payload text', () => {
    const buf = createBuffer();
    buf.drawText({x: 0, y: 0, text: '', fgRgba: 0, bgRgba: 0});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset + 14, true)).toBe(0);
  });
});

describe('drawBorder', () => {
  it('encodes rect + color + style + sides', () => {
    const buf = createBuffer();
    buf.drawBorder({x: 1, y: 2, width: 3, height: 4, colorRgba: 0xFF_FF_FF_FF, style: 1, sides: BorderSides.All});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);       // x
    expect(view.getUint16(offset + 2, true)).toBe(2);   // y
    expect(view.getUint16(offset + 4, true)).toBe(3);   // width
    expect(view.getUint16(offset + 6, true)).toBe(4);   // height
    expect(view.getUint32(offset + 8, true)).toBe(0xFF_FF_FF_FF); // colorRgba
    expect(view.getUint8(offset + 12)).toBe(1);          // style
    expect(view.getUint8(offset + 13)).toBe(BorderSides.All); // sides
  });
});

describe('drawShadow', () => {
  it('encodes rect + offsets + color', () => {
    const buf = createBuffer();
    buf.drawShadow({x: 1, y: 2, width: 3, height: 4, offsetX: 5, offsetY: 6, colorRgba: 0xAA_BB_CC_DD});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);
    expect(view.getUint16(offset + 2, true)).toBe(2);
    expect(view.getUint16(offset + 4, true)).toBe(3);
    expect(view.getUint16(offset + 6, true)).toBe(4);
    expect(view.getUint16(offset + 8, true)).toBe(5);   // offsetX
    expect(view.getUint16(offset + 10, true)).toBe(6);  // offsetY
    expect(view.getUint32(offset + 12, true)).toBe(0xAA_BB_CC_DD);
  });
});

describe('drawFill', () => {
  it('encodes rect + rgba', () => {
    const buf = createBuffer();
    buf.drawFill({x: 1, y: 2, width: 3, height: 4, rgba: 0xFF_00_FF_00});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);
    expect(view.getUint16(offset + 2, true)).toBe(2);
    expect(view.getUint16(offset + 4, true)).toBe(3);
    expect(view.getUint16(offset + 6, true)).toBe(4);
    expect(view.getUint32(offset + 8, true)).toBe(0xFF_00_FF_00);
  });
});

describe('drawChar', () => {
  it('encodes position + colors + char + fontStyle with wide flag', () => {
    const buf = createBuffer();
    buf.drawChar({x: 10, y: 20, char: 0x4E_16, fgRgba: 0xFF_FF_FF_FF, bgRgba: 0, fontStyle: 0, wide: true});
    const cmdOffset = BUFFER_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    // Header flags should be 1 (wide)
    expect(view.getUint16(cmdOffset + 2, true)).toBe(1);
    const offset = cmdOffset + CMD_HEADER_SIZE;
    expect(view.getUint16(offset, true)).toBe(10);
    expect(view.getUint16(offset + 2, true)).toBe(20);
    expect(view.getUint32(offset + 4, true)).toBe(0xFF_FF_FF_FF);
    expect(view.getUint32(offset + 8, true)).toBe(0);
    expect(view.getUint16(offset + 12, true)).toBe(0x4E_16);
    expect(view.getUint16(offset + 14, true)).toBe(0); // fontStyle
  });

  it('no wide flag sets flags to 0', () => {
    const buf = createBuffer();
    buf.drawChar({x: 0, y: 0, char: 0x41, fgRgba: 0, bgRgba: 0});
    const cmdOffset = BUFFER_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(cmdOffset + 2, true)).toBe(0);
  });
});

describe('drawLine', () => {
  it('encodes position + length + direction + color + style', () => {
    const buf = createBuffer();
    buf.drawLine({x: 1, y: 2, length: 10, direction: 0, colorRgba: 0xFF_FF_FF_FF, lineStyle: 2});
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(1);
    expect(view.getUint16(offset + 2, true)).toBe(2);
    expect(view.getUint16(offset + 4, true)).toBe(10);
    expect(view.getUint16(offset + 6, true)).toBe(0);
    expect(view.getUint32(offset + 8, true)).toBe(0xFF_FF_FF_FF);
    expect(view.getUint8(offset + 12)).toBe(2);
  });
});

describe('terminal control', () => {
  it('setTitle encodes length-prefixed UTF-8 string', () => {
    const buf = createBuffer();
    buf.setTitle('Demo');
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint16(offset, true)).toBe(4); // "Demo" = 4 bytes
    const bytes = new Uint8Array(buf.buffer, offset + 2, 4);
    expect(new TextDecoder().decode(bytes)).toBe('Demo');
  });

  it('showCursor has zero payload', () => {
    const buf = createBuffer();
    buf.showCursor();
    const hdr = readCmdHeader(buf.buffer, BUFFER_HEADER_SIZE);
    expect(hdr.cmdType).toBe(DrawCmd.ShowCursor);
    expect(hdr.payloadLen).toBe(0);
  });

  it('hideCursor has zero payload', () => {
    const buf = createBuffer();
    buf.hideCursor();
    const hdr = readCmdHeader(buf.buffer, BUFFER_HEADER_SIZE);
    expect(hdr.cmdType).toBe(DrawCmd.HideCursor);
    expect(hdr.payloadLen).toBe(0);
  });

  it('setCursorMode encodes mode byte', () => {
    const buf = createBuffer();
    buf.setCursorMode(CursorMode.BlinkingIBeam);
    const offset = BUFFER_HEADER_SIZE + CMD_HEADER_SIZE;
    const view = new DataView(buf.buffer);
    expect(view.getUint8(offset)).toBe(CursorMode.BlinkingIBeam);
  });
});

describe('buffer overflow', () => {
  it('drawText throws when buffer cannot fit payload', () => {
    const buf = new DrawListBuffer(BUFFER_HEADER_SIZE + CMD_HEADER_SIZE + 4);
    buf.reset();
    expect(() => buf.drawText({x: 0, y: 0, text: 'Hello', fgRgba: 0, bgRgba: 0})).toThrow(/overflow/);
  });

  it('setTitle throws when buffer cannot fit payload', () => {
    const buf = new DrawListBuffer(BUFFER_HEADER_SIZE + CMD_HEADER_SIZE + 1);
    buf.reset();
    expect(() => buf.setTitle('Title')).toThrow(/overflow/);
  });
});

describe('resolveCursorMode', () => {
  it('resolves string names to enum values', () => {
    expect(resolveCursorMode('blinking-block')).toBe(1);
    expect(resolveCursorMode('block')).toBe(2);
    expect(resolveCursorMode('blinking-underscore')).toBe(3);
    expect(resolveCursorMode('underscore')).toBe(4);
    expect(resolveCursorMode('blinking-ibeam')).toBe(5);
    expect(resolveCursorMode('ibeam')).toBe(6);
  });

  it('passes through numeric values', () => {
    expect(resolveCursorMode(3)).toBe(3);
    expect(resolveCursorMode(6)).toBe(6);
  });

  it('defaults unknown string to 1', () => {
    expect(resolveCursorMode('unknown' as any)).toBe(1);
  });
});

describe('multi-command packing', () => {
  it('commands are packed sequentially with no gaps', () => {
    const buf = createBuffer();
    buf.setBackground(0);
    buf.pushClip(0, 0, 10, 10);
    buf.drawRect({x: 0, y: 0, width: 10, height: 10, bgRgba: 0});
    buf.popClip();

    let offset = BUFFER_HEADER_SIZE;

    // SetBackground: header(8) + payload(4)
    let hdr = readCmdHeader(buf.buffer, offset);
    expect(hdr.cmdType).toBe(DrawCmd.SetBackground);
    expect(hdr.payloadLen).toBe(4);
    offset += CMD_HEADER_SIZE + hdr.payloadLen;

    // PushClip: header(8) + payload(8)
    hdr = readCmdHeader(buf.buffer, offset);
    expect(hdr.cmdType).toBe(DrawCmd.PushClip);
    expect(hdr.payloadLen).toBe(8);
    offset += CMD_HEADER_SIZE + hdr.payloadLen;

    // DrawRect: header(8) + payload(16)
    hdr = readCmdHeader(buf.buffer, offset);
    expect(hdr.cmdType).toBe(DrawCmd.DrawRect);
    expect(hdr.payloadLen).toBe(16);
    offset += CMD_HEADER_SIZE + hdr.payloadLen;

    // PopClip: header(8) + payload(0)
    hdr = readCmdHeader(buf.buffer, offset);
    expect(hdr.cmdType).toBe(DrawCmd.PopClip);
    expect(hdr.payloadLen).toBe(0);
    offset += CMD_HEADER_SIZE;

    expect(offset).toBe(buf.byteLength);
  });
});
