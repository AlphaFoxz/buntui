import {dlopen, FFIType, toArrayBuffer} from 'bun:ffi';
import {fetchDllPath, toCstring} from '../utils/ffi';
import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {CStruct} from '../extern/types';
import type {LogLevel} from '../extern/app/types';
import TuiDataView from '../extern/TuiDataViewWrapper';
import {LOGGER} from '../common/logger';
import {
  TuiEventType, KeyboardEvent, MouseEvent, WheelEvent, TermResizeEvent,
  type TuiEvent,
} from '../events/types';
import type {TuiBackend, TuiBackendEventHandler} from './TuiBackend';

const schemaRegistry = new Map<number, new (buffer: ArrayBuffer) => TuiEvent>([
  [TuiEventType.KeyboardEvent, KeyboardEvent],
  [TuiEventType.MouseEvent, MouseEvent],
  [TuiEventType.WheelEvent, WheelEvent],
  [TuiEventType.TermResizeEvent, TermResizeEvent],
]);

function createFfiSymbols() {
  return dlopen(fetchDllPath(), {
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
    event_bus_poll: {args: [], returns: FFIType.ptr},
    event_bus_commit: {args: [], returns: FFIType.void},
  }).symbols;
}

type FfiSymbols = ReturnType<typeof createFfiSymbols>;
let cachedSymbols: FfiSymbols | undefined;

function loadLib(): FfiSymbols {
  cachedSymbols ??= createFfiSymbols();
  return cachedSymbols;
}

export class NativeBackend implements TuiBackend {
  #eventRunning = false;

  setupLogger(logFileDir: string, backendLogName: string, logLevel: LogLevel, clearLog: boolean): void {
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

    loadLib().setupLogger(toCstring(logFileDir), toCstring(backendLogName), logLvl, clearLog ? 1 : 0);
  }

  startApp(): void {
    loadLib().startApp();
  }

  stopApp(): void {
    loadLib().stopApp();
  }

  detectTermSize(context: CStruct): void {
    loadLib().detectTermSize(context.ptr);
  }

  renderDrawList(context: CStruct, drawListBuffer: DrawListBuffer): void {
    loadLib().renderDrawList(context.ptr, drawListBuffer.ptr, drawListBuffer.byteLength);
  }

  startEvents(handler: TuiBackendEventHandler): void {
    this.#eventRunning = true;
    const lib = loadLib();

    const consume = () => {
      if (!this.#eventRunning) {
        return;
      }

      const slotPtr = lib.event_bus_poll();

      if (slotPtr !== null) {
        try {
          const headerBuf = toArrayBuffer(slotPtr, 0, 16);
          const headerView = new TuiDataView(headerBuf);
          const eventType = headerView.getUint32(0, true);
          const payloadLength = headerView.getUint32(4, true);

          const payloadBuf = toArrayBuffer(slotPtr, 16, payloadLength);

          const SCHEMA_CLASS = schemaRegistry.get(eventType);
          if (!SCHEMA_CLASS) {
            LOGGER.logWarning(`Unknown event type: ${eventType}`);
            throw new Error(`Unknown event type: ${eventType}`);
          }

          const event = new SCHEMA_CLASS(payloadBuf);
          handler(eventType, event);
        } catch (error) {
          LOGGER.logError(`Event parse error: ${formatError(error)}`);
        } finally {
          lib.event_bus_commit();
        }
      }

      setImmediate(consume);
    };

    consume();
  }

  stopEvents(): void {
    this.#eventRunning = false;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
