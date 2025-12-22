import { expect, it } from 'bun:test';
import Text from '../Text';

it('text widget', () => {
    const text = new Text('', { x: 1, y: 2, width: 3, height: 4, visible: true });
    expect(text.id).toBeGreaterThan(0n);
    // expect(text.position).toEqual({ x: 1, y: 2 });
    // expect(text.baseInfo.rect).toEqual({ width: 3, height: 4 });
    // expect(text.baseInfo.visible).toBe(true);
});
