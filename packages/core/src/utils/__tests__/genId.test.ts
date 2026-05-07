import {it, expect} from 'bun:test';
import {genId} from '../genId';

it('genId returns monotonically increasing bigints', () => {
  const a = genId();
  const b = genId();
  const c = genId();
  expect(typeof a).toBe('bigint');
  expect(b > a).toBe(true);
  expect(c > b).toBe(true);
});
