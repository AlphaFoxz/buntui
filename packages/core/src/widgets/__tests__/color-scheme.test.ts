import {it, expect, describe} from 'bun:test';
import {resolveColorState, applyColorSchemeUpdates, type ColorScheme} from '../color-scheme';
import {parseColor} from '../../utils/color';
import {resolveBorderStyle} from '../types';

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

describe('applyColorSchemeUpdates', () => {
  function makeScheme(): ColorScheme<Record<string, number>> {
    return {
      normal: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      hovered: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      focused: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      pressed: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      disabled: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      active: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
      selected: {fg: 0, bg: 0, cross: 0, check: 0, dim: 0, track: 0, fill: 0, colorBorder: 0, borderStyle: 0},
    };
  }

  it('does nothing when resolved is empty', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {});
    expect(scheme.normal.fg).toBe(0);
  });

  it('skips keys whose value is undefined', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {colorFgNormal: undefined});
    expect(scheme.normal.fg).toBe(0);
  });

  it('maps colorFgNormal to scheme.normal.fg via parseColor', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {colorFgNormal: '#ff0000'});
    expect(scheme.normal.fg).toBe(parseColor('#ff0000'));
    expect(scheme.normal.fg).toBe(0xFF_00_00_FF);
  });

  it('maps every documented FIELD_MAP prefix for the normal state', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {
      colorFgNormal: 'red',
      colorBgNormal: 'blue',
      colorCrossNormal: 'green',
      colorCheckNormal: 'yellow',
      colorDimNormal: 'gray',
      colorTrackNormal: 'aqua',
      colorFillNormal: 'lime',
      colorBorderNormal: 'orange',
    });
    expect(scheme.normal.fg).toBe(parseColor('red'));
    expect(scheme.normal.bg).toBe(parseColor('blue'));
    expect(scheme.normal.cross).toBe(parseColor('green'));
    expect(scheme.normal.check).toBe(parseColor('yellow'));
    expect(scheme.normal.dim).toBe(parseColor('gray'));
    expect(scheme.normal.track).toBe(parseColor('aqua'));
    expect(scheme.normal.fill).toBe(parseColor('lime'));
    expect(scheme.normal.colorBorder).toBe(parseColor('orange'));
  });

  it('maps each state suffix to the matching state bucket', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {
      colorFgNormal: 'red',
      colorFgHovered: 'green',
      colorFgFocused: 'blue',
      colorFgSelected: 'gray',
      colorFgPressed: 'yellow',
      colorFgDisabled: 'aqua',
      colorFgActive: 'lime',
    });
    expect(scheme.normal.fg).toBe(parseColor('red'));
    expect(scheme.hovered.fg).toBe(parseColor('green'));
    expect(scheme.focused.fg).toBe(parseColor('blue'));
    expect(scheme.selected!.fg).toBe(parseColor('gray'));
    expect(scheme.pressed!.fg).toBe(parseColor('yellow'));
    expect(scheme.disabled.fg).toBe(parseColor('aqua'));
    expect(scheme.active!.fg).toBe(parseColor('lime'));
  });

  it('treats the Unfocused suffix as the normal state', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {colorFgUnfocused: 'red'});
    expect(scheme.normal.fg).toBe(parseColor('red'));
  });

  it('accepts numeric color values (passthrough)', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {colorFgNormal: 0x12_34_56_78});
    expect(scheme.normal.fg).toBe(0x12_34_56_78);
  });

  it('maps borderStyle<State> keys to state.borderStyle via resolveBorderStyle', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {
      borderStyleNormal: 'solid',
      borderStyleFocused: 'double',
      borderStyleHovered: 'rounded',
    });
    expect(scheme.normal.borderStyle).toBe(resolveBorderStyle('solid'));
    expect(scheme.focused.borderStyle).toBe(resolveBorderStyle('double'));
    expect(scheme.hovered.borderStyle).toBe(resolveBorderStyle('rounded'));
    expect(scheme.normal.borderStyle).toBe(1);
    expect(scheme.focused.borderStyle).toBe(2);
  });

  it('does not touch color fields for borderStyle keys', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {borderStyleNormal: 'solid', colorFgNormal: 'red'});
    expect(scheme.normal.borderStyle).toBe(1);
    expect(scheme.normal.fg).toBe(parseColor('red'));
    expect(scheme.normal.bg).toBe(0);
  });

  it('skips a state that is absent from the scheme (no throw)', () => {
    const partialScheme: ColorScheme<Record<string, number>> = {
      normal: {fg: 0, bg: 0},
    };
    expect(() => applyColorSchemeUpdates(partialScheme, {colorFgPressed: 'red'})).not.toThrow();
    expect(partialScheme.normal.fg).toBe(0);
  });

  it('ignores keys whose prefix is not in FIELD_MAP and not borderStyle', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {unknownPropNormal: 'red' as unknown as number});
    expect(scheme.normal.fg).toBe(0);
  });

  it('updates a previously-set field a second time', () => {
    const scheme = makeScheme();
    applyColorSchemeUpdates(scheme, {colorFgNormal: 'red'});
    applyColorSchemeUpdates(scheme, {colorFgNormal: 'blue'});
    expect(scheme.normal.fg).toBe(parseColor('blue'));
  });
});
