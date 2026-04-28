import {createApp} from 'core';
import {setup} from './App.vue';

const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
const scene = app.createScene({bgHexRgb: 0x1E_1E_2E, visible: true});
setup(scene);
app.switchScene(scene);
app.start();
