import {it, expect} from 'bun:test';
import stringWidth from 'string-width';
import {useOffsetCounter} from '../ffi';

it('offsetCounter x32', () => {
	const counter = useOffsetCounter({arch: 32});
	expect(counter.currentOffset).toBe(0);

	expect(counter.mark('pointer')).toBe(0);
	expect(counter.currentOffset).toBe(4);

	expect(counter.mark('u64')).toBe(4);
	expect(counter.currentOffset).toBe(12);

	expect(counter.mark(4)).toBe(12);
	expect(counter.currentOffset).toBe(16);

	expect(counter.mark(2)).toBe(16);
	expect(counter.currentOffset).toBe(18);

	expect(counter.mark('u8')).toBe(18);
	expect(counter.currentOffset).toBe(19);
});

it('offsetCounter x32 with alignment padding', () => {
	const counter = useOffsetCounter({arch: 32});

	expect(counter.mark('u8')).toBe(0);
	expect(counter.currentOffset).toBe(1);

	expect(counter.mark('u32')).toBe(4);
	expect(counter.currentOffset).toBe(8);

	expect(counter.mark('u8')).toBe(8);
	expect(counter.currentOffset).toBe(9);

	expect(counter.mark('u64')).toBe(12);
	expect(counter.currentOffset).toBe(20);

	expect(counter.mark('u16')).toBe(20);
	expect(counter.currentOffset).toBe(22);

	expect(counter.mark('pointer')).toBe(24);
	expect(counter.currentOffset).toBe(28);
});

it('offsetCounter x64', () => {
	const counter = useOffsetCounter();
	expect(counter.currentOffset).toBe(0);

	expect(counter.mark('pointer')).toBe(0);
	expect(counter.currentOffset).toBe(8);

	expect(counter.mark('u64')).toBe(8);
	expect(counter.currentOffset).toBe(16);

	expect(counter.mark(4)).toBe(16);
	expect(counter.currentOffset).toBe(20);

	expect(counter.mark(2)).toBe(20);
	expect(counter.currentOffset).toBe(22);

	expect(counter.mark('u8')).toBe(22);
	expect(counter.currentOffset).toBe(23);
});

it('offsetCounter x64 with alignment padding', () => {
	const counter = useOffsetCounter({arch: 64});

	expect(counter.mark('u8')).toBe(0);
	expect(counter.currentOffset).toBe(1);

	expect(counter.mark('u32')).toBe(4);
	expect(counter.currentOffset).toBe(8);

	expect(counter.mark('u8')).toBe(8);
	expect(counter.currentOffset).toBe(9);

	expect(counter.mark('u64')).toBe(16);
	expect(counter.currentOffset).toBe(24);
});

it('string-width', () => {
	expect(stringWidth('你')).toBe(2);
});
