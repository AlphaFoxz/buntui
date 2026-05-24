import {describe, it, expect} from 'bun:test';
import {getTheme, setTheme, onThemeChange} from '../provider';
import {defineTheme, catppuccinMocha} from '../themes';

describe('provider', () => {
  it('returns the default theme', () => {
    const theme = getTheme();
    expect(theme.name).toBe('catppuccin-mocha');
  });

  it('setTheme changes the current theme', () => {
    const custom = defineTheme({
      name: 'test-theme',
      colors: {...catppuccinMocha.colors},
      borderStyle: {...catppuccinMocha.borderStyle},
    });

    setTheme(custom);
    expect(getTheme().name).toBe('test-theme');

    setTheme(catppuccinMocha);
    expect(getTheme().name).toBe('catppuccin-mocha');
  });

  it('onThemeChange notifies listeners when theme changes', () => {
    const received: string[] = [];

    const unsubscribe = onThemeChange(theme => {
      received.push(theme.name);
    });

    const custom = defineTheme({
      name: 'listener-test',
      colors: {...catppuccinMocha.colors},
      borderStyle: {...catppuccinMocha.borderStyle},
    });

    setTheme(custom);
    expect(received).toEqual(['listener-test']);

    setTheme(catppuccinMocha);
    expect(received).toEqual(['listener-test', 'catppuccin-mocha']);

    unsubscribe();
  });

  it('unsubscribe stops notifications', () => {
    const received: string[] = [];

    const unsubscribe = onThemeChange(theme => {
      received.push(theme.name);
    });

    const custom = defineTheme({
      name: 'unsub-test',
      colors: {...catppuccinMocha.colors},
      borderStyle: {...catppuccinMocha.borderStyle},
    });

    setTheme(custom);
    expect(received.length).toBe(1);

    unsubscribe();

    setTheme(catppuccinMocha);
    expect(received.length).toBe(1);
  });

  it('supports multiple listeners', () => {
    const a: string[] = [];
    const b: string[] = [];

    const unsubA = onThemeChange(theme => a.push(theme.name));
    const unsubB = onThemeChange(theme => b.push(theme.name));

    const custom = defineTheme({
      name: 'multi-test',
      colors: {...catppuccinMocha.colors},
      borderStyle: {...catppuccinMocha.borderStyle},
    });

    setTheme(custom);
    expect(a).toEqual(['multi-test']);
    expect(b).toEqual(['multi-test']);

    unsubA();
    setTheme(catppuccinMocha);
    expect(a.length).toBe(1);
    expect(b).toEqual(['multi-test', 'catppuccin-mocha']);

    unsubB();
  });
});
