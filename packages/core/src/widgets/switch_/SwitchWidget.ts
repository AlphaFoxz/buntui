import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {SwitchWidgetOptions} from './types';

type SwitchColors = {
  fg: number;
  bg: number;
  cross: number;
  check: number;
  dim: number;
};

// Catppuccin Mocha palette — widget-specific defaults
const SWITCH_CROSS = 0xF3_8B_A8_FF;
const SWITCH_CHECK = 0xA6_E3_A1_FF;
const SWITCH_DIM = 0x6C_70_86_FF;

function getDefaultSwitchOptions(): Required<SwitchWidgetOptions> {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 12,
    height: 1,
    label: '',
    checked: false,
    disabled: false,

    colorFgNormal: theme.colors.text,
    colorBgNormal: theme.colors.surface,
    colorCrossNormal: SWITCH_CROSS,
    colorCheckNormal: SWITCH_CHECK,
    colorDimNormal: SWITCH_DIM,

    colorFgHovered: theme.colors.text,
    colorBgHovered: theme.colors.surfaceHover,
    colorCrossHovered: SWITCH_CROSS,
    colorCheckHovered: SWITCH_CHECK,
    colorDimHovered: theme.colors.borderFocused,

    colorFgFocused: theme.colors.text,
    colorBgFocused: theme.colors.surface,
    colorCrossFocused: SWITCH_CROSS,
    colorCheckFocused: SWITCH_CHECK,
    colorDimFocused: SWITCH_DIM,

    colorFgDisabled: theme.colors.textMuted,
    colorBgDisabled: theme.colors.surface,
    colorCrossDisabled: theme.colors.border,
    colorCheckDisabled: theme.colors.border,
    colorDimDisabled: theme.colors.surfaceFocused,
  };
}

export class SwitchWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #hovered = false;

  readonly #colors: ColorScheme<SwitchColors>;

  constructor(options: SwitchWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultSwitchOptions(), ...options};
    const spec = extractPercentSpec(resolved.x, resolved.y, resolved.width, resolved.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#rect = {
      x: isPercent(resolved.x) ? 0 : resolved.x,
      y: isPercent(resolved.y) ? 0 : resolved.y,
      width: isPercent(resolved.width) ? 0 : resolved.width,
      height: isPercent(resolved.height) ? 0 : resolved.height,
    };
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
      if (this.disabled) {
        return;
      }

      this.#toggle();
    });

    this.on('mouseover', () => {
      if (this.disabled) {
        return;
      }

      this.#hovered = true;
    });

    this.on('mouseout', () => {
      this.#hovered = false;
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

  handleKey(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

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

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
      hovered: this.#hovered,
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
  return new SwitchWidget({...getDefaultSwitchOptions(), ...options});
}

export default SwitchWidget;
