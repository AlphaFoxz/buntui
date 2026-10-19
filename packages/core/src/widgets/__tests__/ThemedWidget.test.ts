import {describe, it, expect, afterEach} from 'bun:test';
import {setTheme, getTheme} from '../../theme/store';
import {tokyoNightMoon, tokyoNightStorm} from '../../theme/presets';
import {colorThemed} from '../../theme/color-ref';
import {ButtonWidget, createButtonWidget} from '../button/ButtonWidget';
import {ProgressWidget, createProgressWidget} from '../progress/ProgressWidget';
import {parseColor} from '../../utils/color';

function restoreTheme(): void {
  setTheme(getTheme());
}

describe('ThemedWidget base binding', () => {
  afterEach(() => {
    restoreTheme();
  });

  it('factory widgets update scheme colors on theme change', () => {
    setTheme(tokyoNightMoon);
    const button = createButtonWidget();
    const before = button.colors.normal.bg;

    setTheme(tokyoNightStorm);
    const after = button.colors.normal.bg;
    expect(after).not.toBe(before);

    setTheme(tokyoNightMoon);
    expect(button.colors.normal.bg).toBe(before);
  });

  it('direct construction binds theme identically', () => {
    setTheme(tokyoNightMoon);
    const button = new ButtonWidget();
    const before = button.colors.normal.bg;
    setTheme(tokyoNightStorm);
    expect(button.colors.normal.bg).not.toBe(before);
    setTheme(tokyoNightMoon);
  });

  it('user color overrides are not clobbered by theme change', () => {
    setTheme(tokyoNightMoon);
    const button = createButtonWidget({colorBgNormal: '#FF0000'});
    setTheme(tokyoNightStorm);
    expect(button.colors.normal.bg).toBe(parseColor('#FF0000'));
  });

  it('themed color refs resolve at construction and track theme', () => {
    setTheme(tokyoNightMoon);
    const ref = colorThemed({alpha: 0.5});
    const button = createButtonWidget({colorBgNormal: ref!});
    const moonValue = button.colors.normal.bg;
    expect(moonValue).not.toBe(parseColor('#FF0000'));

    setTheme(tokyoNightStorm);
    expect(button.colors.normal.bg).not.toBe(moonValue);
  });

  it('scheme builds borderStyle states from tokens', () => {
    const button = createButtonWidget({borderStyleNormal: 'double'});
    expect(button.colors.normal.borderStyle).not.toBe(0);
    expect(button.colors.focused!.borderStyle).not.toBe(0);
  });

  it('progress builds only token-declared states', () => {
    setTheme(tokyoNightMoon);
    const progress = createProgressWidget();
    expect(progress.colors.normal.track).toBeTypeOf('number');
    expect(progress.colors.normal.fill).toBeTypeOf('number');
    expect(progress.colors.disabled!.track).toBeTypeOf('number');
    expect(progress.colors.hovered).toBeUndefined();
  });
});
