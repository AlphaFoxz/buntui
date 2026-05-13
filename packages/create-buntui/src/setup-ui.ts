#!/usr/bin/env bun
import process from 'node:process';
import {
  createBox,
  createTextWidget,
  createInputWidget,
  createButtonWidget,
  type createApp,
} from '@buntui/core';
import {scaffold} from './scaffold';

type TuiApp = ReturnType<typeof createApp>;

const ACCENT = 'rgb(122, 162, 247)';
const BG = 'rgb(26, 27, 38)';
const SURFACE = 'rgb(36, 40, 59)';
const TEXT = 'rgb(192, 202, 229)';
const TEXT_DIM = 'rgb(86, 95, 137)';

export function setupUI(app: TuiApp, defaultName?: string): void {
  const scene = app.createScene({
    setup() {
      /* No-op */
    },
  }, {bgHexRgb: BG, visible: true});

  // Title bar
  scene.mount(createTextWidget({
    x: 0,
    y: 0,
    width: '100%',
    height: 1,
    value: ' Create Buntui App',
    colorFg: ACCENT,
    colorBg: BG,
  }));

  // Container box
  scene.mount(createBox({
    x: '25%',
    y: '20%',
    width: '50%',
    height: 12,
    colorBg: SURFACE,
    borderColor: ACCENT,
    borderStyle: 1,
  }));

  // Input
  const input = createInputWidget({
    x: '0%',
    y: '22%',
    value: defaultName ?? 'my-buntui-app',
    colorFg: TEXT,
    colorBg: BG,
    borderColorUnfocused: TEXT_DIM,
    borderColorFocused: ACCENT,
    borderStyle: 1,
    placeholder: 'Type something...',
    label: 'Project name',
  });
  scene.mount(input);

  // Create button
  const createBtn = createButtonWidget({
    x: '35%',
    y: '50%',
    width: 12,
    height: 3,
    value: ' Create ',
    colorFgNormal: BG,
    colorBgNormal: ACCENT,
    borderColorNormal: ACCENT,
    borderStyleNormal: 1,
    colorFgFocused: BG,
    colorBgFocused: 'rgb(157, 122, 247)',
    borderColorFocused: 'rgb(157, 122, 247)',
    borderStyleFocused: 1,
    colorFgPressed: BG,
    colorBgPressed: 'rgb(91, 110, 181)',
    borderColorPressed: 'rgb(91, 110, 181)',
    borderStylePressed: 1,
  });

  // Cancel button
  const cancelBtn = createButtonWidget({
    x: '50%',
    y: '50%',
    width: 12,
    height: 3,
    value: ' Cancel ',
    colorFgNormal: TEXT_DIM,
    colorBgNormal: SURFACE,
    borderColorNormal: TEXT_DIM,
    borderStyleNormal: 1,
    colorFgFocused: TEXT,
    colorBgFocused: 'rgb(59, 66, 91)',
    borderColorFocused: TEXT,
    borderStyleFocused: 1,
    colorFgPressed: TEXT_DIM,
    colorBgPressed: 'rgb(42, 48, 69)',
    borderColorPressed: 'rgb(42, 48, 69)',
    borderStylePressed: 1,
  });

  // Status text
  const status = createTextWidget({
    x: '27%',
    y: '60%',
    width: '46%',
    height: 1,
    value: '',
    colorFg: TEXT_DIM,
    colorBg: BG,
  });

  createBtn.on('click', () => {
    const name = input.value.trim();
    if (!name) {
      status.updateValue(' Please enter a project name');
      return;
    }

    status.updateValue(' Creating project...');
    try {
      scaffold(name, process.cwd());
      status.updateValue(` Project "${name}" created successfully!`);
      setTimeout(() => {
        app.dispose();
        process.exit(0);
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.updateValue(` ${message}`);
    }
  });

  cancelBtn.on('click', () => {
    app.dispose();
    process.exit(0);
  });

  scene.mount(createBtn);
  scene.mount(cancelBtn);
  scene.mount(status);
}
