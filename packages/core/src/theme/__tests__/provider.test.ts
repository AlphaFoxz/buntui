import {describe, it, expect} from 'bun:test';
import {getTheme, setTheme, onThemeChange} from '../provider';
import {defineTheme, tokyoNightMoon} from '../themes';

describe('provider', () => {
  it('returns the default theme', () => {
    const theme = getTheme();
    expect(theme.name).toBe('tokyo-night-moon');
  });

  it('setTheme changes the current theme', () => {
    const custom = defineTheme({
      name: 'test-theme',
      colors: {...tokyoNightMoon.colors},
      borderStyle: {...tokyoNightMoon.borderStyle},
    });

    setTheme(custom);
    expect(getTheme().name).toBe('test-theme');

    setTheme(tokyoNightMoon);
    expect(getTheme().name).toBe('tokyo-night-moon');
  });

  it('onThemeChange notifies listeners when theme changes', () => {
    const received: string[] = [];

    const unsubscribe = onThemeChange(theme => {
      received.push(theme.name);
    });

    const custom = defineTheme({
      name: 'listener-test',
      colors: {...tokyoNightMoon.colors},
      borderStyle: {...tokyoNightMoon.borderStyle},
    });

    setTheme(custom);
    expect(received).toEqual(['listener-test']);

    setTheme(tokyoNightMoon);
    expect(received).toEqual(['listener-test', 'tokyo-night-moon']);

    unsubscribe();
  });

  it('unsubscribe stops notifications', () => {
    const received: string[] = [];

    const unsubscribe = onThemeChange(theme => {
      received.push(theme.name);
    });

    const custom = defineTheme({
      name: 'unsub-test',
      colors: {...tokyoNightMoon.colors},
      borderStyle: {...tokyoNightMoon.borderStyle},
    });

    setTheme(custom);
    expect(received.length).toBe(1);

    unsubscribe();

    setTheme(tokyoNightMoon);
    expect(received.length).toBe(1);
  });

  it('supports multiple listeners', () => {
    const a: string[] = [];
    const b: string[] = [];

    const unsubA = onThemeChange(theme => a.push(theme.name));
    const unsubB = onThemeChange(theme => b.push(theme.name));

    const custom = defineTheme({
      name: 'multi-test',
      colors: {...tokyoNightMoon.colors},
      borderStyle: {...tokyoNightMoon.borderStyle},
    });

    setTheme(custom);
    expect(a).toEqual(['multi-test']);
    expect(b).toEqual(['multi-test']);

    unsubA();
    setTheme(tokyoNightMoon);
    expect(a.length).toBe(1);
    expect(b).toEqual(['multi-test', 'tokyo-night-moon']);

    unsubB();
  });
});
