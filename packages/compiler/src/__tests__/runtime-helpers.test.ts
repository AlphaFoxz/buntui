import {it, expect, describe} from 'bun:test';
import {RUNTIME_HELPERS, WIDGET_TAG_MAP} from '../runtime-helpers';

describe('RUNTIME_HELPERS', () => {
  it('has all widget creation helpers', () => {
    expect(RUNTIME_HELPERS.CREATE_BOX).toBe('createBox');
    expect(RUNTIME_HELPERS.CREATE_TEXT).toBe('createTextWidget');
    expect(RUNTIME_HELPERS.CREATE_INPUT).toBe('createInputWidget');
    expect(RUNTIME_HELPERS.CREATE_BUTTON).toBe('createButtonWidget');
    expect(RUNTIME_HELPERS.CREATE_CHECKBOX).toBe('createCheckboxWidget');
    expect(RUNTIME_HELPERS.CREATE_RADIO_GROUP).toBe('createRadioGroupWidget');
    expect(RUNTIME_HELPERS.CREATE_SELECT_BUTTON).toBe('createSelectButtonWidget');
    expect(RUNTIME_HELPERS.CREATE_SWITCH).toBe('createSwitchWidget');
    expect(RUNTIME_HELPERS.CREATE_SCROLL_BOX).toBe('createScrollBoxWidget');
    expect(RUNTIME_HELPERS.CREATE_FRAME_RATE_WATCHER).toBe('createFrameRateWatcher');
    expect(RUNTIME_HELPERS.CREATE_PROGRESS_BAR).toBe('createProgressBarWidget');
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

describe('WIDGET_TAG_MAP', () => {
  it('maps all core template tags to creators', () => {
    expect(WIDGET_TAG_MAP.Box).toBe('createBox');
    expect(WIDGET_TAG_MAP.Text).toBe('createTextWidget');
    expect(WIDGET_TAG_MAP.Input).toBe('createInputWidget');
    expect(WIDGET_TAG_MAP.Button).toBe('createButtonWidget');
    expect(WIDGET_TAG_MAP.Checkbox).toBe('createCheckboxWidget');
    expect(WIDGET_TAG_MAP.RadioGroup).toBe('createRadioGroupWidget');
    expect(WIDGET_TAG_MAP.SelectButton).toBe('createSelectButtonWidget');
    expect(WIDGET_TAG_MAP.Switch).toBe('createSwitchWidget');
    expect(WIDGET_TAG_MAP.ScrollBox).toBe('createScrollBoxWidget');
    expect(WIDGET_TAG_MAP.ProgressBar).toBe('createProgressBarWidget');
  });

  it('maps extension tags', () => {
    expect(WIDGET_TAG_MAP.FrameRateWatcher).toBe('createFrameRateWatcher');
    expect(WIDGET_TAG_MAP.Matrix).toBe('createMatrixWidget');
  });

  it('WIDGET_TAG_MAP values reference RUNTIME_HELPERS where applicable', () => {
    expect(WIDGET_TAG_MAP.Box).toBe(RUNTIME_HELPERS.CREATE_BOX);
    expect(WIDGET_TAG_MAP.Text).toBe(RUNTIME_HELPERS.CREATE_TEXT);
    expect(WIDGET_TAG_MAP.Button).toBe(RUNTIME_HELPERS.CREATE_BUTTON);
    expect(WIDGET_TAG_MAP.Input).toBe(RUNTIME_HELPERS.CREATE_INPUT);
    expect(WIDGET_TAG_MAP.Checkbox).toBe(RUNTIME_HELPERS.CREATE_CHECKBOX);
    expect(WIDGET_TAG_MAP.RadioGroup).toBe(RUNTIME_HELPERS.CREATE_RADIO_GROUP);
    expect(WIDGET_TAG_MAP.SelectButton).toBe(RUNTIME_HELPERS.CREATE_SELECT_BUTTON);
    expect(WIDGET_TAG_MAP.Switch).toBe(RUNTIME_HELPERS.CREATE_SWITCH);
    expect(WIDGET_TAG_MAP.ScrollBox).toBe(RUNTIME_HELPERS.CREATE_SCROLL_BOX);
    expect(WIDGET_TAG_MAP.FrameRateWatcher).toBe(RUNTIME_HELPERS.CREATE_FRAME_RATE_WATCHER);
    expect(WIDGET_TAG_MAP.ProgressBar).toBe(RUNTIME_HELPERS.CREATE_PROGRESS_BAR);
  });

  it('has no unknown tags', () => {
    const knownTags = new Set([
      'Box', 'Text', 'Input', 'Button', 'Checkbox',
      'RadioGroup', 'SelectButton', 'Switch', 'ScrollBox',
      'ProgressBar', 'FrameRateWatcher', 'Matrix',
    ]);
    for (const tag of Object.keys(WIDGET_TAG_MAP)) {
      expect(knownTags.has(tag)).toBe(true);
    }
  });
});
