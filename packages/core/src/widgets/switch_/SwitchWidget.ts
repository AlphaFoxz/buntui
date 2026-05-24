import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect, TuiWidgetSize} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {SwitchWidgetOptions} from './types';

type SwitchColors = {
  fg: number;
  bg: number;
  cross: number;
  check: number;
  dim: number;
};

const SWITCH_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorCrossNormal: 'danger',
  colorCheckNormal: 'success',
  colorDimNormal: 'textMuted',
  colorFgHovered: 'text',
  colorBgHovered: 'surfaceHover',
  colorCrossHovered: 'danger',
  colorCheckHovered: 'success',
  colorDimHovered: 'borderFocused',
  colorFgFocused: 'text',
  colorBgFocused: 'surface',
  colorCrossFocused: 'danger',
  colorCheckFocused: 'success',
  colorDimFocused: 'textMuted',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surface',
  colorCrossDisabled: 'border',
  colorCheckDisabled: 'border',
  colorDimDisabled: 'surfaceFocused',
} as const;

function getDefaultSwitchOptions(): Required<SwitchWidgetOptions> {
  return {
    x: 0,
    y: 0,
    width: 12,
    height: 1,
    label: '',
    checked: false,
    disabled: false,

    ...resolveWidgetColors(SWITCH_TOKEN_MAP),
  };
}

export class SwitchWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;

  readonly #colors: ColorScheme<SwitchColors>;

  constructor(options: SwitchWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultSwitchOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        cross: parseColor(resolved.colorCrossNormal),
        check: parseColor(resolved.colorCheckNormal),
        dim: parseColor(resolved.colorDimNormal),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        cross: parseColor(resolved.colorCrossHovered),
        check: parseColor(resolved.colorCheckHovered),
        dim: parseColor(resolved.colorDimHovered),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        cross: parseColor(resolved.colorCrossFocused),
        check: parseColor(resolved.colorCheckFocused),
        dim: parseColor(resolved.colorDimFocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        cross: parseColor(resolved.colorCrossDisabled),
        check: parseColor(resolved.colorCheckDisabled),
        dim: parseColor(resolved.colorDimDisabled),
      },
    };

    this.on('click', () => {
      this.#toggle();
    });
  }

  get checked(): boolean {
    return this.#checked;
  }

  get label(): string {
    return this.#label;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#rect.width, height: this.#rect.height};
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.#toggle();
    }
  }

  setChecked(value: boolean): void {
    this.#checked = value;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
      hovered: this.hovered,
    });
    const textY = y + Math.floor(height / 2);

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: colors.bg,
    });

    buffer.drawText({
      x,
      y: textY,
      text: '✗',
      fgRgba: this.#checked ? colors.dim : colors.bg,
      bgRgba: this.#checked ? 0x00_00_00_00 : colors.cross,
    });

    buffer.drawText({
      x: x + 1,
      y: textY,
      text: '|',
      fgRgba: colors.dim,
      bgRgba: 0x00_00_00_00,
    });

    buffer.drawText({
      x: x + 2,
      y: textY,
      text: '✓',
      fgRgba: this.#checked ? colors.bg : colors.dim,
      bgRgba: this.#checked ? colors.check : 0x00_00_00_00,
    });

    if (this.#label.length > 0) {
      const labelX = x + 4;
      const maxLabelWidth = width - 4;
      if (maxLabelWidth > 0) {
        const visibleLabel = this.#label.slice(0, Math.max(0, maxLabelWidth));
        buffer.drawText({
          x: labelX,
          y: textY,
          text: visibleLabel,
          fgRgba: colors.fg,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();
  }

  #toggle(): void {
    this.#checked = !this.#checked;
    this.dispatch('change', {checked: this.#checked});
  }
}

export function createSwitchWidget(options?: Partial<SwitchWidgetOptions>): SwitchWidget {
  const widget = new SwitchWidget({...getDefaultSwitchOptions(), ...options});
  bindThemeToWidget(widget, SWITCH_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default SwitchWidget;
