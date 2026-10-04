/**
 Braille dot bit positions within a 2x4 cell grid.
 Each entry: [dx, dy, bitIndex]
 Maps pixel positions to the Unicode braille dot encoding.
 */
export const BRAILLE_DOTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [0, 1, 1],
  [0, 2, 2],
  [1, 0, 3],
  [1, 1, 4],
  [1, 2, 5],
  [0, 3, 6],
  [1, 3, 7],
] as const;

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.avi',
  '.webm',
  '.mov',
  '.flv',
  '.wmv',
  '.ts',
  '.mts',
  '.m4v',
  '.ogv',
  '.3gp',
]);

export function isVideoFile(path: string): boolean {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? false : VIDEO_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

/**
 Encode a raw grayscale frame into braille dot patterns.
 Each 2x4 pixel block becomes one braille cell byte.
 @param pixels - Raw grayscale pixel data (width * height bytes)
 @param cols - Number of braille columns (width / 2)
 @param rows - Number of braille rows (height / 4)
 @param threshold - Brightness threshold (0-255). Pixels darker -> dots
 @param isInverted - If true, bright pixels become dots instead
 */
export function encodeBrailleFrame(
  pixels: Uint8Array,
  cols: number,
  rows: number,
  threshold: number,
  isInverted: boolean,
): Uint8Array {
  const pixelW = cols * 2;
  const pixelH = rows * 4;
  const result = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let byte = 0;
      for (const [dx, dy, bit] of BRAILLE_DOTS) {
        const px = (col * 2) + dx;
        const py = (row * 4) + dy;
        if (px >= pixelW || py >= pixelH) {
          continue;
        }

        const brightness = pixels[(py * pixelW) + px]!;
        const isOn = isInverted ? brightness >= threshold : brightness < threshold;
        if (isOn) {
          byte |= (1 << bit);
        }
      }

      result[(row * cols) + col] = byte;
    }
  }

  return result;
}
