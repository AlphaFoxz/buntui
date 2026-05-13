import process from 'node:process';
import {createApp} from '@buntui/core';
import {setupUI} from './setup-ui';

const args = process.argv.slice(2);
const defaultName = args[0];

const app = createApp({logLevel: 'warning', clearLog: true});
setupUI(app, defaultName);
app.start();
