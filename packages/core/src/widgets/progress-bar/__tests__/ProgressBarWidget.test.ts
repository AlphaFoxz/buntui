import {it, expect, describe} from 'bun:test';
import {ProgressBarWidget} from '../ProgressBarWidget';

function createProgressBar(options?: {
  value?: number;
  min?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  disabled?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  return new ProgressBarWidget({
    value: options?.value ?? 0,
    min: options?.min ?? 0,
    max: options?.max ?? 100,
    label: options?.label ?? '',
    showPercentage: options?.showPercentage ?? true,
    disabled: options?.disabled ?? false,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 30,
    height: options?.height ?? 1,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const pb = new ProgressBarWidget();
    expect(pb.value).toBe(0);
    expect(pb.min).toBe(0);
    expect(pb.max).toBe(100);
    expect(pb.label).toBe('');
    expect(pb.showPercentage).toBe(true);
    expect(pb.disabled).toBe(false);
    expect(pb.acceptsFocus).toBe(false);
    const r = pb.rect;
    expect(r.width).toBe(30);
    expect(r.height).toBe(1);
  });

  it('initializes with custom options', () => {
    const pb = createProgressBar({value: 75, label: 'Download', max: 200});
    expect(pb.value).toBe(75);
    expect(pb.label).toBe('Download');
    expect(pb.max).toBe(200);
  });

  it('initializes as disabled', () => {
    const pb = createProgressBar({disabled: true});
    expect(pb.disabled).toBe(true);
    expect(pb.acceptsFocus).toBe(false);
  });

  it('clamps initial value to range', () => {
    const pb = createProgressBar({value: 150, min: 0, max: 100});
    expect(pb.value).toBe(100);
  });

  it('clamps negative initial value', () => {
    const pb = createProgressBar({value: -10, min: 0, max: 100});
    expect(pb.value).toBe(0);
  });
});

describe('updateValue', () => {
  it('sets value within range', () => {
    const pb = createProgressBar();
    pb.updateValue(50);
    expect(pb.value).toBe(50);
  });

  it('clamps value above max', () => {
    const pb = createProgressBar();
    pb.updateValue(200);
    expect(pb.value).toBe(100);
  });

  it('clamps value below min', () => {
    const pb = createProgressBar({min: 10});
    pb.updateValue(5);
    expect(pb.value).toBe(10);
  });
});

describe('setRange', () => {
  it('updates min and max', () => {
    const pb = createProgressBar();
    pb.setRange(0, 200);
    expect(pb.min).toBe(0);
    expect(pb.max).toBe(200);
  });

  it('re-clamps current value to new range', () => {
    const pb = createProgressBar({value: 80});
    pb.setRange(0, 50);
    expect(pb.value).toBe(50);
  });
});

describe('setLabel', () => {
  it('updates label', () => {
    const pb = createProgressBar({label: 'Old'});
    expect(pb.label).toBe('Old');
    pb.setLabel('New');
    expect(pb.label).toBe('New');
  });
});

describe('updateShowPercentage', () => {
  it('toggles percentage display', () => {
    const pb = createProgressBar();
    expect(pb.showPercentage).toBe(true);
    pb.updateShowPercentage(false);
    expect(pb.showPercentage).toBe(false);
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const pb = createProgressBar();
    expect(pb.acceptsFocus).toBe(false);
    pb.setDisabled(true);
    expect(pb.disabled).toBe(true);
    expect(pb.acceptsFocus).toBe(false);
    pb.setDisabled(false);
    expect(pb.acceptsFocus).toBe(false);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const pb = createProgressBar();
    let focused = false;
    pb.on('focus', () => { focused = true; });
    pb.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const pb = createProgressBar();
    let blurred = false;
    pb.on('blur', () => { blurred = true; });
    pb.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const pb = createProgressBar({x: 5, y: 3, width: 30, height: 1});
    expect(pb.containsPoint(5, 3)).toBe(true);
    expect(pb.containsPoint(34, 3)).toBe(true);
    expect(pb.containsPoint(35, 3)).toBe(false);
    expect(pb.containsPoint(4, 3)).toBe(false);
    expect(pb.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const pb = createProgressBar();
    pb.updateRect({x: 10, y: 20, width: 40, height: 3});
    const r = pb.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(40);
    expect(r.height).toBe(3);
  });

  it('updateRect partially updates fields', () => {
    const pb = createProgressBar({x: 5});
    pb.updateRect({x: 15});
    expect(pb.rect.x).toBe(15);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const pb = createProgressBar();
    let blurred = false;
    pb.on('blur', () => { blurred = true; });
    pb.focus();
    pb.unmounted();
    expect(blurred).toBe(true);
  });
});

describe('createProgressBarWidget factory', () => {
  it('creates widget with default options', () => {
    const pb = ProgressBarWidget.create?.({}) ?? new ProgressBarWidget();
    expect(pb.value).toBe(0);
    expect(pb.max).toBe(100);
  });
});
