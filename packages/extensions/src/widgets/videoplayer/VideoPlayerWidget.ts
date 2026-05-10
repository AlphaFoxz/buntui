import {
  type DrawListBuffer,
  type KeyboardEvent,
  type TuiWidgetRect,
  extractPercentSpec,
  isPercent,
  widgets,
} from '@buntui/core';
import {encodeBrailleFrame, isVideoFile} from './braille';
import {DEFAULT_VIDEOPLAYER_COLOR_SCHEME, DEFAULT_VIDEOPLAYER_OPTIONS} from './defaults';
import type {VideoPlayerColorScheme, VideoPlayerState, VideoPlayerWidgetOptions} from './types';

export class VideoPlayerWidget extends widgets.InteractiveWidget {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #src?: string;
  readonly #colorScheme: VideoPlayerColorScheme;
  readonly #loop: boolean;
  readonly #threshold: number;
  readonly #invert: boolean;
  readonly #targetFps: number;
  #audioSrc: string | undefined;
  #audioTempFile: string | undefined;

  #frameData: Uint8Array | undefined;
  #frameCols = 0;
  #frameRows = 0;
  #frameCount = 0;
  #fps = 30;
  #frameInterval = 33;

  #playerState: VideoPlayerState = 'loading';
  #currentFrame = 0;
  #lastTick = 0;
  #loadingProgress = '';

  #audioProcess: ReturnType<typeof Bun.spawn> | undefined;
  #ffmpegProcess: ReturnType<typeof Bun.spawn> | undefined;
  #loading = false;

  get #frameOffsetMs(): number {
    return (this.#currentFrame / this.#fps) * 1000;
  }

  constructor(options: VideoPlayerWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_VIDEOPLAYER_OPTIONS, ...options};
    const spec = extractPercentSpec(resolved.x, resolved.y, resolved.width, resolved.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#x = isPercent(resolved.x) ? 0 : (typeof resolved.x === 'number' ? resolved.x : 0);
    this.#y = isPercent(resolved.y) ? 0 : (typeof resolved.y === 'number' ? resolved.y : 0);
    this.#width = isPercent(resolved.width) ? 0 : (typeof resolved.width === 'number' ? resolved.width : 0);
    this.#height = isPercent(resolved.height) ? 0 : (typeof resolved.height === 'number' ? resolved.height : 0);

    const schemeOverride = resolved.colorScheme ?? {};
    this.#colorScheme = {
      dotRgba: schemeOverride.dotRgba ?? DEFAULT_VIDEOPLAYER_COLOR_SCHEME.dotRgba,
      bgRgba: schemeOverride.bgRgba ?? DEFAULT_VIDEOPLAYER_COLOR_SCHEME.bgRgba,
      textRgba: schemeOverride.textRgba ?? DEFAULT_VIDEOPLAYER_COLOR_SCHEME.textRgba,
    };

    this.#src = resolved.src;
    this.#loop = resolved.loop ?? false;
    this.#threshold = resolved.threshold ?? 128;
    this.#invert = resolved.invert ?? false;
    this.#targetFps = resolved.fps ?? 30;

    if (resolved.audioSrc) {
      this.#audioSrc = resolved.audioSrc;
    } else if (resolved.src && isVideoFile(resolved.src)) {
      this.#audioSrc = resolved.src;
    } else if (resolved.src) {
      this.#audioSrc = resolved.src.replace(/\.bin$/v, '.mp3');
    } else {
      this.#audioSrc = undefined;
    }

    if (resolved.data) {
      this.#parseBinData(resolved.data);
    } else if (!resolved.src) {
      this.#playerState = 'error';
    }
  }

  override mounted(): void {
    super.mounted();
  }

  override unmounted(): void {
    this.#stopAudio();
    this.#killFfmpeg();
    this.#cleanupTempAudio();
    super.unmounted();
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

  handleKey(event: KeyboardEvent): void {
    const {key} = event;
    if (!key) {
      return;
    }

    if (key === ' ') {
      switch (this.#playerState) {
        case 'ready':
        case 'ended': {
          if (this.#playerState === 'ended') {
            this.#currentFrame = 0;
          }

          this.#playerState = 'playing';
          this.#lastTick = Date.now();
          this.#startAudio(0);

          break;
        }

        case 'playing': {
          this.#playerState = 'paused';
          this.#stopAudio();

          break;
        }

        case 'paused': {
          this.#startAudio(this.#frameOffsetMs);
          this.#playerState = 'playing';
          // Offset lastTick forward to compensate for ffplay startup latency
          this.#lastTick = Date.now() + 150;

          break;
        }

        case 'loading':
        case 'error': {
          break;
        }
      }
    } else if (key === 'r' || key === 'R') {
      this.#currentFrame = 0;
      this.#stopAudio();
      this.#playerState = 'ready';
    }
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const w = this.#width;
    const h = this.#height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const absX = this.#x;
    const absY = this.#y;
    const {bgRgba} = this.#colorScheme;

    buffer.pushClip(absX, absY, w, h);
    buffer.drawRect({
      x: absX, y: absY, width: w, height: h, bgRgba,
    });

    if (this.#playerState === 'loading') {
      if (!this.#loading && this.#src && !this.#frameData) {
        this.#loading = true;
        this.#load().catch(() => {
          this.#playerState = 'error';
        });
      }

      const message = this.#loadingProgress || (this.#src ? `Loading: ${this.#src}` : 'Loading...');
      this.#drawOverlay(buffer, absX, absY, w, h, message);
      buffer.popClip();
      return;
    }

    if (this.#playerState === 'error') {
      const message = this.#src ? `Error: ${this.#src}` : 'No src or data provided';
      this.#drawOverlay(buffer, absX, absY, w, h, message);
      buffer.popClip();
      return;
    }

    // Advance frame
    if (this.#playerState === 'playing' && this.#frameData) {
      const now = Date.now();
      if (now - this.#lastTick >= this.#frameInterval) {
        this.#lastTick = now;
        this.#currentFrame++;
        if (this.#currentFrame >= this.#frameCount) {
          if (this.#loop) {
            this.#currentFrame = 0;
            this.#startAudio(0);
          } else {
            this.#currentFrame = this.#frameCount - 1;
            this.#playerState = 'ended';
            this.#stopAudio();
          }
        }
      }
    }

    // Render current frame — batch by row to stay within DrawListBuffer limits
    if (this.#frameData && this.#frameCols > 0 && this.#frameRows > 0) {
      const offsetX = Math.max(0, Math.floor((w - this.#frameCols) / 2));
      const offsetY = Math.max(0, Math.floor((h - this.#frameRows) / 2));
      const rowSize = this.#frameCols;
      const frameStart = this.#currentFrame * (rowSize * this.#frameRows);
      const {dotRgba} = this.#colorScheme;

      for (let row = 0; row < this.#frameRows; row++) {
        const renderY = absY + offsetY + row;
        if (renderY < absY || renderY >= absY + h) {
          continue;
        }

        let rowText = '';
        for (let col = 0; col < this.#frameCols; col++) {
          const index = frameStart + (row * rowSize) + col;
          const brailleByte = this.#frameData[index]!;
          rowText += brailleByte === 0 ? ' ' : String.fromCodePoint(0x28_00 + brailleByte);
        }

        buffer.drawText({
          x: absX + offsetX,
          y: renderY,
          text: rowText,
          fgRgba: dotRgba,
          bgRgba,
        });
      }
    }

    // State overlay
    switch (this.#playerState) {
      case 'ready': {
        const hint = this.#audioSrc ? 'SPACE to play (with audio)' : 'SPACE to play';
        this.#drawOverlay(buffer, absX, absY, w, h, hint);
        break;
      }

      case 'paused': {
        this.#drawOverlay(buffer, absX, absY, w, h, 'PAUSED');
        break;
      }

      case 'ended': {
        this.#drawOverlay(buffer, absX, absY, w, h, 'END  SPACE=replay  R=reset');
        break;
      }

      case 'playing': {
        break;
      }
    }

    // Progress bar at bottom
    if (this.#frameCount > 0 && h > 2) {
      const progress = (this.#currentFrame + 1) / this.#frameCount;
      const barWidth = Math.max(1, Math.floor(w * progress));
      buffer.drawRect({
        x: absX, y: absY + h - 1, width: barWidth, height: 1, bgRgba: this.#colorScheme.textRgba,
      });
    }

    buffer.popClip();
  }

  #drawOverlay(
    buffer: DrawListBuffer,
    absX: number,
    absY: number,
    w: number,
    h: number,
    text: string,
  ): void {
    buffer.drawText({
      x: absX + Math.max(0, Math.floor((w - text.length) / 2)),
      y: absY + Math.floor(h / 2),
      text,
      fgRgba: this.#colorScheme.textRgba,
      bgRgba: this.#colorScheme.bgRgba,
    });
  }

  #parseBinData(raw: Uint8Array): void {
    if (raw.length < 12 || raw[0] !== 0xBA || raw[1] !== 0xAD || raw[2] !== 0x01) {
      this.#playerState = 'error';
      return;
    }

    this.#fps = raw[3]!;
    this.#frameCols = raw[4]! | (raw[5]! << 8);
    this.#frameRows = raw[6]! | (raw[7]! << 8);
    const frameArea = this.#frameCols * this.#frameRows;
    this.#frameCount = raw[8]! | (raw[9]! << 8) | (raw[10]! << 16) | (raw[11]! << 24);
    this.#frameInterval = Math.floor(1000 / this.#fps);

    const expectedSize = 12 + (this.#frameCount * frameArea);
    if (raw.length < expectedSize) {
      this.#playerState = 'error';
      return;
    }

    this.#frameData = raw.slice(12, expectedSize);
    this.#playerState = 'ready';
  }

  async #load(): Promise<void> {
    const src = this.#src!;
    if (src.endsWith('.bin')) {
      await this.#loadFromBinFile(src);
    } else if (isVideoFile(src)) {
      await this.#loadFromVideo(src);
    } else {
      this.#playerState = 'error';
    }
  }

  async #loadFromBinFile(path: string): Promise<void> {
    try {
      const file = Bun.file(path);
      const buffer = await file.arrayBuffer();
      this.#parseBinData(new Uint8Array(buffer));
    } catch {
      this.#playerState = 'error';
    }
  }

  async #loadFromVideo(path: string): Promise<void> {
    const cols = Math.max(1, this.#width);
    const rows = Math.max(1, this.#height);
    const pixelW = cols * 2;
    const pixelH = rows * 4;
    const rawFrameSize = pixelW * pixelH;

    this.#fps = this.#targetFps;
    this.#frameInterval = Math.floor(1000 / this.#fps);
    this.#loadingProgress = 'Decoding 0 frames...';

    try {
      const proc = Bun.spawn([
        'ffmpeg',
        '-i',
        path,
        '-vf',
        `scale=${pixelW}:${pixelH}`,
        '-pix_fmt',
        'gray',
        '-r',
        String(this.#fps),
        '-f',
        'rawvideo',
        '-v',
        'quiet',
        'pipe:1',
      ], {
        stdout: 'pipe',
        stderr: 'ignore',
      });

      this.#ffmpegProcess = proc;

      const chunks: Uint8Array[] = [];
      let frameCount = 0;
      const reader = proc.stdout.getReader();
      let leftover = new Uint8Array(0);

      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const {done, value} = await reader.read();
        if (done) {
          break;
        }

        const merged = new Uint8Array(leftover.length + value.length);
        merged.set(leftover);
        merged.set(value, leftover.length);

        let offset = 0;
        while (offset + rawFrameSize <= merged.length) {
          const rawFrame = merged.slice(offset, offset + rawFrameSize);
          chunks.push(encodeBrailleFrame(rawFrame, cols, rows, this.#threshold, this.#invert));
          frameCount++;
          offset += rawFrameSize;

          if (frameCount % 100 === 0) {
            this.#loadingProgress = `Decoding ${frameCount} frames...`;
          }
        }

        leftover = merged.slice(offset);
      }

      this.#ffmpegProcess = undefined;
      const exitCode = await proc.exited;
      if (exitCode !== 0 && frameCount === 0) {
        this.#playerState = 'error';
        return;
      }

      // Assemble frame data
      const frameArea = cols * rows;
      this.#frameCols = cols;
      this.#frameRows = rows;
      this.#frameCount = frameCount;
      this.#frameData = new Uint8Array(frameCount * frameArea);
      let writeOffset = 0;
      for (const chunk of chunks) {
        this.#frameData.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }

      // Extract audio to temp WAV for byte-accurate seeking
      try {
        const temporaryAudio = `${path}.buntui-audio.wav`;
        const audioProc = Bun.spawn([
          'ffmpeg',
          '-i',
          path,
          '-vn',
          '-f',
          'wav',
          '-y',
          temporaryAudio,
        ], {
          stdout: 'ignore',
          stderr: 'ignore',
        });
        const audioExit = await audioProc.exited;
        if (audioExit === 0) {
          this.#audioSrc = temporaryAudio;
          this.#audioTempFile = temporaryAudio;
        }
      } catch {
        // Audio extraction failed, keep original source
      }

      this.#loadingProgress = '';
      this.#playerState = 'ready';
    } catch {
      this.#playerState = 'error';
    }
  }

  #killFfmpeg(): void {
    if (this.#ffmpegProcess) {
      try {
        this.#ffmpegProcess.kill();
      } catch {
        // Process may have already exited
      }

      this.#ffmpegProcess = undefined;
    }
  }

  #cleanupTempAudio(): void {
    if (this.#audioTempFile) {
      try {
        void Bun.file(this.#audioTempFile).unlink();
      } catch {
        // File may already be gone
      }

      this.#audioTempFile = undefined;
    }
  }

  #startAudio(offsetMs: number): void {
    if (!this.#audioSrc) {
      return;
    }

    this.#stopAudio();

    const args = ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet'];
    if (offsetMs > 0) {
      args.push('-ss', String(offsetMs / 1000));
    }

    args.push(this.#audioSrc);

    try {
      this.#audioProcess = Bun.spawn(args, {
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'ignore',
      });
    } catch {
      // Ffplay not available, skip audio
    }
  }

  #stopAudio(): void {
    if (this.#audioProcess) {
      try {
        this.#audioProcess.kill();
      } catch {
        // Process may have already exited
      }

      this.#audioProcess = undefined;
    }
  }
}

export function createVideoPlayerWidget(options?: VideoPlayerWidgetOptions): VideoPlayerWidget {
  return new VideoPlayerWidget(options);
}

export default VideoPlayerWidget;
