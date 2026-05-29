import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';

export type PositionStrategy
  = | {type: 'absolute'; x: number; y: number}
    | {type: 'anchor'; anchor: TuiWidgetEntity; placement: 'top' | 'bottom' | 'left' | 'right'; offset?: number; edgeClamp?: boolean}
    | {type: 'center'}
    | {type: 'corner'; corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; margin?: number};

export type ResolvedPosition = {x: number; y: number};

export function resolvePosition(
  strategy: PositionStrategy,
  widgetRect: {width: number; height: number},
  termCols: number,
  termRows: number,
): ResolvedPosition {
  switch (strategy.type) {
    case 'absolute': {
      return resolveAbsolute(strategy, termCols, termRows);
    }

    case 'anchor': {
      return resolveAnchor(strategy, widgetRect, termCols, termRows);
    }

    case 'center': {
      return resolveCenter(widgetRect, termCols, termRows);
    }

    case 'corner': {
      return resolveCorner(strategy, widgetRect, termCols, termRows);
    }
  }
}

function resolveAbsolute(
  strategy: PositionStrategy & {type: 'absolute'},
  termCols: number,
  termRows: number,
): ResolvedPosition {
  return {
    x: clamp(strategy.x, 0, termCols - 1),
    y: clamp(strategy.y, 0, termRows - 1),
  };
}

function resolveAnchor(
  strategy: PositionStrategy & {type: 'anchor'},
  widgetRect: {width: number; height: number},
  termCols: number,
  termRows: number,
): ResolvedPosition {
  const {anchor, placement, offset = 0} = strategy;
  const anchorRect = anchor.rect;
  const w = widgetRect.width;
  const h = widgetRect.height;

  let placement_ = placement;
  const effectiveOffset = offset;
  if (strategy.edgeClamp) {
    placement_ = flipPlacement({
      placement,
      anchorRect,
      widgetWidth: w,
      widgetHeight: h,
      offset: effectiveOffset,
      termCols,
      termRows,
    });
  }

  let x: number;
  let y: number;

  switch (placement_) {
    case 'bottom': {
      x = anchorRect.x;
      y = anchorRect.y + anchorRect.height + offset;
      break;
    }

    case 'top': {
      x = anchorRect.x;
      y = anchorRect.y - h - offset;
      break;
    }

    case 'right': {
      x = anchorRect.x + anchorRect.width + offset;
      y = anchorRect.y;
      break;
    }

    case 'left': {
      x = anchorRect.x - w - offset;
      y = anchorRect.y;
      break;
    }
  }

  return {
    x: clamp(x, 0, Math.max(0, termCols - w)),
    y: clamp(y, 0, Math.max(0, termRows - h)),
  };
}

function resolveCenter(
  widgetRect: {width: number; height: number},
  termCols: number,
  termRows: number,
): ResolvedPosition {
  return {
    x: Math.max(0, Math.floor((termCols - widgetRect.width) / 2)),
    y: Math.max(0, Math.floor((termRows - widgetRect.height) / 2)),
  };
}

function resolveCorner(
  strategy: PositionStrategy & {type: 'corner'},
  widgetRect: {width: number; height: number},
  termCols: number,
  termRows: number,
): ResolvedPosition {
  const margin = strategy.margin ?? 0;
  const {width: w, height: h} = widgetRect;

  switch (strategy.corner) {
    case 'top-left': {
      return {x: margin, y: margin};
    }

    case 'top-right': {
      return {x: Math.max(0, termCols - w - margin), y: margin};
    }

    case 'bottom-left': {
      return {x: margin, y: Math.max(0, termRows - h - margin)};
    }

    case 'bottom-right': {
      return {x: Math.max(0, termCols - w - margin), y: Math.max(0, termRows - h - margin)};
    }
  }
}

type FlipPlacementOptions = {
  placement: 'top' | 'bottom' | 'left' | 'right';
  anchorRect: {x: number; y: number; width: number; height: number};
  widgetWidth: number;
  widgetHeight: number;
  offset: number;
  termCols: number;
  termRows: number;
};

function flipPlacement(options: FlipPlacementOptions): 'top' | 'bottom' | 'left' | 'right' {
  const {placement, anchorRect, widgetWidth: w, widgetHeight: h, offset, termCols, termRows} = options;
  switch (placement) {
    case 'bottom': {
      const spaceBelow = termRows - anchorRect.y - anchorRect.height - offset;
      const spaceAbove = anchorRect.y - offset;
      if (spaceBelow < h && spaceAbove >= h) {
        return 'top';
      }

      break;
    }

    case 'top': {
      const spaceAbove = anchorRect.y - offset;
      const spaceBelow = termRows - anchorRect.y - anchorRect.height - offset;
      if (spaceAbove < h && spaceBelow >= h) {
        return 'bottom';
      }

      break;
    }

    case 'right': {
      const spaceRight = termCols - anchorRect.x - anchorRect.width - offset;
      const spaceLeft = anchorRect.x - offset;
      if (spaceRight < w && spaceLeft >= w) {
        return 'left';
      }

      break;
    }

    case 'left': {
      const spaceLeft = anchorRect.x - offset;
      const spaceRight = termCols - anchorRect.x - anchorRect.width - offset;
      if (spaceLeft < w && spaceRight >= w) {
        return 'right';
      }

      break;
    }
  }

  return placement;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
