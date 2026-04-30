import type {MatrixSpeedRange} from './types';

export type MatrixColumnState = {
  /** Current head Y position (0-based, grows downward) */
  headY: number;
  /** Trail length for this column */
  trailLength: number;
  /** Speed: cells to advance per frame */
  speed: number;
  /** Whether this column is active (visible) */
  active: boolean;
  /** Cooldown frames before this column reactivates */
  cooldown: number;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createColumn(maxY: number, speedRange: MatrixSpeedRange, minTrail: number, maxTrail: number): MatrixColumnState {
  const speed = randomInt(speedRange.min, speedRange.max);
  const trailLength = randomInt(minTrail, maxTrail);
  return {
    headY: randomInt(-maxTrail, 0), // Start above screen for staggered entry
    trailLength,
    speed,
    active: true,
    cooldown: 0,
  };
}

export function tickColumn(
  col: MatrixColumnState,
  maxY: number,
  speedRange: MatrixSpeedRange,
  minTrail: number,
  maxTrail: number,
  density: number,
): void {
  if (!col.active) {
    col.cooldown--;
    if (col.cooldown <= 0) {
      if (Math.random() < density) {
        const restarted = createColumn(maxY, speedRange, minTrail, maxTrail);
        col.headY = restarted.headY;
        col.trailLength = restarted.trailLength;
        col.speed = restarted.speed;
        col.active = true;
      } else {
        col.cooldown = randomInt(1, 10);
      }
    }

    return;
  }

  col.headY += col.speed;

  // If the tail has fully exited the screen, deactivate
  if (col.headY - col.trailLength > maxY) {
    col.active = false;
    col.cooldown = randomInt(1, 30);
  }
}
