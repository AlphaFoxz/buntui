import {dlopen, FFIType} from 'bun:ffi';
import {fetchDllPath, toCstring} from '../../utils/ffi';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {CStruct} from '../types';
import type {LogLevel} from './types';

const lib = dlopen(fetchDllPath(), {
  setupLogger: {
    returns: FFIType.void,
    args: [FFIType.cstring, FFIType.cstring, FFIType.u8, FFIType.u8],
  },
  startApp: {returns: FFIType.void, args: []},
  stopApp: {returns: FFIType.void, args: []},
  detectTermSize: {returns: FFIType.void, args: [FFIType.pointer]},
  renderDrawList: {
    returns: FFIType.void,
    args: [FFIType.pointer, FFIType.pointer, FFIType.uint64_t],
  },
}).symbols;

const expose = {
  setupLogger(logFileDir: string, backendLogName: string, logLevel: LogLevel, clearLog: boolean) {
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

    lib.setupLogger(toCstring(logFileDir), toCstring(backendLogName), logLvl, clearLog ? 1 : 0);
  },
  startApp: lib.startApp,
  stopApp: lib.stopApp,
  detectTermSize(tuiContext: CStruct) {
    lib.detectTermSize(tuiContext.ptr);
  },
  renderDrawList(tuiContext: CStruct, drawListBuffer: DrawListBuffer) {
    lib.renderDrawList(tuiContext.ptr, drawListBuffer.ptr, drawListBuffer.byteLength);
  },
};

export default expose;
