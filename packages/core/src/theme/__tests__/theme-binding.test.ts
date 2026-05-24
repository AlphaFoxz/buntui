import {describe, it, expect} from 'bun:test';
import {setTheme} from '../provider';
import {defineTheme, tokyoNightMoon} from '../themes';
import {createBox} from '../../widgets/box/BoxWidget';
import {createTextWidget} from '../../widgets/text/TextWidget';

const altTheme = defineTheme({
  name: 'alt-test-theme',
  colors: {
    ...tokyoNightMoon.colors,
    text: 0xFF_00_00_FF,
    surface: 0x00_FF_00_FF,
    background: 0x00_00_FF_FF,
    border: 0xFF_FF_00_FF,
    borderFocused: 0xFF_00_FF_FF,
  },
  borderStyle: {...tokyoNightMoon.borderStyle},
});

describe('theme binding in factory functions', () => {
  function cleanup() {
    setTheme(tokyoNightMoon);
  }

  it('createBox updates colors on theme change', () => {
    const box = createBox();
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);

    setTheme(altTheme);
    expect(box.color.colorFg).toBe(altTheme.colors.text as U32);
    expect(box.color.colorBg).toBe(altTheme.colors.background as U32);
    expect(box.border.borderColor).toBe(altTheme.colors.border as U32);

    parent.removeChild(box);
    cleanup();
  });

  it('createBox with explicit colorFg ignores theme change for that prop', () => {
    const box = createBox({colorFg: 0x12_34_56_FF});
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);

    setTheme(altTheme);
    expect(box.color.colorFg).toBe(0x12_34_56_FF);
    expect(box.color.colorBg).toBe(altTheme.colors.background as U32);

    parent.removeChild(box);
    cleanup();
  });

  it('createBox with explicit colorBg ignores theme change for that prop', () => {
    const box = createBox({colorBg: 0xAA_BB_CC_FF});
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);

    setTheme(altTheme);
    expect(box.color.colorBg).toBe(0xAA_BB_CC_FF);
    expect(box.color.colorFg).toBe(altTheme.colors.text as U32);

    parent.removeChild(box);
    cleanup();
  });

  it('createTextWidget updates colorFg on theme change', () => {
    const text = createTextWidget('hello');
    const parent = createBox({width: 80, height: 24});
    parent.addChild(text);

    setTheme(altTheme);
    expect(text.color.colorFg).toBe(altTheme.colors.text as U32);

    parent.removeChild(text);
    cleanup();
  });

  it('createTextWidget with explicit colorFg ignores theme change', () => {
    const text = createTextWidget({value: 'hello', colorFg: 0x11_22_33_FF});
    const parent = createBox({width: 80, height: 24});
    parent.addChild(text);

    setTheme(altTheme);
    expect(text.color.colorFg).toBe(0x11_22_33_FF);

    parent.removeChild(text);
    cleanup();
  });

  it('cleanup runs on unmounted — subsequent theme change does not throw', () => {
    const box = createBox();
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);
    parent.removeChild(box);

    expect(() => setTheme(altTheme)).not.toThrow();
    cleanup();
  });

  it('no subscription when all theme props are overridden', () => {
    const box = createBox({colorFg: 0xFF_FF_FF_FF, colorBg: 0x00_00_00_00, borderColor: 0xFF_FF_FF_FF});
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);

    setTheme(altTheme);
    expect(box.color.colorFg).toBe(0xFF_FF_FF_FF);
    expect(box.color.colorBg).toBe(0x00_00_00_00);
    expect(box.border.borderColor).toBe(0xFF_FF_FF_FF);

    parent.removeChild(box);
    cleanup();
  });

  it('multiple theme changes apply correctly', () => {
    const box = createBox();
    const parent = createBox({width: 80, height: 24});
    parent.addChild(box);

    setTheme(altTheme);
    expect(box.color.colorFg).toBe(altTheme.colors.text as U32);

    setTheme(tokyoNightMoon);
    expect(box.color.colorFg).toBe(tokyoNightMoon.colors.text as U32);

    setTheme(altTheme);
    expect(box.color.colorFg).toBe(altTheme.colors.text as U32);

    parent.removeChild(box);
    cleanup();
  });
});
