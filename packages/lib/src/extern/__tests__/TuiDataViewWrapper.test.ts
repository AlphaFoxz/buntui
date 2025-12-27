import {it, expect} from 'bun:test';
import {ptr} from 'bun:ffi';
import {TuiDataViewWrapper} from '../TuiDataViewWrapper';

it('TuiDataView', () => {
  const buffer = new ArrayBuffer(16);
  const dataViewWrapper = new TuiDataViewWrapper(buffer);
  expect(dataViewWrapper.dataView.byteLength).toBe(16);

  dataViewWrapper.setBool(0, true);
  const b = dataViewWrapper.getBool(0);
  expect(b).toBe(true);

  const p = ptr(buffer);
  dataViewWrapper.setPointer(1, p);
  expect(p === dataViewWrapper.getPointer(1));
});

