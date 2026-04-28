import {createApp, widgets} from 'core';

// Catppuccin Mocha palette
const C = {
  Base: 0x1E_1E_2E_FF,
  Mantle: 0x18_18_25_FF,
  Crust: 0x11_11_1B_FF,
  Surface0: 0x31_32_44_FF,
  Surface1: 0x45_47_5A_FF,
  Surface2: 0x58_5B_70_FF,
  Overlay0: 0x6C_70_86_FF,
  Text: 0xC5_CF_E0_FF,
  Subtext: 0xA6_AD_C8_FF,
  Blue: 0x89_B4_FA_FF,
  Green: 0xA6_E3_A1_FF,
  Red: 0xF3_8B_A8_FF,
  Yellow: 0xF9_E2_AF_FF,
  Mauve: 0xCB_A6_F5_FF,
  Peach: 0xFA_B3_87_FF,
  Teal: 0x94_E2_D5_FF,
  Lavender: 0xB4_BE_FE_FF,
  Pink: 0xF5_C2_E7_FF,
} as const;

const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
const scene = app.createScene({bgHexRgb: 0x1E_1E_2E, visible: true});

// ── Title bar (no border) ───────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 0, rectY: 0, rectWidth: 60, rectHeight: 1,
  colorFg: C.Mauve, colorBg: C.Surface0,
  text: 'term-bed Demo — 边框 / Border / 中文示例',
}));

// ── Solid border, English text ──────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 2, rectWidth: 28, rectHeight: 5,
  colorFg: C.Text, colorBg: C.Base,
  borderColor: C.Blue, borderStyle: 1, // Solid
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: 'Solid Border (English)',
}));

// ── Rounded border, Chinese text ────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 31, rectY: 2, rectWidth: 28, rectHeight: 5,
  colorFg: C.Text, colorBg: C.Base,
  borderColor: C.Green, borderStyle: 3, // Rounded
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: '圆角边框（中文）',
}));

// ── Double border, mixed text ───────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 8, rectWidth: 28, rectHeight: 5,
  colorFg: C.Text, colorBg: C.Base,
  borderColor: C.Peach, borderStyle: 2, // Double
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: 'Double 双线边框 Mixed',
}));

// ── Bold border, status panel ───────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 31, rectY: 8, rectWidth: 28, rectHeight: 5,
  colorFg: C.Text, colorBg: C.Base,
  borderColor: C.Red, borderStyle: 4, // Bold
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: 'Bold 状态面板',
}));

// ── Partial border: top + bottom only ───────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 14, rectWidth: 28, rectHeight: 3,
  colorFg: C.Yellow, colorBg: C.Mantle,
  borderColor: C.Yellow, borderStyle: 1,
  borderTop: true, borderRight: false, borderBottom: true, borderLeft: false,
  text: 'Top+Bottom only / 仅上下',
}));

// ── Partial border: left only ───────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 31, rectY: 14, rectWidth: 28, rectHeight: 3,
  colorFg: C.Teal, colorBg: C.Mantle,
  borderColor: C.Teal, borderStyle: 1,
  borderTop: false, borderRight: false, borderBottom: false, borderLeft: true,
  text: 'Left-only sidebar 侧栏样式',
}));

// ── No border, highlighted row ──────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 18, rectWidth: 58, rectHeight: 1,
  colorFg: C.Base, colorBg: C.Blue,
  text: '无边框高亮行 — Borderless highlight row',
}));

// ── No border, subtle row ───────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 19, rectWidth: 58, rectHeight: 1,
  colorFg: C.Subtext, colorBg: C.Base,
  text: '普通行：Normal row without border 无边框普通行',
}));

// ── Dashed border ───────────────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 1, rectY: 21, rectWidth: 20, rectHeight: 3,
  colorFg: C.Lavender, colorBg: C.Base,
  borderColor: C.Lavender, borderStyle: 5, // Dashed
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: '虚线 Dashed',
}));

// ── OutsetBold border ───────────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 22, rectY: 21, rectWidth: 20, rectHeight: 3,
  colorFg: C.Pink, colorBg: C.Base,
  borderColor: C.Pink, borderStyle: 7, // OutsetBold
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: '浮雕 Outset',
}));

// ── OutsetDouble border ─────────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 43, rectY: 21, rectWidth: 20, rectHeight: 3,
  colorFg: C.Teal, colorBg: C.Base,
  borderColor: C.Teal, borderStyle: 8, // OutsetDouble
  borderTop: true, borderRight: true, borderBottom: true, borderLeft: true,
  text: '双浮雕 Outset²',
}));

// ── Footer hint (no border) ─────────────────────────────────────────
scene.mount(widgets.createText({
  rectX: 0, rectY: 25, rectWidth: 60, rectHeight: 1,
  colorFg: C.Overlay0, colorBg: C.Crust,
  text: '按 Q 退出 | Press Q to quit | 边框样式: Solid·Rounded·Double·Bold·Dashed·Outset',
}));

scene.mount(widgets.createFrameRateWatcher());

app.switchScene(scene);
app.start();
