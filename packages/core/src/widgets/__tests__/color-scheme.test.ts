import {it, expect, describe} from 'bun:test';
import {resolveColorState, type ColorScheme} from '../color-scheme';

describe('resolveColorState', () => {
  const scheme: ColorScheme<string> = {
    normal: 'white',
    focused: 'blue',
    hovered: 'green',
    pressed: 'red',
    disabled: 'gray',
  };

  it('returns normal when no special state', () => {
    expect(resolveColorState(scheme, {disabled: false, focused: false})).toBe('white');
  });

  it('prioritizes disabled over all other states', () => {
    expect(resolveColorState(scheme, {disabled: true, focused: true, hovered: true, pressed: true})).toBe('gray');
  });

  it('prioritizes pressed over hovered and focused', () => {
    expect(resolveColorState(scheme, {disabled: false, focused: true, hovered: true, pressed: true})).toBe('red');
  });

  it('prioritizes hovered over focused', () => {
    expect(resolveColorState(scheme, {disabled: false, focused: true, hovered: true})).toBe('green');
  });

  it('returns focused when only focused is true', () => {
    expect(resolveColorState(scheme, {disabled: false, focused: true})).toBe('blue');
  });

  it('falls back to normal when state is true but scheme value is absent', () => {
    const partial: ColorScheme<string> = {normal: 'white'};
    expect(resolveColorState(partial, {disabled: true, focused: true})).toBe('white');
  });

  it('falls back to normal when disabled is true but no disabled color', () => {
    const partial: ColorScheme<string> = {normal: 'white', focused: 'blue'};
    expect(resolveColorState(partial, {disabled: true, focused: false})).toBe('white');
  });

  it('works with number color values', () => {
    const numScheme: ColorScheme<number> = {
      normal: 0xFF_FF_FF_FF,
      focused: 0x00_00_FF_FF,
    };
    expect(resolveColorState(numScheme, {disabled: false, focused: true})).toBe(0x00_00_FF_FF);
  });
});
