#!/usr/bin/env bun
import process from 'node:process';
import {execSync} from 'node:child_process';
import {
  createBox,
  createTextWidget,
  createInputWidget,
  createButtonWidget,
  type createApp,
} from '@buntui/core';
import {scaffoldCopy} from './scaffold';

type TuiApp = ReturnType<typeof createApp>;

const ACCENT = 'rgb(122, 162, 247)';
const ACCENT_HOVER = 'rgb(157, 122, 247)';
const ACCENT_PRESSED = 'rgb(91, 110, 181)';
const BG = 'rgb(26, 27, 38)';
const SURFACE = 'rgb(36, 40, 59)';
const SURFACE_HOVER = 'rgb(59, 66, 91)';
const TEXT = 'rgb(192, 202, 229)';
const TEXT_DIM = 'rgb(86, 95, 137)';

export function setupUI(app: TuiApp, defaultName?: string): void {
  const scene = app.createScene({
    setup() {
      /* No-op */
    },
  }, {bgHexRgb: BG, visible: true});

  const card = createBox({
    x: '25%',
    y: 3,
    width: '50%',
    height: 16,
    colorBg: SURFACE,
    borderColor: ACCENT,
    borderStyle: 'rounded',
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 2,
    paddingRight: 2,
    shadowOffsetX: 2,
    shadowOffsetY: 1,
    shadowColor: 'rgb(10, 10, 18)',
  });

  const title = createTextWidget({
    width: '100%',
    height: 1,
    value: 'Create Buntui App',
    colorFg: ACCENT,
    colorBg: SURFACE,
    styleModifier: 'bold',
  });

  const separator = createTextWidget({
    width: '100%',
    height: 1,
    value: '─'.repeat(40),
    colorFg: TEXT_DIM,
    colorBg: SURFACE,
    overflow: 'clip',
  });

  const input = createInputWidget({
    width: '100%',
    value: defaultName ?? 'my-buntui-app',
    colorFg: TEXT,
    colorBg: BG,
    borderColorUnfocused: TEXT_DIM,
    borderColorFocused: ACCENT,
    borderStyle: 'solid',
    placeholder: 'my-buntui-app',
    label: 'Project name',
  });

  const btnRow = createBox({
    width: '100%',
    height: 3,
    border: false,
    direction: 'horizontal',
    gap: 2,
    align: 'center',
  });

  const createBtn = createButtonWidget({
    width: 12,
    height: 3,
    value: 'Create',
    colorFgNormal: BG,
    colorBgNormal: ACCENT,
    borderColorNormal: ACCENT,
    borderStyleNormal: 'rounded',
    colorFgFocused: BG,
    colorBgFocused: ACCENT_HOVER,
    borderColorFocused: ACCENT_HOVER,
    borderStyleFocused: 'rounded',
    colorFgPressed: BG,
    colorBgPressed: ACCENT_PRESSED,
    borderColorPressed: ACCENT_PRESSED,
    borderStylePressed: 'rounded',
  });

  const cancelBtn = createButtonWidget({
    width: 12,
    height: 3,
    value: 'Cancel',
    colorFgNormal: TEXT_DIM,
    colorBgNormal: SURFACE,
    borderColorNormal: TEXT_DIM,
    borderStyleNormal: 'rounded',
    colorFgFocused: TEXT,
    colorBgFocused: SURFACE_HOVER,
    borderColorFocused: TEXT,
    borderStyleFocused: 'rounded',
    colorFgPressed: TEXT_DIM,
    colorBgPressed: 'rgb(42, 48, 69)',
    borderColorPressed: 'rgb(42, 48, 69)',
    borderStylePressed: 'rounded',
  });

  btnRow.addChild(createBtn);
  btnRow.addChild(cancelBtn);

  const hint = createTextWidget({
    width: '100%',
    height: 1,
    value: '',
    colorFg: TEXT_DIM,
    colorBg: SURFACE,
  });

  card.addChild(title);
  card.addChild(separator);
  card.addChild(input);
  card.addChild(btnRow);
  card.addChild(hint);
  scene.mount(card);

  createBtn.on('click', () => {
    const name = input.value.trim();
    if (!name) {
      hint.updateValue('Please enter a project name');
      return;
    }

    hint.updateValue('Creating project...');
    try {
      const projectDir = scaffoldCopy(name, process.cwd());
      hint.updateValue(`Project "${name}" created!`);
      setTimeout(() => {
        app.dispose();
        execSync('bun install', {cwd: projectDir, stdio: 'inherit'});
        process.exit(0);
      }, 800);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      hint.updateValue(message);
    }
  });

  cancelBtn.on('click', () => {
    app.dispose();
    process.exit(0);
  });

  input.on('submit', () => {
    createBtn.dispatch('click', undefined);
  });
}
