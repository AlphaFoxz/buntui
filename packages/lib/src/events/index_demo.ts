import { EventType, type EventSchema } from './types';
import { ptr, toArrayBuffer } from 'bun:ffi';
import lib from '../extern/events';

class KeyboardEventSchema implements EventSchema {
    parse(buffer: ArrayBuffer) {
        const view = new DataView(buffer);
        return {
            userId: view.getBigUint64(0, true),
            timestamp: Number(view.getBigInt64(8, true)),
        };
    }
}

class MouseEventSchema implements EventSchema {
    parse(buffer: ArrayBuffer) {
        const view = new DataView(buffer);
        return {
            orderId: view.getBigUint64(0, true),
            amount: view.getFloat64(8, true),
            userId: view.getBigUint64(16, true),
        };
    }
}

const schemaRegistry = new Map<EventType, EventSchema>([
    [EventType.KeyboardEvent, new KeyboardEventSchema()],
    [EventType.MouseEvent, new MouseEventSchema()],
]);

export class EventBusConsumer {
    private running = false;

    constructor() {
        lib.event_bus_setup();
    }

    // 启动消费循环
    start(handler: (eventType: EventType, data: any) => void) {
        this.running = true;

        const consume = () => {
            if (!this.running) return;

            const eventSlotPtr = lib.event_bus_poll();

            if (eventSlotPtr !== null) {
                try {
                    // 读取事件头（前12字节）
                    const headerBuf = toArrayBuffer(eventSlotPtr, 0, 12);
                    const headerView = new DataView(headerBuf);
                    const eventType = headerView.getUint16(0, true);
                    const payloadLen = headerView.getUint16(2, true);
                    const sequence = headerView.getBigUint64(4, true);

                    // 读取负载数据
                    const payloadBuf = toArrayBuffer(eventSlotPtr, 12, payloadLen);

                    // 解析成 JSON
                    const schema = schemaRegistry.get(eventType as EventType);
                    if (schema) {
                        const jsonData = schema.parse(payloadBuf);
                        handler(eventType as EventType, jsonData);
                    } else {
                        console.warn(`Unknown event type: ${eventType}`);
                    }

                    // 确认读取
                    lib.event_bus_commit();
                } catch (err) {
                    console.error('Event parse error:', err);
                }
            }

            // 使用 setImmediate 保持低延迟
            setImmediate(consume);
        };

        consume();
    }

    stop() {
        this.running = false;
    }

    getStats(): { pending: bigint } {
        const buf = new BigUint64Array(1);
        lib.event_bus_stats(ptr(buf));
        return { pending: buf[0]! };
    }
}

export class EventBusProducer {
    // 发送原始字节
    emit(eventType: EventType, data: Uint8Array): boolean {
        const result = lib.event_bus_emit(eventType, ptr(data), data.length);
        return result === 0;
    }

    // 辅助：发送结构化数据（需手动序列化）
    emitUserLogin(userId: bigint, timestamp: bigint) {
        const buf = new ArrayBuffer(16);
        const view = new DataView(buf);
        view.setBigUint64(0, userId, true);
        view.setBigInt64(8, timestamp, true);
        return this.emit(EventType.KeyboardEvent, new Uint8Array(buf));
    }

    emitOrderCreated(orderId: bigint, amount: number, userId: bigint) {
        const buf = new ArrayBuffer(24);
        const view = new DataView(buf);
        view.setBigUint64(0, orderId, true);
        view.setFloat64(8, amount, true);
        view.setBigUint64(16, userId, true);
        return this.emit(EventType.KeyboardEvent, new Uint8Array(buf));
    }
}

export function on(eventType: EventType, handler: (data: any) => void) {
    const consumer = new EventBusConsumer();
    consumer.start((type, data) => {
        if (type === eventType) {
            handler(data);
        }
    });
}
