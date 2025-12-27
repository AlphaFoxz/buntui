import {dlopen, FFIType, type Pointer} from 'bun:ffi';
import {fetchDllPath, toCstring, assertPtr} from '../../utils/ffi';
import type {CStruct} from '../types';
import type {LogLevel} from './types';

const lib = dlopen(fetchDllPath(), {
  setupLogger: {
    returns: FFIType.void,
    args: [FFIType.cstring, FFIType.cstring, FFIType.i32],
  },
  startApp: {returns: FFIType.void, args: []},
  stopApp: {returns: FFIType.void, args: []},
  createScene: {returns: FFIType.pointer, args: [FFIType.u32, FFIType.u8]},
  mountWidgetEntity: {returns: FFIType.void, args: [FFIType.pointer, FFIType.pointer]},
  unmountWidgetEntity: {returns: FFIType.void, args: [FFIType.pointer, FFIType.pointer]},
  destroyScene: {returns: FFIType.void, args: [FFIType.pointer]},
  detectTermSize: {returns: FFIType.void, args: [FFIType.pointer]},
  renderFrame: {returns: FFIType.void, args: [FFIType.pointer, FFIType.pointer]},
}).symbols;

const expose = {
  setupLogger(logFileDir: string, backendLogName: string, logLevel: LogLevel) {
    let logLvl: number;
    switch (logLevel) {
      case 'debug': {
        logLvl = 0;
        break;
      }

      case 'info': {
        logLvl = 1;
        break;
      }

      case 'warning': {
        logLvl = 2;
        break;
      }

      case 'error': {
        logLvl = 3;
        break;
      }
    }

    lib.setupLogger(toCstring(logFileDir), toCstring(backendLogName), logLvl);
  },
  startApp: lib.startApp,
  stopApp: lib.stopApp,
  createScene(bgRgba: number): Pointer {
    return assertPtr(lib.createScene(bgRgba));
  },
  mountWidgetEntity(scene: Pointer, widget: Pointer) {
    lib.mountWidgetEntity(scene, widget);
  },
  unmountWidgetEntity(scene: Pointer, widget: Pointer) {
    lib.unmountWidgetEntity(scene, widget);
  },
  destroyScene(scene: Pointer) {
    lib.destroyScene(scene);
  },
  detectTermSize(tuiContext: CStruct) {
    lib.detectTermSize(tuiContext.ptr);
  },
  renderFrame(tuiContext: Pointer, scene: Pointer | null) {
    if (scene) {
      lib.renderFrame(tuiContext, scene);
    }
  },
};

export default expose;
