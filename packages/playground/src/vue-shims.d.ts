declare module '*.vue' {
  export function setup(scene: unknown): void;
}

type TuiTextProps = {
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
  colorFg?: number;
  colorBg?: number;
  borderColor?: number;
  borderStyle?: number;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  styleZIndex?: number;
  text?: string;
};

type TuiFrameRateWatcherProps = Record<string, never>;

declare global {
  namespace JSX {
    type IntrinsicElements = {
      Text: TuiTextProps;
      FrameRateWatcher: TuiFrameRateWatcherProps;
    };
  }
}
