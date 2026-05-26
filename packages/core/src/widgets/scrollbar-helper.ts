import type {DrawListBuffer} from '../draw_list/DrawListBuffer';

export type ScrollbarGeometry = {
  thumbSize: number;
  thumbOffset: number;
  scrollableRange: number;
  maxScroll: number;
};

export type ScrollbarHitTest = {
  x: number;
  trackY: number;
  trackHeight: number;
  thumbY: number;
  thumbSize: number;
};

export type ScrollbarHitResult
  = | {type: 'thumb'}
    | {type: 'track-above'}
    | {type: 'track-below'}
    | {type: 'none'};

export function computeScrollbarGeometry(
  viewportSize: number,
  contentSize: number,
  scrollOffset: number,
): ScrollbarGeometry {
  const maxScroll = Math.max(0, contentSize - viewportSize);
  const thumbRatio = viewportSize / contentSize;
  const thumbSize = Math.max(1, Math.round(thumbRatio * viewportSize));
  const scrollableRange = viewportSize - thumbSize;
  const thumbOffset = maxScroll > 0
    ? Math.round((scrollOffset / maxScroll) * scrollableRange)
    : 0;
  return {
    thumbSize, thumbOffset, scrollableRange, maxScroll,
  };
}

export type RenderScrollbarOptions = {
  buffer: DrawListBuffer;
  x: number;
  trackY: number;
  trackHeight: number;
  geometry: ScrollbarGeometry;
  thumbColor: number;
  trackColor: number;
};

export function renderScrollbar(options: RenderScrollbarOptions): void {
  const {buffer, x, trackY, trackHeight, geometry, thumbColor, trackColor} = options;
  const {thumbSize, thumbOffset} = geometry;
  for (let row = 0; row < trackHeight; row++) {
    const isThumb = row >= thumbOffset && row < thumbOffset + thumbSize;
    buffer.drawChar({
      x,
      y: trackY + row,
      char: isThumb ? 0x25_88 : 0x25_02,
      fgRgba: isThumb ? thumbColor : trackColor,
      bgRgba: 0x00_00_00_00,
    });
  }
}

export function scrollbarHitTest(
  mouseX: number,
  mouseY: number,
  hit: ScrollbarHitTest,
): ScrollbarHitResult {
  if (mouseX !== hit.x) {
    return {type: 'none'};
  }

  if (mouseY < hit.trackY || mouseY >= hit.trackY + hit.trackHeight) {
    return {type: 'none'};
  }

  if (mouseY >= hit.thumbY && mouseY < hit.thumbY + hit.thumbSize) {
    return {type: 'thumb'};
  }

  if (mouseY < hit.thumbY) {
    return {type: 'track-above'};
  }

  return {type: 'track-below'};
}

export function computeThumbDragOffset(
  dragDeltaY: number,
  startOffset: number,
  geometry: ScrollbarGeometry,
): number {
  if (geometry.scrollableRange <= 0) {
    return startOffset;
  }

  return startOffset + Math.round((dragDeltaY / geometry.scrollableRange) * geometry.maxScroll);
}
