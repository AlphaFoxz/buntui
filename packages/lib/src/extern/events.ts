import {dlopen, FFIType} from 'bun:ffi';
import {fetchDllPath} from '../utils/ffi';

const lib = dlopen(fetchDllPath(), {
  event_bus_setup: {args: [], returns: FFIType.void},
  event_bus_emit: {
    args: [FFIType.u16, FFIType.ptr, FFIType.uint64_t],
    returns: FFIType.i32,
  },
  event_bus_poll: {args: [], returns: FFIType.ptr},
  event_bus_commit: {args: [], returns: FFIType.void},
  event_bus_stats: {args: [FFIType.ptr], returns: FFIType.void},
}).symbols;

const expose = {
  event_bus_setup: lib.event_bus_setup,
  event_bus_emit: lib.event_bus_emit,
  event_bus_poll: lib.event_bus_poll,
  event_bus_commit: lib.event_bus_commit,
  event_bus_stats: lib.event_bus_stats,
};

export default expose;

