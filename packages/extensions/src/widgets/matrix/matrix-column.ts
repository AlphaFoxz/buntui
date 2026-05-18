import type {MatrixSpeedRange} from './types';

export type MatrixColumnState = {
  headY: number;
  trailLength: number;
  speed: number;
  active: boolean;
  cooldown: number;
  chars: number[];
  accumulator: number;
  tickInterval: number;
};

export type MatrixColumnConfig = {
  maxY: number;
  speedRange: MatrixSpeedRange;
  minTrail: number;
  maxTrail: number;
  charset: number[];
  tickIntervalRange: {min: number; max: number};
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChar(charset: number[]): number {
  return charset[Math.floor(Math.random() * charset.length)]!;
}

export function createColumn(config: MatrixColumnConfig): MatrixColumnState {
  const {maxTrail, speedRange, minTrail, charset, tickIntervalRange} = config;
  const speed = randomInt(speedRange.min, speedRange.max);
  const trailLength = randomInt(minTrail, maxTrail);
  const tickInterval = randomInt(tickIntervalRange.min, tickIntervalRange.max);
  return {
    headY: randomInt(-maxTrail, 0),
    trailLength,
    speed,
    active: true,
    cooldown: 0,
    chars: Array.from({length: trailLength}, () => randomChar(charset)),
    accumulator: randomInt(0, tickInterval),
    tickInterval,
  };
}

export function tickColumn(col: MatrixColumnState, dt: number, density: number, config: MatrixColumnConfig): void {
  const {charset} = config;
  if (!col.active) {
    col.cooldown--;
    if (col.cooldown <= 0) {
      if (Math.random() < density) {
        const restarted = createColumn(config);
        col.headY = restarted.headY;
        col.trailLength = restarted.trailLength;
        col.speed = restarted.speed;
        col.active = true;
        col.chars = restarted.chars;
        col.accumulator = restarted.accumulator;
        col.tickInterval = restarted.tickInterval;
      } else {
        col.cooldown = randomInt(1, 10);
      }
    }

    return;
  }

  col.accumulator += dt;
  if (col.accumulator < col.tickInterval) {
    return;
  }

  col.accumulator -= col.tickInterval;

  for (let i = 0; i < col.speed; i++) {
    col.chars.unshift(randomChar(charset));
  }

  col.chars.length = col.trailLength;
  col.headY += col.speed;

  if (col.headY - col.trailLength > config.maxY) {
    col.active = false;
    col.cooldown = randomInt(1, 30);
  }
}
