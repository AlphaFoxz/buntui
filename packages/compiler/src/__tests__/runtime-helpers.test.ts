import {it, expect, describe} from 'bun:test';
import {RUNTIME_HELPERS, CORE_REGISTRY} from '../runtime-helpers';

describe('RUNTIME_HELPERS', () => {
  it('has all core widget creation helpers', () => {
    expect(RUNTIME_HELPERS.CREATE_BOX).toBe('createBox');
    expect(RUNTIME_HELPERS.CREATE_TEXT).toBe('createTextWidget');
    expect(RUNTIME_HELPERS.CREATE_INPUT).toBe('createInputWidget');
    expect(RUNTIME_HELPERS.CREATE_BUTTON).toBe('createButtonWidget');
    expect(RUNTIME_HELPERS.CREATE_CHECKBOX).toBe('createCheckboxWidget');
    expect(RUNTIME_HELPERS.CREATE_RADIO_GROUP).toBe('createRadioGroupWidget');
    expect(RUNTIME_HELPERS.CREATE_SELECT_BUTTON).toBe('createSelectButtonWidget');
    expect(RUNTIME_HELPERS.CREATE_SWITCH).toBe('createSwitchWidget');
    expect(RUNTIME_HELPERS.CREATE_SCROLL_BOX).toBe('createScrollBoxWidget');
    expect(RUNTIME_HELPERS.CREATE_PROGRESS).toBe('createProgressWidget');
  });

  it('has app helper', () => {
    expect(RUNTIME_HELPERS.CREATE_APP).toBe('createApp');
  });

  it('has reactivity helpers', () => {
    expect(RUNTIME_HELPERS.REF).toBe('ref');
    expect(RUNTIME_HELPERS.EFFECT).toBe('effect');
    expect(RUNTIME_HELPERS.COMPUTED).toBe('computed');
  });
});

describe('CORE_REGISTRY', () => {
  it('maps all core template tags to creator and module', () => {
    expect(CORE_REGISTRY.Box).toMatchObject({creator: 'createBox', module: '@buntui/core'});
    expect(CORE_REGISTRY.Text).toMatchObject({creator: 'createTextWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Input).toMatchObject({creator: 'createInputWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Button).toMatchObject({creator: 'createButtonWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Checkbox).toMatchObject({creator: 'createCheckboxWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.RadioGroup).toMatchObject({creator: 'createRadioGroupWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.SelectButton).toMatchObject({creator: 'createSelectButtonWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Switch).toMatchObject({creator: 'createSwitchWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.ScrollBox).toMatchObject({creator: 'createScrollBoxWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Progress).toMatchObject({creator: 'createProgressWidget', module: '@buntui/core'});
  });

  it('has per-widget propHandlers for all core widgets', () => {
    for (const tag of Object.keys(CORE_REGISTRY)) {
      expect(CORE_REGISTRY[tag as keyof typeof CORE_REGISTRY]?.propHandlers).toBeDefined();
      expect(typeof CORE_REGISTRY[tag as keyof typeof CORE_REGISTRY]?.propHandlers).toBe('object');
    }
  });

  it('does not contain extension tags', () => {
    expect(CORE_REGISTRY).not.toHaveProperty('FrameRateWatcher');
    expect(CORE_REGISTRY).not.toHaveProperty('Matrix');
  });
});
