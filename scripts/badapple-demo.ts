#!/usr/bin/env bun
/**
 * Generates a test braille animation .bin file without ffmpeg.
 * Produces a bouncing circle animation.
 *
 * Usage:
 *   bun run scripts/badapple-demo.ts [output.bin] [--cols 80] [--rows 24] [--fps 30] [--frames 300]
 */

const args = process.argv.slice(2);
let outputPath = 'badapple.bin';
let cols = 80;
let rows = 24;
let fps = 30;
let frames = 300;

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === '--cols' && args[i + 1]) cols = Number(args[++i]);
  else if (arg === '--rows' && args[i + 1]) rows = Number(args[++i]);
  else if (arg === '--fps' && args[i + 1]) fps = Number(args[++i]);
  else if (arg === '--frames' && args[i + 1]) frames = Number(args[++i]);
  else if (!arg.startsWith('--')) outputPath = arg;
}

const pixelW = cols * 2;
const pixelH = rows * 4;

console.log(`Generating test animation: ${outputPath}`);
console.log(`Grid: ${cols}x${rows} braille (${pixelW}x${pixelH} px), ${fps}fps, ${frames} frames`);

// Braille dot bit positions: [dx, dy, bit]
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
          if (pixels[py * pixelW + px]! > 0) {
            byte |= (1 << bit);
          }
        }
      }
      result[row * cols + col] = byte;
    }
  }
  return result;
}

// Scene objects
type Ball = {x: number; y: number; vx: number; vy: number; r: number};

function createBall(): Ball {
  const r = 4 + Math.random() * 8;
  return {
    x: r + Math.random() * (pixelW - 2 * r),
    y: r + Math.random() * (pixelH - 2 * r),
    vx: (1 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
    vy: (1 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
    r,
  };
}

const balls: Ball[] = Array.from({length: 5}, createBall);

function renderFrame(t: number): Uint8Array {
  const pixels = new Uint8Array(pixelW * pixelH);

  // Update balls
  for (const ball of balls) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r >= pixelW) { ball.x = pixelW - ball.r - 1; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
    if (ball.y + ball.r >= pixelH) { ball.y = pixelH - ball.r - 1; ball.vy = -Math.abs(ball.vy); }
  }

  // Draw balls
  for (const ball of balls) {
    const r2 = ball.r * ball.r;
    const minY = Math.max(0, Math.floor(ball.y - ball.r));
    const maxY = Math.min(pixelH - 1, Math.ceil(ball.y + ball.r));
    const minX = Math.max(0, Math.floor(ball.x - ball.r));
    const maxX = Math.min(pixelW - 1, Math.ceil(ball.x + ball.r));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - ball.x;
        const dy = py - ball.y;
        if (dx * dx + dy * dy <= r2) {
          pixels[py * pixelW + px] = 1;
        }
      }
    }
  }

  // Draw a bouncing horizontal line (like a scan line)
  const lineY = Math.floor((Math.sin(t * 0.05) * 0.5 + 0.5) * pixelH);
  for (let px = 0; px < pixelW; px++) {
    if (lineY >= 0 && lineY < pixelH) {
      pixels[lineY * pixelW + px] = 1;
    }
  }

  // Draw border frame that pulses
  const borderOn = Math.sin(t * 0.1) > -0.3;
  if (borderOn) {
    for (let px = 0; px < pixelW; px++) {
      pixels[px] = 1; // Top
      pixels[(pixelH - 1) * pixelW + px] = 1; // Bottom
    }
    for (let py = 0; py < pixelH; py++) {
      pixels[py * pixelW] = 1; // Left
      pixels[py * pixelW + pixelW - 1] = 1; // Right
    }
  }

  // Draw a rotating bar in the center
  const cx = pixelW / 2;
  const cy = pixelH / 2;
  const angle = t * 0.08;
  const barLen = 20;
  for (let i = -barLen; i <= barLen; i++) {
    const px = Math.round(cx + i * Math.cos(angle));
    const py = Math.round(cy + i * Math.sin(angle));
    if (px >= 0 && px < pixelW && py >= 0 && py < pixelH) {
      pixels[py * pixelW + px] = 1;
    }
  }

  return encodeFrame(pixels);
}

// Generate all frames
const header = new Uint8Array(12);
header[0] = 0xBA;
header[1] = 0xAD;
header[2] = 0x01;
header[3] = fps;
header[4] = cols & 0xFF;
header[5] = (cols >> 8) & 0xFF;
header[6] = rows & 0xFF;
header[7] = (rows >> 8) & 0xFF;
header[8] = frames & 0xFF;
header[9] = (frames >> 8) & 0xFF;
header[10] = (frames >> 16) & 0xFF;
header[11] = (frames >> 24) & 0xFF;

const totalSize = 12 + frames * cols * rows;
const output = new Uint8Array(totalSize);
output.set(header);

let offset = 12;
for (let f = 0; f < frames; f++) {
  const frame = renderFrame(f);
  output.set(frame, offset);
  offset += frame.length;

  if ((f + 1) % 100 === 0) {
    console.log(`  ${f + 1}/${frames} frames generated`);
  }
}

await Bun.write(outputPath, output);
const sizeKB = (totalSize / 1024).toFixed(1);
console.log(`Done! ${frames} frames, ${sizeKB} KB -> ${outputPath}`);
