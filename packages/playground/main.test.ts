import {expect, it} from 'bun:test';

it('main', async () => {
  await import('./main');
  expect(true).toBe(true);
});

