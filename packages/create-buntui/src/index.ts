import process from 'node:process';
import {createApp} from '@buntui/core';
import {setApp, setDefaultProjectName} from './app-context';
import CreateUI from './CreateUI.vue';

const args = process.argv.slice(2);
const defaultName = args[0];

process.on('SIGINT', () => {
  process.exit(0);
});

const app = createApp({logLevel: 'info', clearLog: true});
setApp(app);
setDefaultProjectName(defaultName);
app.createScene(CreateUI, {visible: true});
app.start();
