import {it, expect, describe} from 'bun:test';
import {effect, reactive} from '@vue/reactivity';
import {defineProps} from '../define-props';
import {runSetup} from '../scene-context';
import {setCurrentProps} from '../scene-context';
import {TuiScene} from '../../extern/app/TuiScene';

describe('defineProps', () => {
  it('returns defaults when no parent props', () => {
    setCurrentProps(undefined);
    const props = defineProps({
      title: {type: String, default: 'hello'},
      count: {type: Number, default: 0},
    });
    expect(props.title).toBe('hello');
    expect(props.count).toBe(0);
    setCurrentProps(undefined);
  });

  it('returns parent prop values over defaults', () => {
    setCurrentProps({title: 'world'});
    const props = defineProps({
      title: {type: String, default: 'hello'},
      count: {type: Number, default: 0},
    });
    expect(props.title).toBe('world');
    expect(props.count).toBe(0);
    setCurrentProps(undefined);
  });

  it('returns empty object when no options and no parent props', () => {
    setCurrentProps(undefined);
    const props = defineProps();
    expect(Object.keys(props)).toEqual([]);
    setCurrentProps(undefined);
  });

  it('passes through parent props when no options', () => {
    setCurrentProps({foo: 'bar', baz: 42});
    const props = defineProps();
    expect(props.foo).toBe('bar');
    expect(props.baz).toBe(42);
    setCurrentProps(undefined);
  });

  it('calls factory default functions', () => {
    setCurrentProps(undefined);
    const props = defineProps({
      items: {type: Array, default: () => [1, 2, 3]},
    });
    expect(props.items).toEqual([1, 2, 3]);
    setCurrentProps(undefined);
  });

  it('handles shorthand type syntax (no default)', () => {
    setCurrentProps(undefined);
    const props = defineProps({
      title: String,
      count: Number,
    });
    expect(props.title).toBeUndefined();
    expect(props.count).toBeUndefined();
    setCurrentProps(undefined);
  });

  it('does not override parent prop with default when parent value is defined', () => {
    setCurrentProps({title: 'from-parent'});
    const props = defineProps({
      title: {type: String, default: 'default-val'},
    });
    expect(props.title).toBe('from-parent');
    setCurrentProps(undefined);
  });

  it('applies default when parent prop value is undefined', () => {
    setCurrentProps({title: undefined});
    const props = defineProps({
      title: {type: String, default: 'fallback'},
    });
    expect(props.title).toBe('fallback');
    setCurrentProps(undefined);
  });

  it('returns reactive object', () => {
    setCurrentProps(undefined);
    const props = defineProps({
      count: {type: Number, default: 0},
    });

    let tracked: number | undefined;
    effect(() => {
      tracked = props.count;
    });
    expect(tracked).toBe(0);

    props.count = 42;
    expect(tracked).toBe(42);
    setCurrentProps(undefined);
  });

  it('preserves reactivity from parent reactive props object', () => {
    const parentProps = reactive<Record<string, unknown>>({count: 0});
    setCurrentProps(parentProps);
    const props = defineProps({
      count: {type: Number, default: 0},
    });

    let tracked: number | undefined;
    effect(() => {
      tracked = props.count;
    });
    expect(tracked).toBe(0);

    parentProps.count = 99;
    expect(tracked).toBe(99);
    setCurrentProps(undefined);
  });

  it('works inside runSetup with props argument', () => {
    const scene = new TuiScene();
    let captured: Record<string, unknown> | undefined;

    runSetup(scene, () => {
      captured = defineProps({
        title: {type: String, default: 'fallback'},
      });
    }, {title: 'from-parent'});

    expect(captured).toBeDefined();
    expect(captured!.title).toBe('from-parent');
  });

  it('merges defaults for missing keys when parent provides partial props', () => {
    setCurrentProps({title: 'hello'});
    const props = defineProps({
      title: {type: String, default: 'default-title'},
      subtitle: {type: String, default: 'default-subtitle'},
    });
    expect(props.title).toBe('hello');
    expect(props.subtitle).toBe('default-subtitle');
    setCurrentProps(undefined);
  });
});
