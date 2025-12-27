import {it, expect} from 'bun:test';
import {SharedStringArena, FrameStringArena} from '../render/FrameStringArena';
import {cToString} from '../../utils/ffi';

it('SharedStringArena ascii', () => {
  const arena = new SharedStringArena();
  const {ptr, len} = arena.allocString('Hello World!');
  expect(ptr).toBeGreaterThan(0);
  expect(len).toBe(12);
  expect(arena.cursor).toBe(13);
  arena.reset();
  expect(arena.cursor).toBe(0);
});

it('SharedStringArena chinese', () => {
  const arena = new SharedStringArena();
  const {ptr, len} = arena.allocString('你好世界');
  expect(ptr).toBeGreaterThan(0);
  expect(len).toBe(12);
  expect(arena.cursor).toBe(13);
  arena.reset();
  expect(arena.cursor).toBe(0);
});

it('FrameStringArena', () => {
  const arena = new FrameStringArena();
  const en = arena.allocString('Hello World!');
  const readEn = cToString(en.ptr, en.len);
  expect(readEn).toBe('Hello World!');
  expect(arena.prev_frame.cursor).toBe(0);
  expect(arena.next_frame.cursor).toBe(13);
  arena.swap();
  expect(arena.prev_frame.cursor).toBe(13);
  expect(arena.next_frame.cursor).toBe(0);
  arena.reset();
  const cn = arena.allocString('你好世界');
  const readCn = cToString(cn.ptr, cn.len);
  expect(readCn).toBe('你好世界');
  expect(arena.prev_frame.cursor).toBe(13);
  expect(arena.next_frame.cursor).toBe(13);
  arena.reset();
  expect(arena.next_frame.cursor).toBe(0);
});

