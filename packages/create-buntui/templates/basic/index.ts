import {createApp, createTextWidget, createBox} from 'buntui';

const app = createApp();
const scene = app.createScene({
  setup() {},
}, {bgHexRgb: 0x1A_1B_26, visible: true});

const title = createTextWidget({
  x: 0,
  y: 0,
  width: '100%',
  height: 1,
  value: 'Hello from {{name}}!',
  colorFg: 0x7A_A2_F7,
  colorBg: 0x1A_1B_26,
});

const box = createBox({
  x: '10%',
  y: '20%',
  width: '80%',
  height: '60%',
  colorBg: 0x24_28_3B,
  borderColor: 0x7A_A2_F7,
  borderStyle: 1,
});

scene.mount(box);
scene.mount(title);
app.start();
