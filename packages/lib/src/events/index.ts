import path from 'path';
import eventLib from '../extern/events';
import { toArrayBuffer } from 'bun:ffi';
import { EventType, MouseEvent, KeyboardEvent, WheelEvent } from './types';

const schemaRegistry = new Map<EventType, new (json: Record<string, any>) => any>([
    [EventType.KeyboardEvent, KeyboardEvent],
    [EventType.MouseEvent, MouseEvent],
    [EventType.WheelEvent, WheelEvent],
]);

const decoder = new TextDecoder('utf-8');
export class EventBus {
    static #running = false;
    static #handlers: Record<number, ((data: any) => void)[]> = {};

    static start() {
        this.#running = true;

        const consume = () => {
            if (!this.#running) {
                return;
            }
            const slotPtr = eventLib.event_bus_poll();

            if (slotPtr !== null) {
                try {
                    // 读取事件头（前12字节）
                    const headerBuf = toArrayBuffer(slotPtr, 0, 12);
                    const headerView = new DataView(headerBuf);
                    const eventType = headerView.getUint32(0, true);
                    const payloadLen = headerView.getUint32(4, true);
                    // const sequence = headerView.getBigUint64(4, true);

                    const payloadBuf = toArrayBuffer(slotPtr, 16, payloadLen);

                    const jsonStr = decoder.decode(payloadBuf);
                    const json = JSON.parse(jsonStr);
                    const SchemaClass = schemaRegistry.get(eventType as EventType);
                    if (!SchemaClass) {
                        console.warn(`Unknown event type: ${eventType}`);
                        throw new Error(`Unknown event type: ${eventType}`);
                    }
                    const event = new SchemaClass(json);

                    const handlers = this.#handlers[eventType];
                    if (handlers) {
                        for (const handler of handlers) {
                            handler(event);
                        }
                    }
                } catch (err) {
                    console.error('Event parse error:', err);
                } finally {
                    eventLib.event_bus_commit();
                }
            }
            setImmediate(consume);
        };
        consume();
    }

    static stop() {
        this.#running = false;
    }

    static on(eventType: EventType.MouseEvent, handler: (data: MouseEvent) => void): void;
    static on(eventType: EventType.KeyboardEvent, handler: (data: KeyboardEvent) => void): void;
    static on(eventType: EventType.WheelEvent, handler: (data: WheelEvent) => void): void;
    static on(eventType: EventType, handler: (data: any) => void) {
        if (!this.#handlers[eventType]) {
            this.#handlers[eventType] = [];
        }
        this.#handlers[eventType].push(handler);
    }
    static off(eventType: EventType, handler: (data: any) => void) {
        const handlers = this.#handlers[eventType];
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
}
