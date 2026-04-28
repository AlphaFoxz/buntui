import {type Pointer, ptr} from 'bun:ffi';
import TuiDataViewWrapper from '../TuiDataViewWrapper';
import {ptrOffset} from '../../utils/pointer';
import {
  type TuiWidgetBorder, type TuiWidgetColor, type TuiWidgetRect, type TuiWidgetShadow, type TuiWidgetStyle, type TuiWidgetText, TUI_WIDGET_COMPONENT_MEM_USAGE as COMPONENT_MEM_USAGE,
} from './types';

export type QueryResult = {
  rect?: TuiWidgetRect;
  color?: TuiWidgetColor;
  style?: TuiWidgetStyle;
  border?: TuiWidgetBorder;
  shadow?: TuiWidgetShadow;
  text?: TuiWidgetText;
};

type ComponentIndex = number & {};

/**
 * @example
 * # 选型原因
 *
 * 现代x64架构CPU Cache Line容量64bits
 * ECS，意味着Entity Component System架构，该架构利于缓存命中。
 * 由于CPU的一级缓存是一种不易拓展的固定资源，所以Entity越多，优化效果越好。
 * []u16(EnemyHp):   [enemy1|enemy2|enemy3|enemy4] // cache line 1
 * []u16(EnemyHp):   [enemy5|enemy6|enemy7|enemy8] // cache line 2
 * []u8(EnemyState): [enemy1|enemy2|enemy3|enemy4|enemy5|enemy6|enemy7|enemy8] // cache line 3
 *
 * # 实际布局
 *
 * buffer: [
 *     Component1[]
 *     Component2[]
 *     Component3[]...
 * ]
 * component1IndexMap: Map<entityId1, Index1>;
 * component2IndexMap: Map<entityId2, Index2>;
 * component3IndexMap: Map<entityId3, Index3>;...
 */
class EcsManagerImpl {
  #entityCount = -1n;
  readonly #maxEntities: number;
  readonly #buffer: ArrayBuffer;
  readonly #dataView: TuiDataViewWrapper;
  readonly #ptr: Pointer;

  readonly #rectComponentOffset: number;
  readonly #colorComponentOffset: number;
  readonly #styleComponentOffset: number;
  readonly #borderComponentOffset: number;
  readonly #shadowComponentOffset: number;

  readonly #rectIndexMap = new Map<bigint, ComponentIndex>();
  readonly #colorIndexMap = new Map<bigint, ComponentIndex>();
  readonly #styleIndexMap = new Map<bigint, ComponentIndex>();
  readonly #borderIndexMap = new Map<bigint, ComponentIndex>();
  readonly #shadowIndexMap = new Map<bigint, ComponentIndex>();

  readonly #rectSlotStack: number[] = [0];
  readonly #colorSlotStack: number[] = [0];
  readonly #styleSlotStack: number[] = [0];
  readonly #borderSlotStack: number[] = [0];
  readonly #shadowSlotStack: number[] = [0];
  constructor(maxEntities = 1024) {
    this.#maxEntities = maxEntities;
    let offset = 0;

    this.#rectComponentOffset = offset;
    offset += COMPONENT_MEM_USAGE.Rect * maxEntities;

    this.#colorComponentOffset = offset;
    offset += COMPONENT_MEM_USAGE.Color * maxEntities;

    this.#styleComponentOffset = offset;
    offset += COMPONENT_MEM_USAGE.Style * maxEntities;

    this.#borderComponentOffset = offset;
    offset += COMPONENT_MEM_USAGE.Border * maxEntities;

    this.#shadowComponentOffset = offset;
    offset += COMPONENT_MEM_USAGE.Shadow * maxEntities;

    this.#buffer = new ArrayBuffer(offset);
    this.#dataView = new TuiDataViewWrapper(this.#buffer);
    this.#ptr = ptr(this.#buffer);
  }

  get bufferPtr() {
    return this.#ptr;
  }

  createEntity(): bigint {
    if (this.#entityCount >= BigInt(this.#maxEntities)) {
      throw new Error(`Entity limit (${this.#maxEntities}) reached`);
    }

    return ++this.#entityCount;
  }

  registerRectComponent(id: bigint, rect: TuiWidgetRect): Pointer {
    const index = this.#nextRectSlot();
    this.#rectIndexMap.set(id, index);
    const offset = this.#rectComponentOffset + (COMPONENT_MEM_USAGE.Rect * index);

    this.#dataView.setUint16(offset + 0, rect.rectX, true);
    this.#dataView.setUint16(offset + 2, rect.rectY, true);
    this.#dataView.setUint16(offset + 4, rect.rectWidth, true);
    this.#dataView.setUint16(offset + 6, rect.rectHeight, true);

    return ptrOffset(this.#ptr, offset);
  }

  fetchRectComponent(id: bigint): TuiWidgetRect | undefined {
    const index = this.#rectIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return undefined;
    }

    const offset = this.#rectComponentOffset + (COMPONENT_MEM_USAGE.Rect * index);

    return {
      rectX: this.#dataView.getUint16(offset + 0, true),
      rectY: this.#dataView.getUint16(offset + 2, true),
      rectWidth: this.#dataView.getUint16(offset + 4, true),
      rectHeight: this.#dataView.getUint16(offset + 6, true),
    };
  }

  updateRectComponent(id: bigint, rect: Partial<TuiWidgetRect>) {
    const index = this.#rectIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    const offset = this.#rectComponentOffset + (COMPONENT_MEM_USAGE.Rect * index);

    if (rect.rectX !== undefined) {
      this.#dataView.setUint16(offset + 0, rect.rectX, true);
    }

    if (rect.rectY !== undefined) {
      this.#dataView.setUint16(offset + 2, rect.rectY, true);
    }

    if (rect.rectWidth !== undefined) {
      this.#dataView.setUint16(offset + 4, rect.rectWidth, true);
    }

    if (rect.rectHeight !== undefined) {
      this.#dataView.setUint16(offset + 6, rect.rectHeight, true);
    }
  }

  unregisterRectComponent(id: bigint) {
    const index = this.#rectIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    this.#rectIndexMap.delete(id);
    this.#rectSlotStack.push(index);
  }

  registerColorComponent(id: bigint, color: TuiWidgetColor) {
    const index = this.#nextColorSlot();
    this.#colorIndexMap.set(id, index);
    const offset = this.#colorComponentOffset + (COMPONENT_MEM_USAGE.Color * index);

    this.#dataView.setUint32(offset + 0, color.colorFg, true);
    this.#dataView.setUint32(offset + 4, color.colorBg, true);

    return ptrOffset(this.#ptr, offset);
  }

  fetchColorComponent(id: bigint): TuiWidgetColor | undefined {
    const index = this.#colorIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return undefined;
    }

    const offset = this.#colorComponentOffset + (COMPONENT_MEM_USAGE.Color * index);

    return {
      colorFg: this.#dataView.getUint32(offset + 0, true),
      colorBg: this.#dataView.getUint32(offset + 4, true),
    };
  }

  updateColorComponent(id: bigint, color: Partial<TuiWidgetColor>) {
    const index = this.#colorIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    const offset = this.#colorComponentOffset + (COMPONENT_MEM_USAGE.Color * index);

    if (color.colorFg !== undefined) {
      this.#dataView.setUint32(offset + 0, color.colorFg, true);
    }

    if (color.colorBg !== undefined) {
      this.#dataView.setUint32(offset + 4, color.colorBg, true);
    }
  }

  unregisterColorComponent(id: bigint) {
    const index = this.#colorIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    this.#colorIndexMap.delete(id);
    this.#colorSlotStack.push(index);
  }

  registerStyleComponent(id: bigint, style: TuiWidgetStyle) {
    const index = this.#nextStyleSlot();
    this.#styleIndexMap.set(id, index);
    const offset = this.#styleComponentOffset + (COMPONENT_MEM_USAGE.Style * index);

    this.#dataView.setUint16(offset + 0, style.styleZIndex, true);
    this.#dataView.setUint16(offset + 2, style.styleModifier);

    return ptrOffset(this.#ptr, offset);
  }

  fetchStyleComponent(id: bigint): TuiWidgetStyle | undefined {
    const index = this.#styleIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return undefined;
    }

    const offset = this.#styleComponentOffset + (COMPONENT_MEM_USAGE.Style * index);

    return {
      styleZIndex: this.#dataView.getUint16(offset + 0, true),
      styleModifier: this.#dataView.getUint16(offset + 2),
    };
  }

  updateStyleComponent(id: bigint, style: Partial<TuiWidgetStyle>) {
    const index = this.#styleIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    const offset = this.#styleComponentOffset + (COMPONENT_MEM_USAGE.Style * index);

    if (style.styleZIndex !== undefined) {
      this.#dataView.setUint16(offset + 0, style.styleZIndex, true);
    }

    if (style.styleModifier !== undefined) {
      this.#dataView.setUint16(offset + 2, style.styleModifier);
    }
  }

  unregisterStyleComponent(id: bigint) {
    const index = this.#styleIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    this.#styleIndexMap.delete(id);
    this.#styleSlotStack.push(index);
  }

  registerBorderComponent(id: bigint, border: TuiWidgetBorder) {
    const index = this.#nextBorderSlot();
    this.#borderIndexMap.set(id, index);
    const offset = this.#borderComponentOffset + (COMPONENT_MEM_USAGE.Border * index);

    this.#dataView.setUint32(offset + 0, border.borderColor, true);
    this.#dataView.setUint8(offset + 4, border.borderStyle);
    this.#dataView.setBool(offset + 5, border.borderTop);
    this.#dataView.setBool(offset + 6, border.borderRight);
    this.#dataView.setBool(offset + 7, border.borderBottom);
    this.#dataView.setBool(offset + 8, border.borderLeft);

    return ptrOffset(this.#ptr, offset);
  }

  fetchBorderComponent(id: bigint): TuiWidgetBorder | undefined {
    const index = this.#borderIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return undefined;
    }

    const offset = this.#borderComponentOffset + (COMPONENT_MEM_USAGE.Border * index);

    return {
      borderColor: this.#dataView.getUint32(offset + 0, true),
      borderStyle: this.#dataView.getUint8(offset + 4),
      borderTop: this.#dataView.getBool(offset + 5),
      borderRight: this.#dataView.getBool(offset + 6),
      borderBottom: this.#dataView.getBool(offset + 7),
      borderLeft: this.#dataView.getBool(offset + 8),
    };
  }

  updateBorderComponent(id: bigint, border: Partial<TuiWidgetBorder>) {
    const index = this.#borderIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    const offset = this.#borderComponentOffset + (COMPONENT_MEM_USAGE.Border * index);

    if (border.borderColor !== undefined) {
      this.#dataView.setUint32(offset + 0, border.borderColor, true);
    }

    if (border.borderStyle !== undefined) {
      this.#dataView.setUint8(offset + 4, border.borderStyle);
    }

    if (border.borderTop !== undefined) {
      this.#dataView.setBool(offset + 5, border.borderTop);
    }

    if (border.borderRight !== undefined) {
      this.#dataView.setBool(offset + 6, border.borderRight);
    }

    if (border.borderBottom !== undefined) {
      this.#dataView.setBool(offset + 7, border.borderBottom);
    }

    if (border.borderLeft !== undefined) {
      this.#dataView.setBool(offset + 8, border.borderLeft);
    }
  }

  unregisterBorderComponent(id: bigint) {
    const index = this.#borderIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    this.#borderIndexMap.delete(id);
    this.#borderSlotStack.push(index);
  }

  registerShadowComponent(id: bigint, shadow: TuiWidgetShadow) {
    const index = this.#nextShadowSlot();
    this.#shadowIndexMap.set(id, index);
    const offset = this.#shadowComponentOffset + (COMPONENT_MEM_USAGE.Shadow * index);

    this.#dataView.setUint16(offset + 0, shadow.shadowOffsetX, true);
    this.#dataView.setUint16(offset + 2, shadow.shadowOffsetY, true);
    this.#dataView.setUint32(offset + 4, shadow.shadowColor, true);
    this.#dataView.setBool(offset + 8, shadow.shadowCovered);

    return ptrOffset(this.#ptr, offset);
  }

  fetchShadowComponent(id: bigint): TuiWidgetShadow | undefined {
    const index = this.#shadowIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return undefined;
    }

    const offset = this.#shadowComponentOffset + (COMPONENT_MEM_USAGE.Shadow * index);

    return {
      shadowOffsetX: this.#dataView.getUint16(offset + 0, true),
      shadowOffsetY: this.#dataView.getUint16(offset + 2, true),
      shadowColor: this.#dataView.getUint32(offset + 4, true),
      shadowCovered: this.#dataView.getBool(offset + 8),
    };
  }

  updateShadowComponent(id: bigint, shadow: Partial<TuiWidgetShadow>) {
    const index = this.#shadowIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    const offset = this.#shadowComponentOffset + (COMPONENT_MEM_USAGE.Shadow * index);

    if (shadow.shadowOffsetX !== undefined) {
      this.#dataView.setUint16(offset + 0, shadow.shadowOffsetX, true);
    }

    if (shadow.shadowOffsetY !== undefined) {
      this.#dataView.setUint16(offset + 2, shadow.shadowOffsetY, true);
    }

    if (shadow.shadowColor !== undefined) {
      this.#dataView.setUint32(offset + 4, shadow.shadowColor, true);
    }

    if (shadow.shadowCovered !== undefined) {
      this.#dataView.setBool(offset + 8, shadow.shadowCovered);
    }
  }

  unregisterShadowComponent(id: bigint) {
    const index = this.#shadowIndexMap.get(id) ?? undefined;
    if (index === undefined) {
      return;
    }

    this.#shadowIndexMap.delete(id);
    this.#shadowSlotStack.push(index);
  }

  #nextRectSlot() {
    return this.#nextSlot(this.#rectSlotStack);
  }

  #nextColorSlot() {
    return this.#nextSlot(this.#colorSlotStack);
  }

  #nextStyleSlot() {
    return this.#nextSlot(this.#styleSlotStack);
  }

  #nextBorderSlot() {
    return this.#nextSlot(this.#borderSlotStack);
  }

  #nextShadowSlot() {
    return this.#nextSlot(this.#shadowSlotStack);
  }

  #nextSlot(slotStack: number[]) {
    if (slotStack.length === 1) {
      const index = slotStack[0]!;
      if (index >= this.#maxEntities) {
        throw new Error('Component limit reached');
      }

      slotStack[0]!++;
      return index;
    }

    return slotStack.pop()!;
  }
}

export const ECS_MANAGER = new EcsManagerImpl();

export default ECS_MANAGER;

