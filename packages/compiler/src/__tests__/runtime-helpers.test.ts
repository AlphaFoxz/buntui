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
    expect(CORE_REGISTRY.Box).toEqual({creator: 'createBox', module: '@buntui/core'});
    expect(CORE_REGISTRY.Text).toEqual({creator: 'createTextWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Input).toEqual({creator: 'createInputWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Button).toEqual({creator: 'createButtonWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Checkbox).toEqual({creator: 'createCheckboxWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.RadioGroup).toEqual({creator: 'createRadioGroupWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.SelectButton).toEqual({creator: 'createSelectButtonWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Switch).toEqual({creator: 'createSwitchWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.ScrollBox).toEqual({creator: 'createScrollBoxWidget', module: '@buntui/core'});
    expect(CORE_REGISTRY.Progress).toEqual({creator: 'createProgressWidget', module: '@buntui/core'});
  });

  it('does not contain extension tags', () => {
    expect(CORE_REGISTRY).not.toHaveProperty('FrameRateWatcher');
    expect(CORE_REGISTRY).not.toHaveProperty('Matrix');
  });
});
