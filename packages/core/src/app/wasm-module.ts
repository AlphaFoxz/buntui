import {TuiDataViewWrapper} from '../extern/TuiDataViewWrapper';

export type WasmExports = {
  memory: WebAssembly.Memory;
  allocWasmBuffer(size: number): number;
  deallocWasmBuffer(ptr: number, size: number): void;
  createTuiContext(): number;
  updateTuiContext(
    ctx: number,
    tick: bigint,
    x: number,
    y: number,
    rows: number,
    cols: number,
    resizeBehavior: number,
    debugMode: number,
  ): void;
  destroyTuiContext(ctx: number): void;
  renderDrawListToBuffer(ctx: number, bufPtr: number, bufLength: number): void;
  getOutputPtr(): number;
  getOutputLen(): number;
  setTerminalSize(ctx: number, rows: number, cols: number): void;
};

let linkedMemory: WebAssembly.Memory | undefined;

function dv(): TuiDataViewWrapper {
  return new TuiDataViewWrapper(linkedMemory!.buffer);
}

const WASI_ESUCCESS = 0;
const WASI_EBADF = 8;

function createWasiImports(): Record<string, Record<string, (...args: number[]) => number | void>> {
  return {
    wasi_snapshot_preview1: {
      args_get: (): number => WASI_ESUCCESS,
      args_sizes_get(_p: number, _q: number): number {
        dv().setUint32(_p, 0, true);
        dv().setUint32(_q, 0, true);
        return WASI_ESUCCESS;
      },
      clock_res_get(_id: number, out: number): number {
        dv().setBigUint64(out, 1_000_000n, true);
        return WASI_ESUCCESS;
      },
      clock_time_get(_id: number, _precision: number, out: number): number {
        dv().setBigUint64(out, BigInt(Date.now()) * 1_000_000n, true);
        return WASI_ESUCCESS;
      },
      fd_close: (): number => WASI_EBADF,
      fd_fdstat_get: (): number => WASI_EBADF,
      fd_fdstat_set_flags: (): number => WASI_EBADF,
      fd_filestat_get: (): number => WASI_EBADF,
      fd_filestat_set_size: (): number => WASI_EBADF,
      fd_filestat_set_times: (): number => WASI_EBADF,
      fd_pread: (): number => WASI_EBADF,
      fd_prestat_get: (): number => WASI_EBADF,
      fd_prestat_dir_name: (): number => WASI_EBADF,
      fd_pwrite: (): number => WASI_EBADF,
      fd_read: (): number => WASI_EBADF,
      fd_readdir: (): number => WASI_EBADF,
      fd_seek: (): number => WASI_EBADF,
      fd_sync: (): number => WASI_EBADF,
      fd_write(_fd: number, iovs: number, iovsLength: number, out: number): number {
        const v = dv();
        let written = 0;
        for (let i = 0; i < iovsLength; i++) {
          const base = iovs + (i * 8);
          written += v.getUint32(base + 4, true);
        }

        v.setUint32(out, written, true);
        return WASI_ESUCCESS;
      },
      path_create_directory: (): number => WASI_EBADF,
      path_filestat_get: (): number => WASI_EBADF,
      path_filestat_set_times: (): number => WASI_EBADF,
      path_link: (): number => WASI_EBADF,
      path_open: (): number => WASI_EBADF,
      path_readlink: (): number => WASI_EBADF,
      path_remove_directory: (): number => WASI_EBADF,
      path_rename: (): number => WASI_EBADF,
      path_symlink: (): number => WASI_EBADF,
      path_unlink_file: (): number => WASI_EBADF,
      poll_oneoff(_in: number, _out: number, _n: number, outCount: number): number {
        dv().setUint32(outCount, 0, true);
        return WASI_ESUCCESS;
      },
      proc_exit(code: number) {
        throw new Error(`WASM proc_exit(${code})`);
      },
      random_get(buf: number, length: number): number {
        const v = dv();
        for (let i = 0; i < length; i++) {
          v.setUint8(buf + i, (Math.random() * 256) | 0);
        }

        return WASI_ESUCCESS;
      },
    },
  };
}

export class WasmModule {
  #exports: WasmExports | undefined;
  #memory: WebAssembly.Memory | undefined;

  get ready(): boolean {
    return this.#exports !== undefined;
  }

  get exports(): WasmExports {
    if (!this.#exports) {
      throw new Error('WASM module not loaded. Call load() first.');
    }

    return this.#exports;
  }

  get memory(): WebAssembly.Memory {
    if (!this.#memory) {
      throw new Error('WASM module not loaded. Call load() first.');
    }

    return this.#memory;
  }

  async load(source: Response | Promise<Response>): Promise<void> {
    const response = await source;
    const importObject = createWasiImports();
    const result = await WebAssembly.instantiateStreaming(response, importObject);
    const instance = 'instance' in result ? result.instance : result;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#exports = instance.exports as unknown as WasmExports;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#memory = instance.exports.memory as WebAssembly.Memory;
    linkedMemory = this.#memory;
  }

  loadFromBuffer(buffer: ArrayBuffer | ArrayBufferView): void {
    const raw = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
    const mod = new WebAssembly.Module(raw);
    const importObject = createWasiImports();
    const instance = new WebAssembly.Instance(mod, importObject);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#exports = instance.exports as unknown as WasmExports;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#memory = instance.exports.memory as WebAssembly.Memory;
    linkedMemory = this.#memory;
  }

  alloc(size: number): number {
    return this.exports.allocWasmBuffer(size);
  }

  dealloc(ptr: number, size: number): void {
    this.exports.deallocWasmBuffer(ptr, size);
  }

  copyToWasm(jsBuffer: ArrayBuffer | ArrayBufferView, wasmPtr: number): void {
    const source = ArrayBuffer.isView(jsBuffer)
      ? new Uint8Array(jsBuffer.buffer, jsBuffer.byteOffset, jsBuffer.byteLength)
      : new Uint8Array(jsBuffer);
    const dest = new Uint8Array(this.memory.buffer, wasmPtr, source.byteLength);
    dest.set(source);
  }

  readString(ptr: number, length: number): string {
    const bytes = new Uint8Array(this.memory.buffer, ptr, length);
    return new TextDecoder('utf-8').decode(bytes);
  }
}
