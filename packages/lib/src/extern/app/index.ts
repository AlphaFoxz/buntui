import { dlopen, FFIType, type Pointer } from 'bun:ffi';
import { fetchDllPath, toCstring } from '../../utils/ffi';
import type { TuiContext } from './TuiContext';
import type { LogLevel } from './types';
import type { CStruct } from '../types';

const lib = dlopen(fetchDllPath(), {
    setupLogger: {
        returns: FFIType.void,
        args: [FFIType.cstring, FFIType.cstring, FFIType.i32],
    },
    startApp: { returns: FFIType.void, args: [] },
    stopApp: { returns: FFIType.void, args: [] },
    detectTermSize: { returns: FFIType.void, args: [FFIType.pointer] },
    renderFrame: { returns: FFIType.void, args: [FFIType.pointer] },
}).symbols;

export default {
    setupLogger: (logFileDir: string, backendLogName: string, logLevel: LogLevel) => {
        let logLvl: number;
        switch (logLevel) {
            case 'debug':
                logLvl = 0;
                break;
            case 'info':
                logLvl = 1;
                break;
            case 'warning':
                logLvl = 2;
                break;
            case 'error':
                logLvl = 3;
                break;
        }
        lib.setupLogger(toCstring(logFileDir), toCstring(backendLogName), logLvl);
    },
    startApp: lib.startApp,
    stopApp: lib.stopApp,
    detectTermSize(tuiContext: CStruct) {
        lib.detectTermSize(tuiContext.ptr);
    },
    renderFrame(tuiContext: TuiContext) {
        lib.renderFrame(tuiContext.ptr);
    },
};

export { TuiCell } from './TuiCell';
export { TuiContext } from './TuiContext';
