import {
  TuiLayoutAlignment as LayoutAlignmentEnum,
  type TuiLayoutAlignment,
  type TuiLayoutDirection,
  type TuiJustifyContent,
  type TuiFlexWrap,
  type TuiAlignContent,
} from './types';
import type {TuiWidgetEntity} from './TuiWidgetEntity';

export type FlexLayoutConfig = {
  readonly children: readonly TuiWidgetEntity[];
  readonly direction: TuiLayoutDirection;
  readonly align: TuiLayoutAlignment;
  readonly justifyContent: TuiJustifyContent;
  readonly gap: number;
  readonly mainSize: number;
  readonly crossSize: number;
  readonly flexWrap?: TuiFlexWrap;
  readonly alignContent?: TuiAlignContent;
};

export type FlexLayoutResult = {
  readonly mainPos: number;
  readonly mainExtent: number;
  readonly crossPos: number;
  readonly crossExtent: number;
};

function resolveChildExtent(child: TuiWidgetEntity, isVertical: boolean): number {
  const intrinsic = child.intrinsicSize();
  if (isVertical) {
    return intrinsic?.height ?? child.rect.height;
  }

  return intrinsic?.width ?? child.rect.width;
}

export function resolveFlexBasis(child: TuiWidgetEntity, isVertical: boolean, mainSize: number): number {
  const basis = child.flexBasis;
  if (basis !== undefined) {
    if (typeof basis === 'number') {
      return Math.max(0, Math.floor(basis));
    }

    const pct = Number.parseFloat(basis);
    return Math.max(0, Math.floor(pct / 100 * mainSize));
  }

  if (isVertical ? child.hasExplicitHeight : child.hasExplicitWidth) {
    return Math.max(0, isVertical ? child.rect.height : child.rect.width);
  }

  return resolveChildExtent(child, isVertical);
}

function resolveChildCrossExtent(child: TuiWidgetEntity, isVertical: boolean): number {
  if (isVertical ? child.hasExplicitWidth : child.hasExplicitHeight) {
    return isVertical ? child.rect.width : child.rect.height;
  }

  const intrinsic = child.intrinsicSize();
  return isVertical ? intrinsic?.width ?? child.rect.width : intrinsic?.height ?? child.rect.height;
}

function resolveCrossAxis(
  child: TuiWidgetEntity,
  align: TuiLayoutAlignment,
  crossSize: number,
  isVertical: boolean,
): {crossPos: number; crossExtent: number} {
  const effectiveAlign = child.alignSelf ?? align;
  let crossExtent = resolveChildCrossExtent(child, isVertical);

  let crossPos: number;
  switch (effectiveAlign) {
    case LayoutAlignmentEnum.Start: {
      crossPos = 0;
      break;
    }

    case LayoutAlignmentEnum.Center: {
      crossPos = Math.floor((crossSize - crossExtent) / 2);
      break;
    }

    case LayoutAlignmentEnum.End: {
      crossPos = crossSize - crossExtent;
      break;
    }

    case LayoutAlignmentEnum.Stretch: {
      crossPos = 0;
      const explicit = isVertical ? child.hasExplicitWidth : child.hasExplicitHeight;
      if (!explicit) {
        crossExtent = crossSize;
      }

      break;
    }

    default: {
      assertNever(effectiveAlign);
    }
  }

  return {crossPos, crossExtent};
}

/**
 Generic free-space distribution. Works for both justifyContent (main axis)
 and alignContent (cross axis) since they share the same numeric enum values.
 */
function computeSpaceDistribution(mode: number, freeSpace: number, count: number): {startOffset: number; extraGap: number} {
  if (freeSpace <= 0 || count === 0) {
    return {startOffset: 0, extraGap: 0};
  }

  switch (mode) {
    case 0: {
      return {startOffset: 0, extraGap: 0};
    }

    case 1: {
      return {startOffset: Math.floor(freeSpace / 2), extraGap: 0};
    }

    case 2: {
      return {startOffset: freeSpace, extraGap: 0};
    }

    case 3: {
      return count > 1
        ? {startOffset: 0, extraGap: Math.floor(freeSpace / (count - 1))}
        : {startOffset: 0, extraGap: 0};
    }

    case 4: {
      const perChild = Math.floor(freeSpace / count);
      return {startOffset: Math.floor(perChild / 2), extraGap: perChild};
    }

    case 5: {
      const gap = Math.floor(freeSpace / (count + 1));
      return {startOffset: gap, extraGap: gap};
    }

    default: {
      return {startOffset: 0, extraGap: 0};
    }
  }
}

function distributeFlexGrow(
  children: readonly TuiWidgetEntity[],
  baseSizes: readonly number[],
  finalSizes: number[],
  freeSpace: number,
): number {
  let totalGrow = 0;
  for (const child of children) {
    totalGrow += child.flexGrow;
  }

  if (totalGrow <= 0) {
    return 0;
  }

  let absorbed = 0;
  for (const [i, child] of children.entries()) {
    const grow = child.flexGrow;
    if (grow > 0) {
      const share = Math.floor((grow / totalGrow) * freeSpace);
      finalSizes[i] = baseSizes[i]! + share;
      absorbed += share;
    }
  }

  const remainder = freeSpace - absorbed;
  if (remainder > 0) {
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i]!.flexGrow > 0) {
        finalSizes[i]! += remainder;
        break;
      }
    }

    absorbed += remainder;
  }

  return absorbed;
}

function distributeFlexShrink(
  children: readonly TuiWidgetEntity[],
  baseSizes: readonly number[],
  finalSizes: number[],
  overflow: number,
): number {
  let totalShrink = 0;
  for (const child of children) {
    totalShrink += child.flexShrink;
  }

  if (totalShrink <= 0) {
    return 0;
  }

  let removed = 0;
  for (const [i, child] of children.entries()) {
    const shrink = child.flexShrink;
    if (shrink > 0) {
      const deduction = Math.min(baseSizes[i]!, Math.floor((shrink / totalShrink) * overflow));
      finalSizes[i] = baseSizes[i]! - deduction;
      removed += deduction;
    }
  }

  const remainder = overflow - removed;
  if (remainder > 0) {
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i]!.flexShrink > 0 && finalSizes[i]! > 0) {
        const extra = Math.min(finalSizes[i]!, remainder);
        finalSizes[i]! -= extra;
        removed += extra;
        break;
      }
    }
  }

  return removed;
}

type SingleLineConfig = {
  readonly children: readonly TuiWidgetEntity[];
  readonly baseSizes: readonly number[];
  readonly direction: TuiLayoutDirection;
  readonly align: TuiLayoutAlignment;
  readonly justifyContent: TuiJustifyContent;
  readonly gap: number;
  readonly mainSize: number;
  readonly crossSize: number;
};

/**
 Core single-line flex layout. Takes pre-computed baseSizes (measure already done).
 Returns results with mainPos/crossPos relative to the line origin (0,0).
 */
function layoutSingleLine(config: SingleLineConfig): FlexLayoutResult[] {
  const {children, baseSizes, direction, align, justifyContent, gap, mainSize, crossSize} = config;
  const count = children.length;
  if (count === 0) {
    return [];
  }

  const isVertical = direction === 1 || direction === 3;
  const isReverse = direction === 2 || direction === 3;

  const totalGap = (count - 1) * gap;
  const totalBase = baseSizes.reduce((sum, s) => sum + s, 0);
  let freeSpace = mainSize - totalBase - totalGap;

  const finalSizes = [...baseSizes];
  if (freeSpace > 0) {
    const absorbed = distributeFlexGrow(children, baseSizes, finalSizes, freeSpace);
    if (absorbed > 0) {
      freeSpace = 0;
    }
  }

  if (freeSpace < 0) {
    const removed = distributeFlexShrink(children, baseSizes, finalSizes, -freeSpace);
    freeSpace += removed;
  }

  const {startOffset, extraGap} = computeSpaceDistribution(justifyContent, freeSpace, count);

  const positions: number[] = [];
  let mainPos = startOffset;
  for (let i = 0; i < count; i++) {
    positions[i] = mainPos;
    mainPos += finalSizes[i]! + gap + extraGap;
  }

  if (isReverse) {
    for (let i = 0; i < count; i++) {
      positions[i] = mainSize - positions[i]! - finalSizes[i]!;
    }
  }

  const results: FlexLayoutResult[] = [];
  for (let i = 0; i < count; i++) {
    const {crossPos, crossExtent} = resolveCrossAxis(children[i]!, align, crossSize, isVertical);
    results[i] = {
      mainPos: positions[i]!, mainExtent: finalSizes[i]!, crossPos, crossExtent,
    };
  }

  return results;
}

function computeWrappedLayout(config: FlexLayoutConfig): FlexLayoutResult[] {
  const {children, direction, align, justifyContent, gap, mainSize, crossSize, alignContent} = config;
  const count = children.length;
  if (count === 0) {
    return [];
  }

  const isVertical = direction === 1 || direction === 3;
  const isWrapReverse = config.flexWrap === 2;

  const baseSizes = children.map(child => resolveFlexBasis(child, isVertical, mainSize));

  // Line-breaking pass (greedy): pack children into lines until mainSize overflow
  const lines: number[][] = [];
  let currentLine: number[] = [];
  let currentLineMain = 0;

  for (let i = 0; i < count; i++) {
    const childMain = baseSizes[i]!;
    const lineGap = currentLine.length > 0 ? gap : 0;

    if (currentLine.length > 0 && currentLineMain + lineGap + childMain > mainSize) {
      lines.push(currentLine);
      currentLine = [];
      currentLineMain = 0;
    }

    currentLine.push(i);
    currentLineMain += (currentLine.length > 1 ? gap : 0) + childMain;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Per-line layout + compute line cross extents
  type LineResult = {indices: number[]; results: FlexLayoutResult[]; crossExtent: number};
  const lineResults: LineResult[] = [];

  for (const lineIndices of lines) {
    const lineChildren = lineIndices.map(i => children[i]!);
    const lineBaseSizes = lineIndices.map(i => baseSizes[i]!);

    // Line cross extent = max child natural cross extent in this line
    let lineCrossExtent = 0;
    for (const i of lineIndices) {
      const childCross = resolveChildCrossExtent(children[i]!, isVertical);
      if (childCross > lineCrossExtent) {
        lineCrossExtent = childCross;
      }
    }

    const lineResult = layoutSingleLine({
      children: lineChildren, baseSizes: lineBaseSizes, direction, align, justifyContent, gap, mainSize, crossSize: lineCrossExtent,
    });

    lineResults.push({indices: lineIndices, results: lineResult, crossExtent: lineCrossExtent});
  }

  // Distribute lines in cross axis via alignContent
  const lineCount = lineResults.length;
  const lineGap = gap;
  const totalLineGap = (lineCount - 1) * lineGap;
  const totalLinesExtent = lineResults.reduce((sum, lr) => sum + lr.crossExtent, 0) + totalLineGap;
  const freeCrossSpace = crossSize - totalLinesExtent;
  const {startOffset: lineStartOffset, extraGap: lineExtraGap} = computeSpaceDistribution((alignContent ?? 0), freeCrossSpace, lineCount);

  // Assemble final results with cross-axis line offsets
  const results = Array.from<FlexLayoutResult>({length: count});
  const orderedLines = isWrapReverse ? [...lineResults].toReversed() : lineResults;
  let lineCrossPos = lineStartOffset;

  for (const lr of orderedLines) {
    for (let j = 0; j < lr.indices.length; j++) {
      const childIdx = lr.indices[j]!;
      const r = lr.results[j]!;
      results[childIdx] = {
        mainPos: r.mainPos,
        mainExtent: r.mainExtent,
        crossPos: lineCrossPos + r.crossPos,
        crossExtent: r.crossExtent,
      };
    }

    lineCrossPos += lr.crossExtent + lineGap + lineExtraGap;
  }

  return results;
}

export function computeFlexLayout(config: FlexLayoutConfig): FlexLayoutResult[] {
  const {children, direction, align, justifyContent, gap, mainSize, crossSize} = config;
  const count = children.length;
  if (count === 0) {
    return [];
  }

  if (config.flexWrap) {
    return computeWrappedLayout(config);
  }

  const isVertical = direction === 1 || direction === 3;
  const baseSizes = children.map(child => resolveFlexBasis(child, isVertical, mainSize));
  return layoutSingleLine({
    children, baseSizes, direction, align, justifyContent, gap, mainSize, crossSize,
  });
}
