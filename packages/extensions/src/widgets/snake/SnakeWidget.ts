import {
  type DrawListBuffer,
  type TuiWidgetRect,
  type KeyboardEvent,
  rgbToRgba,
  widgets,
} from '@buntui/core';
import {DEFAULT_SNAKE_COLOR_SCHEME, DEFAULT_SNAKE_OPTIONS} from './defaults';
import type {
  SnakeColorScheme, SnakeDirection, SnakeGameState, SnakePoint, SnakeWidgetOptions,
} from './types';

const CHAR_HEAD = 0x00_40; // '@'
const CHAR_BODY = 0x25_88; // '█'
const CHAR_FOOD = 0x26_05; // '★'

const MIN_TICK_INTERVAL = 50;

const OPPOSITE: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export class SnakeWidget extends widgets.InteractiveWidget {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #colorScheme: SnakeColorScheme;
  #tickInterval: number;
  readonly #initialSpeed: number;
  readonly #speedIncrement: number;

  #accumulator = 0;
  #state: SnakeGameState = 'idle';
  #direction: SnakeDirection = 'right';
  #nextDirection: SnakeDirection = 'right';
  #snake: SnakePoint[] = [];
  #food: SnakePoint = {x: 0, y: 0};
  #score = 0;
  #highScore = 0;
  #initialized = false;

  constructor(options: SnakeWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_SNAKE_OPTIONS, ...options};
    const rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#x = rect.x;
    this.#y = rect.y;
    this.#width = rect.width;
    this.#height = rect.height;

    const schemeOverride = resolved.colorScheme ?? {};
    this.#colorScheme = {
      headRgba: schemeOverride.headRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.headRgba,
      bodyRgba: schemeOverride.bodyRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.bodyRgba,
      foodRgba: schemeOverride.foodRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.foodRgba,
      borderRgba: schemeOverride.borderRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.borderRgba,
      bgRgba: schemeOverride.bgRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.bgRgba,
      textRgba: schemeOverride.textRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.textRgba,
      scoreTextRgba: schemeOverride.scoreTextRgba ?? DEFAULT_SNAKE_COLOR_SCHEME.scoreTextRgba,
    };

    this.#tickInterval = resolved.tickInterval ?? 150;
    this.#initialSpeed = this.#tickInterval;
    this.#speedIncrement = resolved.speedIncrement ?? 5;
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.x !== undefined) {
      this.#x = rect.x;
    }

    if (rect.y !== undefined) {
      this.#y = rect.y;
    }

    if (rect.width !== undefined) {
      this.#width = rect.width;
    }

    if (rect.height !== undefined) {
      this.#height = rect.height;
    }
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#x
      && x < this.#x + this.#width
      && y >= this.#y
      && y < this.#y + this.#height;
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#x, y: this.#y, width: this.#width, height: this.#height,
    };
  }

  override handleActiveKey(event: KeyboardEvent): void {
    const key = event.key!;

    if (this.#state === 'idle') {
      if (key === ' ') {
        this.#startGame();
      }

      return;
    }

    if (this.#state === 'playing') {
      if (key === 'Escape') {
        this.#resetToIdle();
        return;
      }

      this.#handleDirection(key);
      return;
    }

    if (key === ' ') {
      this.#startGame();
    } else if (key === 'Escape') {
      this.#resetToIdle();
    }
  }

  override update(dt: number): void {
    if (this.#state !== 'playing') {
      return;
    }

    this.#accumulator += dt;
    if (this.#accumulator >= this.#tickInterval) {
      this.#accumulator -= this.#tickInterval;
      this.#direction = this.#nextDirection;
      this.#tick(this.#width - 2, this.#height - 2);
    }
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const w = this.#width;
    const h = this.#height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const gridW = w - 2;
    const gridH = h - 2;
    if (gridW < 2 || gridH < 2) {
      buffer.pushClip(this.#x, this.#y, w, h);
      buffer.drawText({
        x: this.#x,
        y: this.#y,
        text: 'Too small',
        fgRgba: this.#colorScheme.textRgba,
        bgRgba: this.#colorScheme.bgRgba,
      });
      buffer.popClip();
      return;
    }

    this.#ensureInitialized(gridW, gridH);

    const absX = this.#x;
    const absY = this.#y;

    buffer.pushClip(absX, absY, w, h);

    // Background
    buffer.drawRect({
      x: absX, y: absY, width: w, height: h, bgRgba: this.#colorScheme.bgRgba,
    });

    // Border
    buffer.drawBorder({
      x: absX,
      y: absY,
      width: w,
      height: h,
      colorRgba: this.#colorScheme.borderRgba,
      style: 1,
      sides: 0b1111,
    });

    // Snake body (tail to head so head draws on top)
    const {bgRgba} = this.#colorScheme;
    for (let i = this.#snake.length - 1; i >= 0; i--) {
      const seg = this.#snake[i]!;
      const isHead = i === 0;
      buffer.drawChar({
        x: absX + 1 + seg.x,
        y: absY + 1 + seg.y,
        char: isHead ? CHAR_HEAD : CHAR_BODY,
        fgRgba: isHead ? this.#colorScheme.headRgba : this.#colorScheme.bodyRgba,
        bgRgba,
      });
    }

    // Food
    if (this.#state !== 'idle') {
      buffer.drawChar({
        x: absX + 1 + this.#food.x,
        y: absY + 1 + this.#food.y,
        char: CHAR_FOOD,
        fgRgba: this.#colorScheme.foodRgba,
        bgRgba,
      });
    }

    // Score (on top border row)
    const scoreText = ` Score: ${this.#score} `;
    buffer.drawText({
      x: absX + 1,
      y: absY,
      text: scoreText,
      fgRgba: this.#colorScheme.scoreTextRgba,
      bgRgba: this.#colorScheme.borderRgba,
    });

    // High score
    if (this.#highScore > 0) {
      const hiText = `Hi: ${this.#highScore} `;
      const hiX = absX + w - 1 - hiText.length;
      if (hiX > absX + scoreText.length) {
        buffer.drawText({
          x: hiX,
          y: absY,
          text: hiText,
          fgRgba: this.#colorScheme.textRgba,
          bgRgba: this.#colorScheme.borderRgba,
        });
      }
    }

    // State messages
    const midY = absY + 1 + Math.floor(gridH / 2);
    if (this.#state === 'idle') {
      const message = 'Press SPACE to start';
      buffer.drawText({
        x: absX + 1 + Math.floor((gridW - message.length) / 2),
        y: midY,
        text: message,
        fgRgba: this.#colorScheme.textRgba,
        bgRgba,
      });
      const hint = 'Arrow keys to move';
      buffer.drawText({
        x: absX + 1 + Math.floor((gridW - hint.length) / 2),
        y: midY + 1,
        text: hint,
        fgRgba: rgbToRgba(0x88, 0x88, 0x88),
        bgRgba,
      });
    } else if (this.#state === 'gameover') {
      const message = 'GAME OVER';
      buffer.drawText({
        x: absX + 1 + Math.floor((gridW - message.length) / 2),
        y: midY - 1,
        text: message,
        fgRgba: rgbToRgba(0xFF, 0x00, 0x00),
        bgRgba,
      });
      const scoreMessage = `Final Score: ${this.#score}`;
      buffer.drawText({
        x: absX + 1 + Math.floor((gridW - scoreMessage.length) / 2),
        y: midY,
        text: scoreMessage,
        fgRgba: this.#colorScheme.scoreTextRgba,
        bgRgba,
      });
      const restart = 'SPACE to restart / ESC to menu';
      buffer.drawText({
        x: absX + 1 + Math.floor((gridW - restart.length) / 2),
        y: midY + 1,
        text: restart,
        fgRgba: rgbToRgba(0x88, 0x88, 0x88),
        bgRgba,
      });
    }

    buffer.popClip();
  }

  #handleDirection(key: string): void {
    let dir: SnakeDirection | undefined;
    switch (key) {
      case 'ArrowUp': {
        dir = 'up';
        break;
      }

      case 'ArrowDown': {
        dir = 'down';
        break;
      }

      case 'ArrowLeft': {
        dir = 'left';
        break;
      }

      case 'ArrowRight': {
        dir = 'right';
        break;
      }

      default: {
        return;
      }
    }

    if (dir !== OPPOSITE[this.#direction]) {
      this.#nextDirection = dir;
    }
  }

  #ensureInitialized(gridW: number, gridH: number): void {
    if (this.#initialized) {
      return;
    }

    this.#initialized = true;

    const startX = Math.floor(gridW / 2);
    const startY = Math.floor(gridH / 2);
    this.#snake = [
      {x: startX, y: startY},
      {x: startX - 1, y: startY},
      {x: startX - 2, y: startY},
    ];
    this.#spawnFood(gridW, gridH);
  }

  #startGame(): void {
    const gridW = this.#width - 2;
    const gridH = this.#height - 2;
    const startX = Math.floor(gridW / 2);
    const startY = Math.floor(gridH / 2);

    this.#snake = [
      {x: startX, y: startY},
      {x: startX - 1, y: startY},
      {x: startX - 2, y: startY},
    ];
    this.#direction = 'right';
    this.#nextDirection = 'right';
    this.#score = 0;
    this.#tickInterval = this.#initialSpeed;
    this.#state = 'playing';
    this.#accumulator = 0;
    this.#spawnFood(gridW, gridH);
  }

  #resetToIdle(): void {
    this.#state = 'idle';
    this.#score = 0;
    this.#snake = [];
    this.#initialized = false;
  }

  #tick(gridW: number, gridH: number): void {
    const head = this.#snake[0]!;
    let newX = head.x;
    let newY = head.y;

    switch (this.#direction) {
      case 'up': {
        newY--;
        break;
      }

      case 'down': {
        newY++;
        break;
      }

      case 'left': {
        newX--;
        break;
      }

      case 'right': {
        newX++;
        break;
      }
    }

    // Wall collision
    if (newX < 0 || newX >= gridW || newY < 0 || newY >= gridH) {
      this.#endGame();
      return;
    }

    // Self collision
    for (const seg of this.#snake) {
      if (seg.x === newX && seg.y === newY) {
        this.#endGame();
        return;
      }
    }

    // Move
    this.#snake.unshift({x: newX, y: newY});

    // Food check
    if (newX === this.#food.x && newY === this.#food.y) {
      this.#score++;
      this.#tickInterval = Math.max(MIN_TICK_INTERVAL, this.#tickInterval - this.#speedIncrement);
      this.#spawnFood(gridW, gridH);
    } else {
      this.#snake.pop();
    }
  }

  #endGame(): void {
    this.#state = 'gameover';
    if (this.#score > this.#highScore) {
      this.#highScore = this.#score;
    }
  }

  #spawnFood(gridW: number, gridH: number): void {
    const snakeSet = new Set(this.#snake.map(p => `${p.x},${p.y}`));
    let attempts = 0;
    while (attempts < 1000) {
      const fx = Math.floor(Math.random() * gridW);
      const fy = Math.floor(Math.random() * gridH);
      if (!snakeSet.has(`${fx},${fy}`)) {
        this.#food = {x: fx, y: fy};
        return;
      }

      attempts++;
    }

    // Fallback: just pick any position
    this.#food = {x: 0, y: 0};
  }
}

export function createSnakeWidget(options?: SnakeWidgetOptions): SnakeWidget {
  return new SnakeWidget(options);
}

export default SnakeWidget;
