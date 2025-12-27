import {ptr, type Pointer} from 'bun:ffi';
import TuiDataViewWrapper from '../TuiDataViewWrapper';
import {useOffsetCounter} from '../../utils/ffi';
import type {CStruct, Mountable} from '../types';
import ECS_MANAGER from './EcsManager';
import {
  TUI_WIDGET_COMPONENT_MEM_USAGE, type TuiWidgetBorder, type TuiWidgetColor, type TuiWidgetRect, type TuiWidgetShadow,
  type TuiWidgetStyle,
} from './types';

const OFFSET_COUNTER = useOffsetCounter();
const OFFSETS = Object.freeze({
  id: OFFSET_COUNTER.mark('u64'),
  mask: OFFSET_COUNTER.mark(TUI_WIDGET_COMPONENT_MEM_USAGE.ComponentType),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Rect
     */
  rect: OFFSET_COUNTER.mark('pointer'),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Color
     */
  color: OFFSET_COUNTER.mark('pointer'),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Style
     */
  style: OFFSET_COUNTER.mark('pointer'),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Border
     */
  border: OFFSET_COUNTER.mark('pointer'),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Shadow
     */
  shadow: OFFSET_COUNTER.mark('pointer'),
  /**
     * @see TUI_WIDGET_COMPONENT_MEM_USAGE.Text
     */
  text: OFFSET_COUNTER.mark('pointer'),
});
export const ENTITY_MEM_USAGE = OFFSET_COUNTER.currentOffset;

export abstract class TuiEntity implements CStruct, Mountable {
  readonly #entityId: bigint;
  readonly #ptr: Pointer;
  readonly #dataView: TuiDataViewWrapper;
  #refrenceCount = 0;

  constructor() {
    this.#entityId = ECS_MANAGER.createEntity();
    const buffer = new ArrayBuffer(OFFSET_COUNTER.currentOffset);
    this.#ptr = ptr(buffer);
    this.#dataView = new TuiDataViewWrapper(buffer);
    this.#dataView.setBigUint64(OFFSETS.id, this.#entityId, true);
    this.#dataView.setUint32(OFFSETS.mask, 0, true);
  }

  get ptr() {
    return this.#ptr;
  }

  get refrenceCount() {
    return this.#refrenceCount;
  }

  mounted() {
    this.#refrenceCount++;
  }

  unmounted(): void {
    this.#refrenceCount--;
  }

  protected registerRectComponent(rect: TuiWidgetRect) {
    this.#dataView.setBigUint64(OFFSETS.rect, BigInt(ECS_MANAGER.registerRectComponent(this.#entityId, rect)), true);
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Rect, true);
  }

  protected fetchRectComponent() {
    return ECS_MANAGER.fetchRectComponent(this.#entityId);
  }

  protected updateRectComponent(rect: Partial<TuiWidgetRect>) {
    ECS_MANAGER.updateRectComponent(this.#entityId, rect);
  }

  protected registerColorComponent(color: TuiWidgetColor) {
    this.#dataView.setBigUint64(OFFSETS.color, BigInt(ECS_MANAGER.registerColorComponent(this.#entityId, color)), true);
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Color, true);
  }

  protected fetchColorComponent() {
    return ECS_MANAGER.fetchColorComponent(this.#entityId);
  }

  protected updateColorComponent(color: Partial<TuiWidgetColor>) {
    ECS_MANAGER.updateColorComponent(this.#entityId, color);
  }

  protected registerStyleComponent(style: TuiWidgetStyle) {
    this.#dataView.setBigUint64(OFFSETS.style, BigInt(ECS_MANAGER.registerStyleComponent(this.#entityId, style)), true);
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Style, true);
  }

  protected fetchStyleComponent() {
    return ECS_MANAGER.fetchStyleComponent(this.#entityId);
  }

  protected updateStyleComponent(style: Partial<TuiWidgetStyle>) {
    ECS_MANAGER.updateStyleComponent(this.#entityId, style);
  }

  protected registerBorderComponent(border: TuiWidgetBorder) {
    this.#dataView.setBigUint64(OFFSETS.border, BigInt(ECS_MANAGER.registerBorderComponent(this.#entityId, border)), true);
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Border, true);
  }

  protected fetchBorderComponent() {
    return ECS_MANAGER.fetchBorderComponent(this.#entityId);
  }

  protected updateBorderComponent(border: Partial<TuiWidgetBorder>) {
    ECS_MANAGER.updateBorderComponent(this.#entityId, border);
  }

  protected registerShadowComponent(shadow: TuiWidgetShadow) {
    this.#dataView.setBigUint64(OFFSETS.shadow, BigInt(ECS_MANAGER.registerShadowComponent(this.#entityId, shadow)), true);
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Shadow, true);
  }

  protected fetchShadowComponent() {
    return ECS_MANAGER.fetchShadowComponent(this.#entityId);
  }

  protected updateShadowComponent(shadow: Partial<TuiWidgetShadow>) {
    ECS_MANAGER.updateShadowComponent(this.#entityId, shadow);
  }

  protected registerTextComponent() {
    const mask = this.#dataView.getUint32(OFFSETS.mask, true);
    this.#dataView.setUint32(OFFSETS.mask, mask | TUI_WIDGET_COMPONENT_MEM_USAGE.Text, true);
  }

  protected updateTextPtr(textPtr: Pointer) {
    this.#dataView.setBigUint64(OFFSETS.text, BigInt(textPtr), true);
  }
}
