import {createApp, widgets} from 'lib';

const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});

const scene = app.createScene({bgHexRgb: 0x7F_60_FE, visible: true});
scene
  // .mount(widgets.createText({
  //   rectX: 0,
  //   rectY: 0,
  //   text: 'Count: 0',
  // }))
  // .mount(widgets.createText({
  //   rectX: 0,
  //   rectY: 1,
  //   text: 'Press - / + to change count.',
  // }))
  // .mount(widgets.createText({
  //   rectX: 0,
  //   rectY: 2,
  //   text: 'Press Ctrl+C to exit.',
  // }));
  .mount(widgets.createFrameRateWatcher());

app.switchScene(scene);
app.start();

