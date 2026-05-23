import {describe, it, expect} from 'bun:test';
import {PROP_UPDATE_MAP, FLAG_PROP_MAP} from '../template/widget-props';
import {
  BoxWidget,
  createBox,
  TextWidget,
  createTextWidget,
  ButtonWidget,
  createButtonWidget,
  InputWidget,
  createInputWidget,
  CheckboxWidget,
  createCheckboxWidget,
  SwitchWidget,
  createSwitchWidget,
  RadioGroupWidget,
  createRadioGroupWidget,
  SelectButtonWidget,
  createSelectButtonWidget,
  ScrollBoxWidget,
  createScrollBoxWidget,
  ProgressWidget,
  createProgressWidget,
} from '@buntui/core';

type WidgetConstructor = new (...args: any[]) => any;

const WIDGETS: WidgetConstructor[] = [
  BoxWidget,
  TextWidget,
  ButtonWidget,
  InputWidget,
  CheckboxWidget,
  SwitchWidget,
  RadioGroupWidget,
  SelectButtonWidget,
  ScrollBoxWidget,
  ProgressWidget,
];

const WIDGET_NAMES = WIDGETS.map(w => w.name);

function getPropUpdateMethods(): string[] {
  return [...new Set(Object.values(PROP_UPDATE_MAP).map(v => v.method))];
}

function getFlagPropMethods(): string[] {
  return [...new Set(Object.values(FLAG_PROP_MAP))];
}

function getCreateFunctions(): Array<{name: string; fn: (...args: any[]) => any}> {
  return [
    {name: 'BoxWidget', fn: () => createBox()},
    {name: 'TextWidget', fn: () => createTextWidget({value: ''})},
    {name: 'ButtonWidget', fn: () => createButtonWidget()},
    {name: 'InputWidget', fn: () => createInputWidget()},
    {name: 'CheckboxWidget', fn: () => createCheckboxWidget()},
    {name: 'SwitchWidget', fn: () => createSwitchWidget()},
    {name: 'RadioGroupWidget', fn: () => createRadioGroupWidget({options: ['a']})},
    {name: 'SelectButtonWidget', fn: () => createSelectButtonWidget({options: ['a']})},
    {name: 'ScrollBoxWidget', fn: () => createScrollBoxWidget()},
    {name: 'ProgressWidget', fn: () => createProgressWidget()},
  ];
}

const CREATE_FNS = getCreateFunctions();

function hasMethod(obj: any, method: string): boolean {
  return typeof obj[method] === 'function';
}

describe('widget-props consistency', () => {
  describe('PROP_UPDATE_MAP methods exist on widgets that accept those props', () => {
    const createFnsByName = new Map(CREATE_FNS.map(c => [c.name, c.fn]));

    const propToWidgets: Record<string, string[]> = {
      x: WIDGET_NAMES,
      y: WIDGET_NAMES,
      width: WIDGET_NAMES,
      height: WIDGET_NAMES,
      colorFg: ['BoxWidget', 'TextWidget', 'ScrollBoxWidget'],
      colorBg: ['BoxWidget', 'TextWidget', 'ScrollBoxWidget'],
      zIndex: ['BoxWidget', 'TextWidget'],
      styleModifier: ['BoxWidget', 'TextWidget'],
      border: ['BoxWidget', 'ScrollBoxWidget'],
      borderColor: ['BoxWidget', 'ScrollBoxWidget'],
      borderStyle: ['BoxWidget', 'ScrollBoxWidget'],
      borderTop: ['BoxWidget', 'ScrollBoxWidget'],
      borderRight: ['BoxWidget', 'ScrollBoxWidget'],
      borderBottom: ['BoxWidget', 'ScrollBoxWidget'],
      borderLeft: ['BoxWidget', 'ScrollBoxWidget'],
      shadowOffsetX: ['BoxWidget', 'ScrollBoxWidget'],
      shadowOffsetY: ['BoxWidget', 'ScrollBoxWidget'],
      shadowColor: ['BoxWidget', 'ScrollBoxWidget'],
      shadowCovered: ['BoxWidget', 'ScrollBoxWidget'],
      value: ['TextWidget', 'ButtonWidget', 'InputWidget', 'ProgressWidget', 'SelectButtonWidget', 'RadioGroupWidget'],
      direction: ['BoxWidget'],
      gap: ['BoxWidget', 'ScrollBoxWidget'],
      align: ['BoxWidget'],
      paddingTop: ['BoxWidget', 'ScrollBoxWidget'],
      paddingBottom: ['BoxWidget', 'ScrollBoxWidget'],
      paddingLeft: ['BoxWidget', 'ScrollBoxWidget'],
      paddingRight: ['BoxWidget', 'ScrollBoxWidget'],
    };

    for (const [prop, entry] of Object.entries(PROP_UPDATE_MAP)) {
      const expectedWidgets = propToWidgets[prop];
      if (!expectedWidgets) {
        continue;
      }

      for (const widgetName of expectedWidgets) {
        it(`${entry.method}() exists on ${widgetName} (for prop "${prop}")`, () => {
          const createFn = createFnsByName.get(widgetName);
          const instance = createFn!();
          expect(hasMethod(instance, entry.method)).toBe(true);
        });
      }
    }
  });

  describe('FLAG_PROP_MAP methods exist on widgets that accept those props', () => {
    const createFnsByName = new Map(CREATE_FNS.map(c => [c.name, c.fn]));

    const propToWidgets: Record<string, string[]> = {
      draggable: WIDGET_NAMES,
      disabled: ['ButtonWidget', 'InputWidget', 'CheckboxWidget', 'SwitchWidget', 'RadioGroupWidget', 'SelectButtonWidget', 'ScrollBoxWidget', 'ProgressWidget'],
      checked: ['CheckboxWidget', 'SwitchWidget'],
      indeterminate: ['CheckboxWidget'],
      readonly: ['InputWidget'],
      label: ['InputWidget', 'CheckboxWidget', 'SwitchWidget'],
      tabs: ['SelectButtonWidget', 'RadioGroupWidget'],
      options: ['SelectButtonWidget', 'RadioGroupWidget'],
      visible: WIDGET_NAMES,
    };

    for (const [prop, method] of Object.entries(FLAG_PROP_MAP)) {
      const expectedWidgets = propToWidgets[prop];
      if (!expectedWidgets) {
        continue;
      }

      for (const widgetName of expectedWidgets) {
        it(`${method}() exists on ${widgetName} (for prop "${prop}")`, () => {
          const createFn = createFnsByName.get(widgetName);
          const instance = createFn!();
          expect(hasMethod(instance, method)).toBe(true);
        });
      }
    }
  });
});
