export type WasmExports = {
  memory: WebAssembly.Memory;
  allocWasmBuffer(size: number): number;
  deallocWasmBuffer(ptr: number, size: number): void;
  createTuiContext(): number;
  updateTuiContext(
    ctx: number,
    tick: number,
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
    const result = await WebAssembly.instantiateStreaming(response);
    const instance = 'instance' in result ? result.instance : result;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#exports = instance.exports as unknown as WasmExports;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#memory = instance.exports.memory as WebAssembly.Memory;
  }

  loadFromBuffer(buffer: ArrayBuffer | ArrayBufferView): void {
    const raw = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
    const mod = new WebAssembly.Module(raw);
    const instance = new WebAssembly.Instance(mod);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#exports = instance.exports as unknown as WasmExports;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    this.#memory = instance.exports.memory as WebAssembly.Memory;
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
