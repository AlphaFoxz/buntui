import {it, expect, describe} from 'bun:test';
import {ProgressWidget} from '../ProgressWidget';

function createProgress(options?: {
  value?: number;
  max?: number;
  disabled?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  return new ProgressWidget({
    value: options?.value,
    max: options?.max ?? 1,
    disabled: options?.disabled ?? false,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 30,
    height: options?.height ?? 1,
  });
}

describe('construction', () => {
  it('initializes indeterminate when no value', () => {
    const pb = new ProgressWidget();
    expect(pb.value).toBeUndefined();
    expect(pb.indeterminate).toBe(true);
    expect(pb.max).toBe(1);
    expect(pb.disabled).toBe(false);
    expect(pb.acceptsFocus).toBe(false);
    const r = pb.rect;
    expect(r.width).toBe(30);
    expect(r.height).toBe(1);
  });

  it('initializes determinate with value', () => {
    const pb = createProgress({value: 0.75, max: 2});
    expect(pb.value).toBe(0.75);
    expect(pb.indeterminate).toBe(false);
    expect(pb.max).toBe(2);
  });

  it('initializes as disabled', () => {
    const pb = createProgress({disabled: true});
    expect(pb.disabled).toBe(true);
  });

  it('clamps initial value above max', () => {
    const pb = createProgress({value: 5, max: 1});
    expect(pb.value).toBe(1);
  });

  it('clamps negative initial value', () => {
    const pb = createProgress({value: -1, max: 1});
    expect(pb.value).toBe(0);
  });

  it('value 0 is determinate, not indeterminate', () => {
    const pb = createProgress({value: 0});
    expect(pb.value).toBe(0);
    expect(pb.indeterminate).toBe(false);
  });
});

describe('updateValue', () => {
  it('sets value within range', () => {
    const pb = createProgress();
    pb.updateValue(0.5);
    expect(pb.value).toBe(0.5);
  });

  it('clamps value above max', () => {
    const pb = createProgress({max: 1});
    pb.updateValue(5);
    expect(pb.value).toBe(1);
  });

  it('clamps value below 0', () => {
    const pb = createProgress({max: 1});
    pb.updateValue(-1);
    expect(pb.value).toBe(0);
  });

  it('undefined switches to indeterminate', () => {
    const pb = createProgress({value: 0.5});
    pb.updateValue(undefined);
    expect(pb.value).toBeUndefined();
    expect(pb.indeterminate).toBe(true);
  });

  it('number switches to determinate', () => {
    const pb = new ProgressWidget();
    pb.updateValue(0.5);
    expect(pb.value).toBe(0.5);
    expect(pb.indeterminate).toBe(false);
  });
});

describe('updateMax', () => {
  it('updates max', () => {
    const pb = createProgress({value: 0.5, max: 1});
    pb.updateMax(2);
    expect(pb.max).toBe(2);
  });

  it('re-clamps current value to new max', () => {
    const pb = createProgress({value: 0.8, max: 1});
    pb.updateMax(0.5);
    expect(pb.value).toBe(0.5);
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const pb = createProgress();
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
    const pb = createProgress();
    let focused = false;
    pb.on('focus', () => { focused = true; });
    pb.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const pb = createProgress();
    let blurred = false;
    pb.on('blur', () => { blurred = true; });
    pb.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const pb = createProgress({x: 5, y: 3, width: 30, height: 1});
    expect(pb.containsPoint(5, 3)).toBe(true);
    expect(pb.containsPoint(34, 3)).toBe(true);
    expect(pb.containsPoint(35, 3)).toBe(false);
    expect(pb.containsPoint(4, 3)).toBe(false);
    expect(pb.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const pb = createProgress();
    pb.updateRect({x: 10, y: 20, width: 40, height: 3});
    const r = pb.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(40);
    expect(r.height).toBe(3);
  });

  it('updateRect partially updates fields', () => {
    const pb = createProgress({x: 5});
    pb.updateRect({x: 15});
    expect(pb.rect.x).toBe(15);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const pb = createProgress();
    let blurred = false;
    pb.on('blur', () => { blurred = true; });
    pb.focus();
    pb.unmounted();
    expect(blurred).toBe(true);
  });
});

describe('indeterminate animation', () => {
  it('defaults to indeterminate when no value', () => {
    const pb = new ProgressWidget();
    expect(pb.indeterminate).toBe(true);
  });

  it('is determinate when value is set', () => {
    const pb = createProgress({value: 0.5});
    expect(pb.indeterminate).toBe(false);
  });

  it('update does nothing when determinate', () => {
    const pb = createProgress({value: 0.5});
    pb.update(16.67);
    expect(pb.value).toBe(0.5);
  });

  it('update does nothing when disabled', () => {
    const pb = new ProgressWidget({disabled: true});
    pb.update(16.67);
    expect(pb.indeterminate).toBe(true);
  });

  it('animation runs without error over many frames', () => {
    const pb = new ProgressWidget({width: 30});
    for (let i = 0; i < 500; i++) {
      pb.update(16.67);
    }

    expect(pb.indeterminate).toBe(true);
  });
});

describe('createProgressWidget factory', () => {
  it('creates widget with default options', () => {
    const pb = new ProgressWidget();
    expect(pb.value).toBeUndefined();
    expect(pb.indeterminate).toBe(true);
    expect(pb.max).toBe(1);
  });
});
