import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {TuiContextLike} from '../extern/app/TuiContext';
import type {LogLevel} from '../extern/app/types';
import type {TuiEvent} from '../events/types';

export type TuiBackendEventHandler = (eventType: number, event: TuiEvent) => void;

export type TuiBackend = {
  setupLogger(logFileDir: string, logName: string, logLevel: LogLevel, clearLog: boolean): void;
  startApp(): void;
  stopApp(): void;
  detectTermSize(context: TuiContextLike): void;
  renderDrawList(context: TuiContextLike, buffer: DrawListBuffer): void;
  startEvents(handler: TuiBackendEventHandler): void;
  stopEvents(): void;
};
