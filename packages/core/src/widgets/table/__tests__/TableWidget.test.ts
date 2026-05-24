import {it, expect, describe} from 'bun:test';
import {TableWidget} from '../TableWidget';
import type {KeyboardEvent} from '../../../events/types';

function key(options: Partial<KeyboardEvent> & {key: string}): KeyboardEvent {
  return {
    key: options.key,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
    repeat: options.repeat ?? false,
    charCode: options.charCode ?? 0,
  };
}

function createTable(options?: {
  columns?: Array<{key: string; label?: string; width?: number; align?: 'left' | 'center' | 'right'}>;
  rows?: Array<Record<string, unknown>>;
  width?: number;
  height?: number;
}) {
  return new TableWidget({
    width: options?.width ?? 40,
    height: options?.height ?? 10,
    columns: options?.columns ?? [
      {key: 'name', label: 'Name', width: 15},
      {key: 'age', label: 'Age', width: 5, align: 'right'},
      {key: 'city', label: 'City', width: 15},
    ],
    rows: options?.rows ?? [
      {name: 'Alice', age: 30, city: 'Beijing'},
      {name: 'Bob', age: 25, city: 'Shanghai'},
      {name: 'Charlie', age: 35, city: 'Guangzhou'},
    ],
  });
}

describe('construction', () => {
  it('creates with default options', () => {
    const table = createTable();
    expect(table.rows).toHaveLength(3);
    expect(table.columns).toHaveLength(3);
  });

  it('accepts focus', () => {
    expect(createTable().acceptsFocus).toBe(true);
  });

  it('creates with empty rows', () => {
    const table = createTable({rows: []});
    expect(table.rows).toHaveLength(0);
    expect(table.selectedIndex).toBe(-1);
  });
});

describe('columns', () => {
  it('resolves column labels from key', () => {
    const table = createTable({columns: [{key: 'foo'}]});
    expect(table.columns[0]!.label).toBe('foo');
  });

  it('preserves explicit column labels', () => {
    const table = createTable({columns: [{key: 'foo', label: 'Foo Bar'}]});
    expect(table.columns[0]!.label).toBe('Foo Bar');
  });

  it('defaults alignment to left', () => {
    const table = createTable({columns: [{key: 'foo'}]});
    expect(table.columns[0]!.align).toBe('left');
  });

  it('sets columns via setColumns', () => {
    const table = createTable({columns: []});
    table.setColumns([{key: 'a'}, {key: 'b'}]);
    expect(table.columns).toHaveLength(2);
  });
});

describe('rows', () => {
  it('returns rows', () => {
    const table = createTable({
      rows: [
        {name: 'X', age: 1, city: 'Y'},
        {name: 'Z', age: 2, city: 'W'},
      ],
    });
    expect(table.rows).toHaveLength(2);
  });

  it('updates rows via setRows', () => {
    const table = createTable();
    table.setRows([{name: 'New', age: 99, city: 'Town'}]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.name).toBe('New');
  });

  it('updates via setOptions', () => {
    const table = createTable();
    table.setOptions({
      columns: [{key: 'x'}],
      rows: [{x: 'hello'}, {x: 'world'}],
    });
    expect(table.columns).toHaveLength(1);
    expect(table.rows).toHaveLength(2);
  });
});

describe('row selection', () => {
  it('ArrowDown selects first row', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    expect(table.selectedIndex).toBe(0);
  });

  it('ArrowDown moves through rows', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    table.handleActiveKey(key({key: 'ArrowDown'}));
    expect(table.selectedIndex).toBe(1);
  });

  it('ArrowUp moves back', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    table.handleActiveKey(key({key: 'ArrowDown'}));
    table.handleActiveKey(key({key: 'ArrowUp'}));
    expect(table.selectedIndex).toBe(0);
  });

  it('ArrowUp at first row does nothing', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    table.handleActiveKey(key({key: 'ArrowUp'}));
    expect(table.selectedIndex).toBe(0);
  });

  it('ArrowDown at last row does nothing', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'End'}));
    table.handleActiveKey(key({key: 'ArrowDown'}));
    expect(table.selectedIndex).toBe(2);
  });

  it('Home selects first row', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'End'}));
    table.handleActiveKey(key({key: 'Home'}));
    expect(table.selectedIndex).toBe(0);
  });

  it('End selects last row', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'End'}));
    expect(table.selectedIndex).toBe(2);
  });

  it('PageDown moves by viewport height', () => {
    const rows = Array.from({length: 50}, (_, i) => ({name: `Item ${i}`, age: i, city: 'City'}));
    const table = createTable({rows, height: 10});
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    table.handleActiveKey(key({key: 'PageDown'}));
    expect(table.selectedIndex).toBeGreaterThan(0);
  });

  it('PageUp moves back', () => {
    const rows = Array.from({length: 50}, (_, i) => ({name: `Item ${i}`, age: i, city: 'City'}));
    const table = createTable({rows, height: 10});
    table.focus();
    table.handleActiveKey(key({key: 'End'}));
    table.handleActiveKey(key({key: 'PageUp'}));
    expect(table.selectedIndex).toBeLessThan(49);
  });

  it('selectedRow returns selected data', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    const row = table.selectedRow;
    expect(row).toBeDefined();
    expect(row!.name).toBe('Alice');
  });

  it('selectedRow is undefined when nothing selected', () => {
    const table = createTable();
    expect(table.selectedRow).toBeUndefined();
  });
});

describe('events', () => {
  it('dispatches rowSelect on ArrowDown', () => {
    const table = createTable();
    table.focus();
    let event: unknown;
    table.on('rowSelect', data => {
      event = data;
    });
    table.handleActiveKey(key({key: 'ArrowDown'}));
    expect(event).toBeDefined();
    expect((event as {index: number}).index).toBe(0);
  });

  it('dispatches rowActivate on Enter', () => {
    const table = createTable();
    table.focus();
    table.handleActiveKey(key({key: 'ArrowDown'}));
    let event: unknown;
    table.on('rowActivate', data => {
      event = data;
    });
    table.handleActiveKey(key({key: 'Enter'}));
    expect(event).toBeDefined();
    expect((event as {index: number}).index).toBe(0);
  });
});

describe('scrolling', () => {
  it('scrolls to keep selected row visible', () => {
    const rows = Array.from({length: 20}, (_, i) => ({name: `Item ${i}`, age: i, city: 'City'}));
    const table = createTable({rows, height: 8});
    table.focus();
    table.handleActiveKey(key({key: 'End'}));
    expect(table.selectedIndex).toBe(19);
  });

  it('scrollTo clamps to valid range', () => {
    const rows = Array.from({length: 20}, (_, i) => ({name: `Item ${i}`, age: i, city: 'City'}));
    const table = createTable({rows, height: 8});
    table.scrollTo(1000);
  });

  it('scrollBy scrolls by delta', () => {
    const rows = Array.from({length: 20}, (_, i) => ({name: `Item ${i}`, age: i, city: 'City'}));
    const table = createTable({rows, height: 8});
    table.scrollBy(5);
    table.scrollBy(-2);
  });
});

describe('rect and updateRect', () => {
  it('returns correct rect', () => {
    const table = createTable();
    const rect = table.rect;
    expect(rect.width).toBe(40);
    expect(rect.height).toBe(10);
  });

  it('updates rect', () => {
    const table = createTable();
    table.updateRect({width: 60, height: 15});
    expect(table.rect.width).toBe(60);
    expect(table.rect.height).toBe(15);
  });
});
