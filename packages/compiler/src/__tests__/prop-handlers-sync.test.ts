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

const TAG_TO_CLASS: Record<string, unknown> = {
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
        const proto = (TAG_TO_CLASS[tag] as {prototype: Record<string, unknown>}).prototype;
        const handlers = CORE_REGISTRY[tag]!.propHandlers ?? {};
        const missing: string[] = [];
        for (const [prop, handler] of Object.entries(handlers)) {
          const method = (handler as {method: string}).method;
          if (typeof proto[method] !== 'function') {
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

// ===== global.d.ts ↔ widget options types (types.ts) sync =====

const widgetsTypesPath = path.resolve(import.meta.dir, '../../../core/src/widgets/types.ts');
const widgetsTypesContent = fs.readFileSync(widgetsTypesPath, 'utf-8');

const SHARED_TYPE_NAMES = ['TuiWidgetColor', 'TuiWidgetBorder', 'TuiWidgetShadow', 'TuiWidgetText', 'TuiWidgetPadding', 'TuiWidgetStyle'] as const;

const SHARED_TYPE_FIELDS: Record<string, Set<string>> = {};
for (const typeName of SHARED_TYPE_NAMES) {
  SHARED_TYPE_FIELDS[typeName] = extractTypeFields(widgetsTypesContent, typeName);
}

const TAG_TO_OPTIONS_SOURCE: Record<string, {file: string; typeName: string}> = {
  Box: {file: 'box/BoxWidget.ts', typeName: 'BoxWidgetOptions'},
  Text: {file: 'text/TextWidget.ts', typeName: 'TextWidgetOptions'},
  Input: {file: 'input/types.ts', typeName: 'InputWidgetOptions'},
  Button: {file: 'button/types.ts', typeName: 'ButtonWidgetOptions'},
  Checkbox: {file: 'checkbox/types.ts', typeName: 'CheckboxWidgetOptions'},
  RadioGroup: {file: 'radio/types.ts', typeName: 'RadioGroupWidgetOptions'},
  SelectButton: {file: 'select-button/types.ts', typeName: 'SelectButtonWidgetOptions'},
  Switch: {file: 'switch/types.ts', typeName: 'SwitchWidgetOptions'},
  ScrollBox: {file: 'scroll-box/types.ts', typeName: 'ScrollBoxWidgetOptions'},
  Progress: {file: 'progress/types.ts', typeName: 'ProgressWidgetOptions'},
  Textarea: {file: 'textarea/types.ts', typeName: 'TextareaWidgetOptions'},
  Table: {file: 'table/types.ts', typeName: 'TableWidgetOptions'},
  Select: {file: 'select/types.ts', typeName: 'SelectWidgetOptions'},
};

const optionsFileCache: Record<string, string> = {};

function getOptionsFields(tag: string): Set<string> {
  const source = TAG_TO_OPTIONS_SOURCE[tag];
  if (!source) {
    return new Set();
  }

  if (!optionsFileCache[source.file]) {
    const fullPath = path.resolve(import.meta.dir, '../../../core/src/widgets', source.file);
    optionsFileCache[source.file] = fs.readFileSync(fullPath, 'utf-8');
  }

  const content = optionsFileCache[source.file]!;
  const startMarker = `type ${source.typeName} =`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    return new Set();
  }

  let end = startIdx;
  let braceDepth = 0;
  for (let i = startIdx + startMarker.length; i < content.length; i++) {
    if (content[i] === '{') braceDepth++;
    if (content[i] === '}') braceDepth--;
    if (braceDepth === 0 && content[i] === ';') {
      end = i;
      break;
    }
  }

  const def = content.slice(startIdx, end);
  const fields = new Set<string>();

  for (const [sharedName, sharedFields] of Object.entries(SHARED_TYPE_FIELDS)) {
    if (def.includes(sharedName)) {
      for (const f of sharedFields) {
        fields.add(f);
      }
    }
  }

  const omitMatch = /Omit<[^,]+,\s*([^>]+)>/.exec(def);
  if (omitMatch) {
    const keyRegex = /'([^']+)'/g;
    let m;
    while ((m = keyRegex.exec(omitMatch[1]!)) !== null) {
      fields.delete(m[1]!);
    }
  }

  const fieldRegex = /^\s+(\w+)\s*[?:]/gm;
  let m;
  while ((m = fieldRegex.exec(def)) !== null) {
    fields.add(m[1]!);
  }

  return fields;
}

const GLOBAL_ONLY_SYSTEMATIC = new Set([
  'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'visible', 'position',
  'modelValue',
  'zIndex',
]);

const OPTIONS_ONLY_SYSTEMATIC = new Set([
  'styleZIndex',
]);

const WIDGET_GLOBAL_ONLY: Record<string, Set<string>> = {
  Text: new Set(['draggable']),
  RadioGroup: new Set(['tabs']),
  SelectButton: new Set(['tabs']),
  ScrollBox: new Set(['border', 'disabled']),
  Select: new Set(['height']),
  Button: new Set(['borderStyle']),
  Checkbox: new Set(['borderStyle']),
  Switch: new Set(['borderStyle']),
};

const WIDGET_OPTIONS_ONLY: Record<string, Set<string>> = {
  Input: new Set(['colorFgNormal', 'colorBgNormal', 'colorFgFocused', 'colorBgFocused']),
  Checkbox: new Set(['colorBorderFocused', 'borderStyleFocused']),
  RadioGroup: new Set(['colorFgHovered', 'colorBgHovered']),
  Switch: new Set(['colorBorderFocused', 'borderStyleFocused']),
  ScrollBox: new Set(['colorBorderFocused', 'borderStyleFocused']),
  Table: new Set([
    'colorFgNormal', 'colorBgNormal', 'colorFgFocused', 'colorBgFocused',
    'colorFgDisabled', 'colorBgDisabled', 'colorBorder', 'colorBorderFocused',
    'borderStyleFocused', 'colorHeaderFg', 'colorHeaderBg', 'colorSelectionBg',
    'colorSelectionFg', 'colorScrollbar', 'colorScrollbarTrack',
  ]),
  Select: new Set(['colorScrollbar', 'colorScrollbarTrack']),
};

function isAllowedGlobalOnly(tag: string, prop: string): boolean {
  return GLOBAL_ONLY_SYSTEMATIC.has(prop)
    || (WIDGET_GLOBAL_ONLY[tag] ?? new Set()).has(prop);
}

function isAllowedOptionsOnly(tag: string, prop: string): boolean {
  return OPTIONS_ONLY_SYSTEMATIC.has(prop)
    || (WIDGET_OPTIONS_ONLY[tag] ?? new Set()).has(prop);
}

describe('global.d.ts ↔ widget options types (types.ts) sync', () => {
  const tags = Object.keys(CORE_REGISTRY).filter(tag => TAG_TO_OPTIONS_SOURCE[tag]);

  describe('global.d.ts props missing from runtime options types', () => {
    for (const tag of tags) {
      it(`${tag}`, () => {
        const globalProps = getGlobalProps(tag);
        const optionsFields = getOptionsFields(tag);
        const unexplained = [...globalProps].filter(
          prop => !optionsFields.has(prop) && !isAllowedGlobalOnly(tag, prop),
        );

        expect(unexplained).toEqual([]);
      });
    }
  });

  describe('runtime options fields missing from global.d.ts', () => {
    for (const tag of tags) {
      it(`${tag}`, () => {
        const globalProps = getGlobalProps(tag);
        const optionsFields = getOptionsFields(tag);
        const unexplained = [...optionsFields].filter(
          prop => !globalProps.has(prop) && !isAllowedOptionsOnly(tag, prop),
        );

        expect(unexplained).toEqual([]);
      });
    }
  });
});
