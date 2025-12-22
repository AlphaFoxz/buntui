import { it, expect } from 'bun:test';
import { genId } from '../gen-id';

it('genId', () => {
    expect(genId()).toBe(1n);
    expect(genId()).toBe(2n);
    expect(genId()).toBe(3n);
});
