import {it, expect, describe} from 'bun:test';
import {CORE_REGISTRY} from '../runtime-helpers';
import {
  BoxWidget,
  TextWidget,
  InputWidget,
  ButtonWidget,
  CheckboxWidget,
  RadioGroupWidget,
  SelectButtonWidget,
  SwitchWidget,
  ScrollBoxWidget,
  ProgressWidget,
  TextareaWidget,
  TableWidget,
  SelectWidget,
} from '@buntui/core';
import fs from 'node:fs';
import path from 'node:path';

const TAG_TO_CLASS: Record<string, new (...args: unknown[]) => unknown> = {
  Box: BoxWidget,
  Text: TextWidget,
  Input: InputWidget,
  Button: ButtonWidget,
  Checkbox: CheckboxWidget,
  RadioGroup: RadioGroupWidget,
  SelectButton: SelectButtonWidget,
  Switch: SwitchWidget,
  ScrollBox: ScrollBoxWidget,
  Progress: ProgressWidget,
  Textarea: TextareaWidget,
  Table: TableWidget,
  Select: SelectWidget,
};

const TAG_TO_PROPS_TYPE: Record<string, string> = {
  Box: 'TuiBoxProps',
  Text: 'TuiTextProps',
  Input: 'TuiInputProps',
  Button: 'TuiButtonProps',
  Checkbox: 'TuiCheckboxProps',
  RadioGroup: 'TuiRadioGroupProps',
  SelectButton: 'TuiSelectButtonProps',
  Switch: 'TuiSwitchProps',
  ScrollBox: 'TuiScrollBoxProps',
  Progress: 'TuiProgressProps',
  Textarea: 'TuiTextareaProps',
  Table: 'TuiTableProps',
  Select: 'TuiSelectProps',
};

const PROPS_WHICH_DONT_NEED_HANDLERS = new Set<string>([
  'modelValue',
  'overflow',
  'type',
]);

const EXTRA_ALLOWED_MISSING: Record<string, Set<string>> = {
  Button: new Set([
    'colorFgFocused', 'colorBgFocused', 'colorBorderFocused', 'borderStyleFocused',
    'colorFgDisabled', 'colorBgDisabled', 'colorBorderDisabled', 'borderStyleDisabled',
  ]),
  Checkbox: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgHovered', 'colorBgHovered',
    'colorFgFocused', 'colorBgFocused', 'colorFgDisabled', 'colorBgDisabled',
  ]),
  Input: new Set([
    'colorPlaceholder', 'colorBorderUnfocused', 'colorBorderFocused',
    'colorSelectionBg', 'colorSelectionFg',
    'colorFgDisabled', 'colorBgDisabled', 'colorBorderDisabled',
  ]),
  RadioGroup: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgFocused', 'colorBgFocused',
    'colorFgDisabled', 'colorBgDisabled', 'colorFgSelected', 'colorBgSelected',
  ]),
  SelectButton: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgActive', 'colorBgActive',
    'colorFgFocused', 'colorBgFocused', 'colorFgDisabled', 'colorBgDisabled',
    'colorFgSeparator',
  ]),
  Switch: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorCrossNormal', 'colorCheckNormal', 'colorDimNormal',
    'colorFgHovered', 'colorBgHovered', 'colorCrossHovered', 'colorCheckHovered', 'colorDimHovered',
    'colorFgFocused', 'colorBgFocused', 'colorCrossFocused', 'colorCheckFocused', 'colorDimFocused',
    'colorFgDisabled', 'colorBgDisabled', 'colorCrossDisabled', 'colorCheckDisabled', 'colorDimDisabled',
  ]),
  Progress: new Set([
    'colorTrackNormal', 'colorFillNormal', 'colorTrackDisabled', 'colorFillDisabled',
  ]),
  ScrollBox: new Set(['scrollSpeed']),
  Textarea: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgFocused', 'colorBgFocused',
    'colorPlaceholder', 'colorBorderUnfocused', 'colorBorderFocused', 'colorBorderDisabled',
    'colorSelectionBg', 'colorSelectionFg',
    'colorFgDisabled', 'colorBgDisabled',
    'colorScrollbar', 'colorScrollbarTrack',
  ]),
  Select: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgFocused', 'colorBgFocused',
    'colorFgHovered', 'colorBgHovered', 'colorFgDisabled', 'colorBgDisabled',
    'colorBorderUnfocused', 'colorBorderFocused', 'colorBorderDisabled',
    'colorFgItem', 'colorBgItem', 'colorFgItemSelected', 'colorBgItemSelected',
    'colorFgItemHovered', 'colorBgItemHovered',
  ]),
};

function isAllowedMissing(tag: string, prop: string): boolean {
  return PROPS_WHICH_DONT_NEED_HANDLERS.has(prop)
    || (EXTRA_ALLOWED_MISSING[tag] ?? new Set()).has(prop);
}

const globalDtsPath = path.resolve(import.meta.dir, '../../../core/src/global.d.ts');
const globalDtsContent = fs.readFileSync(globalDtsPath, 'utf-8');

function extractTypeFields(content: string, typeName: string): Set<string> {
  const startMarker = `type ${typeName} = {`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    return new Set();
  }

  const braceStart = content.indexOf('{', startIdx);
  let depth = 0;
  let blockEnd = braceStart;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
    } else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  const block = content.slice(braceStart + 1, blockEnd);
  const fields = new Set<string>();
  const fieldRegex = /^\s+(\w+)\s*[?:]/gm;
  let match;
  while ((match = fieldRegex.exec(block)) !== null) {
    fields.add(match[1]!);
  }

  return fields;
}

const flexItemProps = extractTypeFields(globalDtsContent, 'TuiFlexItemProps');

function getGlobalProps(tag: string): Set<string> {
  const typeName = TAG_TO_PROPS_TYPE[tag];
  if (!typeName) {
    return new Set();
  }

  return new Set([...extractTypeFields(globalDtsContent, typeName), ...flexItemProps]);
}

function getHandlerKeys(tag: string): Set<string> {
  const entry = CORE_REGISTRY[tag];
  if (!entry?.propHandlers) {
    return new Set();
  }

  return new Set(Object.keys(entry.propHandlers));
}

describe('runtime-helpers ↔ widget ↔ global.d.ts sync', () => {
  const tags = Object.keys(CORE_REGISTRY).filter(tag => TAG_TO_CLASS[tag]);

  describe('method existence — every propHandler.method exists on widget prototype', () => {
    for (const tag of tags) {
      it(`${tag}`, () => {
        const WidgetClass = TAG_TO_CLASS[tag]!;
        const handlers = CORE_REGISTRY[tag]!.propHandlers ?? {};
        const missing: string[] = [];
        for (const [prop, handler] of Object.entries(handlers)) {
          const method = (handler as {method: string}).method;
          if (typeof (WidgetClass.prototype as Record<string, unknown>)[method] !== 'function') {
            missing.push(`${prop} → ${method}()`);
          }
        }

        expect(missing).toEqual([]);
      });
    }
  });

  describe('orphaned handlers — no propHandler key missing from global.d.ts', () => {
    for (const tag of tags) {
      it(`${tag}`, () => {
        const handlerKeys = getHandlerKeys(tag);
        const globalProps = getGlobalProps(tag);
        const orphans = [...handlerKeys].filter(key => !globalProps.has(key));

        expect(orphans).toEqual([]);
      });
    }
  });

  describe('missing handlers — every global.d.ts prop has a propHandler or is explicitly constructor-only', () => {
    for (const tag of tags) {
      it(`${tag}`, () => {
        const handlerKeys = getHandlerKeys(tag);
        const globalProps = getGlobalProps(tag);
        const missing = [...globalProps].filter(
          prop => !handlerKeys.has(prop) && !isAllowedMissing(tag, prop),
        );

        expect(missing).toEqual([]);
      });
    }
  });

  describe('rect completeness — if any rect handler exists, all 4 must exist', () => {
    const rectKeys = ['x', 'y', 'width', 'height'] as const;

    for (const tag of tags) {
      it(`${tag}`, () => {
        const handlerKeys = getHandlerKeys(tag);
        const present = rectKeys.filter(key => handlerKeys.has(key));

        if (present.length > 0 && present.length < 4) {
          const absent = rectKeys.filter(key => !handlerKeys.has(key));
          throw new Error(`${tag} has rect handlers ${present.join(', ')} but missing ${absent.join(', ')}`);
        }
      });
    }
  });
});
