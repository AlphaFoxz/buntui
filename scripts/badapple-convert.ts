#!/usr/bin/env bun
/**
 * Converts a video file to braille-encoded binary data for the BadAppleWidget.
 *
 * Usage:
 *   bun run scripts/badapple-convert.ts <input.mp4> [output.bin] [options]
 *
 * Options:
 *   --cols <n>        Braille columns (default: 80)
 *   --rows <n>        Braille rows (default: 24)
 *   --fps <n>         Target fps (default: 30)
 *   --threshold <n>   Brightness threshold 0-255, lower = more dots (default: 128)
 *   --invert          Invert: bright pixels → dots instead of dark → dots
 *
 * Output binary format:
 *   [0xBA 0xAD] magic, [0x01] version, [fps] [cols LE u16] [rows LE u16] [frameCount LE u32]
 *   followed by frameCount × cols × rows bytes of braille dot patterns.
 *
 * Requires: ffmpeg in PATH
 */

const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('Usage: bun run scripts/badapple-convert.ts <input.mp4> [output.bin] [--cols 80] [--rows 24] [--fps 30] [--threshold 128] [--invert]');
	process.exit(1);
}

const inputPath = args[0]!;
let outputPath = 'badapple.bin';
let cols = 80;
let rows = 24;
let fps = 30;
let threshold = 128;
let invert = false;

for (let i = 1; i < args.length; i++) {
	const arg = args[i]!;
	if (arg === '--cols' && args[i + 1]) { cols = Number(args[++i]); }
	else if (arg === '--rows' && args[i + 1]) { rows = Number(args[++i]); }
	else if (arg === '--fps' && args[i + 1]) { fps = Number(args[++i]); }
	else if (arg === '--threshold' && args[i + 1]) { threshold = Number(args[++i]); }
	else if (arg === '--invert') { invert = true; }
	else if (!arg.startsWith('--')) { outputPath = arg; }
}

const pixelW = cols * 2;
const pixelH = rows * 4;
const frameSize = pixelW * pixelH;

console.log(`Converting: ${inputPath}`);
console.log(`Output:     ${outputPath}`);
console.log(`Resolution: ${pixelW}x${pixelH} px -> ${cols}x${rows} braille cells`);
console.log(`FPS: ${fps}, Threshold: ${threshold}, Invert: ${invert}`);

// Braille dot bit positions:
// Bit 0 -> (0,0)  Bit 3 -> (1,0)
// Bit 1 -> (0,1)  Bit 4 -> (1,1)
// Bit 2 -> (0,2)  Bit 5 -> (1,2)
// Bit 6 -> (0,3)  Bit 7 -> (1,3)
const BRAILLE_DOTS: Array<[number, number, number]> = [
	[0, 0, 0],
	[0, 1, 1],
	[0, 2, 2],
	[1, 0, 3],
	[1, 1, 4],
	[1, 2, 5],
	[0, 3, 6],
	[1, 3, 7],
];

function encodeFrame(pixels: Uint8Array): Uint8Array {
	const result = new Uint8Array(cols * rows);
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			let byte = 0;
			for (const [dx, dy, bit] of BRAILLE_DOTS) {
				const px = col * 2 + dx;
				const py = row * 4 + dy;
				if (px < pixelW && py < pixelH) {
					const brightness = pixels[py * pixelW + px]!;
					const isOn = invert ? brightness >= threshold : brightness < threshold;
					if (isOn) {
						byte |= (1 << bit);
					}
				}
			}
			result[row * cols + col] = byte;
		}
	}
	return result;
}

const proc = Bun.spawn([
	'ffmpeg',
	'-i', inputPath,
	'-vf', `scale=${pixelW}:${pixelH}`,
	'-pix_fmt', 'gray',
	'-r', String(fps),
	'-f', 'rawvideo',
	'-v', 'quiet',
	'pipe:1',
], {
	stdout: 'pipe',
	stderr: 'ignore',
});

const chunks: Uint8Array[] = [];
let frameCount = 0;

// Pre-allocate header (will be patched with frameCount later)
const header = new Uint8Array(12);
header[0] = 0xBA;
header[1] = 0xAD;
header[2] = 0x01;
header[3] = fps;
header[4] = cols & 0xFF;
header[5] = (cols >> 8) & 0xFF;
header[6] = rows & 0xFF;
header[7] = (rows >> 8) & 0xFF;
// [8-11] frameCount placeholder

const reader = proc.stdout.getReader();
let leftover = new Uint8Array(0);

while (true) {
	const {done, value} = await reader.read();
	if (done) break;

	const merged = new Uint8Array(leftover.length + value.length);
	merged.set(leftover);
	merged.set(value, leftover.length);

	let offset = 0;
	while (offset + frameSize <= merged.length) {
		const frame = merged.slice(offset, offset + frameSize);
		chunks.push(encodeFrame(frame));
		frameCount++;
		offset += frameSize;

		if (frameCount % 300 === 0) {
			console.log(`  ${frameCount} frames processed...`);
		}
	}

	leftover = merged.slice(offset);
}

const exitCode = await proc.exited;
if (exitCode !== 0) {
	console.error(`ffmpeg exited with code ${exitCode}`);
	process.exit(1);
}

// Patch frameCount into header
header[8] = frameCount & 0xFF;
header[9] = (frameCount >> 8) & 0xFF;
header[10] = (frameCount >> 16) & 0xFF;
header[11] = (frameCount >> 24) & 0xFF;

// Write output
const totalSize = 12 + frameCount * cols * rows;
const output = new Uint8Array(totalSize);
output.set(header);
let writeOffset = 12;
for (const chunk of chunks) {
	output.set(chunk, writeOffset);
	writeOffset += chunk.length;
}

await Bun.write(outputPath, output);

const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
console.log(`Done! ${frameCount} frames, ${sizeMB} MB -> ${outputPath}`);

// Extract audio alongside the .bin file
const audioPath = outputPath.replace(/\.bin$/v, '.mp3');
console.log(`\nExtracting audio -> ${audioPath}`);
const audioProc = Bun.spawn([
  'ffmpeg',
  '-i', inputPath,
  '-vn',
  '-acodec', 'libmp3lame',
  '-q:a', '2',
  '-y',
  audioPath,
], {
  stdout: 'ignore',
  stderr: 'ignore',
});

const audioExit = await audioProc.exited;
if (audioExit === 0) {
  console.log('Audio extracted successfully');
} else {
  console.log('Audio extraction skipped (no audio track or ffmpeg error)');
}
