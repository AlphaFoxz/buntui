import {it, expect} from 'bun:test';
import {APPS_DIR, DEFAULT_APP_OPTIONS, DEFAULT_COMPILE_OPTIONS} from '../constants.ts';

it('APPS_DIR is src/apps', () => {
  expect(APPS_DIR).toBe('src/apps');
});

it('DEFAULT_APP_OPTIONS has expected defaults', () => {
  expect(DEFAULT_APP_OPTIONS).toEqual({
    logLevel: 'debug',
    clearLog: true,
    debugMode: true,
    tickRate: 60,
    renderRate: 48,
  });
});

it('DEFAULT_COMPILE_OPTIONS has registry and codegen', () => {
  expect(DEFAULT_COMPILE_OPTIONS.registry).toBeDefined();
  expect(DEFAULT_COMPILE_OPTIONS.codegen).toEqual({
    coreModuleId: '@buntui/core',
    reactivityModuleId: '@vue/reactivity',
  });
});

it('DEFAULT_COMPILE_OPTIONS registry contains core widgets', () => {
  const {registry} = DEFAULT_COMPILE_OPTIONS;
  const coreTags = ['Box', 'Text', 'Input', 'Button', 'Checkbox', 'Select', 'Switch'];
  for (const tag of coreTags) {
    expect(registry[tag]).toBeDefined();
  }
});
