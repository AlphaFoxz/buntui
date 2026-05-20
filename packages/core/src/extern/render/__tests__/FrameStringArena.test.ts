import {it, expect, describe} from 'bun:test';
import {SharedStringArena, FrameStringArena} from '../FrameStringArena';

describe('SharedStringArena', () => {
  it('starts with cursor at 0', () => {
    const arena = new SharedStringArena(1024);
    expect(arena.cursor).toBe(0);
  });

  it('allocates a string and advances cursor', () => {
    const arena = new SharedStringArena(1024);
    const result = arena.allocString('hello');
    expect(result.len).toBe(5);
    expect(arena.cursor).toBe(6); // 5 bytes + 1 null terminator
  });

  it('allocates empty string', () => {
    const arena = new SharedStringArena(1024);
    const result = arena.allocString('');
    expect(result.len).toBe(0);
    expect(arena.cursor).toBe(1); // null terminator only
  });

  it('allocates multiple strings sequentially', () => {
    const arena = new SharedStringArena(1024);
    arena.allocString('abc');
    arena.allocString('de');
    // 'abc' = 3 + 1 = 4, 'de' = 2 + 1 = 3
    expect(arena.cursor).toBe(7);
  });

  it('handles multi-byte UTF-8 characters', () => {
    const arena = new SharedStringArena(1024);
    const result = arena.allocString('你好');
    // Each Chinese character is 3 bytes in UTF-8
    expect(result.len).toBe(6);
    expect(arena.cursor).toBe(7);
  });

  it('throws when arena is full (remaining <= 1)', () => {
    const arena = new SharedStringArena(4);
    // Fill up: 'abc' = 3 bytes + 1 null = 4, cursor = 4
    arena.allocString('abc');
    expect(arena.cursor).toBe(4);
    // Now remaining = 0, should throw
    expect(() => arena.allocString('x')).toThrow('out of memory');
  });

  it('throws when arena has exactly 1 byte left (only room for null)', () => {
    const arena = new SharedStringArena(5);
    // 'abc' = 3 + 1 = 4, remaining = 1
    arena.allocString('abc');
    expect(() => arena.allocString('x')).toThrow('out of memory');
  });

  it('fills exactly to capacity minus null terminator', () => {
    const arena = new SharedStringArena(5);
    // 4 bytes + 1 null terminator = 5
    expect(() => arena.allocString('abcd')).not.toThrow();
    expect(arena.cursor).toBe(5);
  });

  describe('reset', () => {
    it('resets cursor to 0', () => {
      const arena = new SharedStringArena(1024);
      arena.allocString('hello');
      arena.reset();
      expect(arena.cursor).toBe(0);
    });

    it('allows allocation after reset', () => {
      const arena = new SharedStringArena(10);
      arena.allocString('abc');
      arena.reset();
      expect(() => arena.allocString('def')).not.toThrow();
      expect(arena.cursor).toBe(4); // 'def' = 3 + 1 null
    });
  });

  describe('swap', () => {
    it('swaps state between two arenas', () => {
      const a = new SharedStringArena(1024);
      const b = new SharedStringArena(1024);

      a.allocString('hello');
      b.allocString('world');

      const cursorA = a.cursor;
      const cursorB = b.cursor;

      a.swap(b);

      expect(a.cursor).toBe(cursorB);
      expect(b.cursor).toBe(cursorA);
    });
  });
});

describe('FrameStringArena', () => {
  it('allocates strings on nextFrame', () => {
    const arena = new FrameStringArena(1024);
    const result = arena.allocString('test');
    expect(result.len).toBe(4);
    expect(arena.nextFrame.cursor).toBe(5);
  });

  it('does not affect prevFrame on allocation', () => {
    const arena = new FrameStringArena(1024);
    arena.allocString('test');
    expect(arena.prevFrame.cursor).toBe(0);
  });

  it('swap exchanges prev and next frames', () => {
    const arena = new FrameStringArena(1024);
    arena.allocString('hello');
    arena.swap();
    // After swap, what was next (cursor=6) is now prev
    expect(arena.prevFrame.cursor).toBe(6);
    expect(arena.nextFrame.cursor).toBe(0);
  });

  it('reset clears nextFrame cursor', () => {
    const arena = new FrameStringArena(1024);
    arena.allocString('hello');
    arena.reset();
    expect(arena.nextFrame.cursor).toBe(0);
  });

  it('supports double-buffer pattern: alloc → swap → reset → alloc', () => {
    const arena = new FrameStringArena(1024);

    // Frame 1
    arena.allocString('frame1');
    arena.swap();
    arena.reset();

    // Frame 2
    arena.allocString('frame2');
    expect(arena.nextFrame.cursor).toBe(7); // 'frame2' = 6 + 1
    expect(arena.prevFrame.cursor).toBe(7); // 'frame1' = 6 + 1 from swap
  });
});
