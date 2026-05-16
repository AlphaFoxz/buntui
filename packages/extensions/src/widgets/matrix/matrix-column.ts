import type {MatrixSpeedRange} from './types';

export type MatrixColumnState = {
  headY: number;
  trailLength: number;
  speed: number;
  active: boolean;
  cooldown: number;
  chars: number[];
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChar(charset: number[]): number {
  return charset[Math.floor(Math.random() * charset.length)]!;
}

export function createColumn(maxY: number, speedRange: MatrixSpeedRange, minTrail: number, maxTrail: number, charset: number[]): MatrixColumnState {
  const speed = randomInt(speedRange.min, speedRange.max);
  const trailLength = randomInt(minTrail, maxTrail);
  return {
    headY: randomInt(-maxTrail, 0),
    trailLength,
    speed,
    active: true,
    cooldown: 0,
    chars: Array.from({length: trailLength}, () => randomChar(charset)),
  };
}

export function tickColumn(
  col: MatrixColumnState,
  maxY: number,
  speedRange: MatrixSpeedRange,
  minTrail: number,
  maxTrail: number,
  density: number,
  charset: number[],
): void {
  if (!col.active) {
    col.cooldown--;
    if (col.cooldown <= 0) {
      if (Math.random() < density) {
        const restarted = createColumn(maxY, speedRange, minTrail, maxTrail, charset);
        col.headY = restarted.headY;
        col.trailLength = restarted.trailLength;
        col.speed = restarted.speed;
        col.active = true;
        col.chars = restarted.chars;
      } else {
        col.cooldown = randomInt(1, 10);
      }
    }

    return;
  }

  for (let i = 0; i < col.speed; i++) {
    col.chars.unshift(randomChar(charset));
  }

  col.chars.length = col.trailLength;
  col.headY += col.speed;

  if (col.headY - col.trailLength > maxY) {
    col.active = false;
    col.cooldown = randomInt(1, 30);
  }
}
