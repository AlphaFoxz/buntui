# Build and Test Workflow

## Build Commands

```bash
# Build everything in correct dependency order
bun run build

# Build individual packages
bun run --cwd ./packages/native build       # zig build
bun run --cwd ./packages/core build         # sync binary + build TS
bun run --cwd ./packages/compiler build     # build SFC compiler
bun run --cwd ./packages/playground build   # sync binary + build TS

# Run playground demo
bun run dev

# Sync version across all package.json files
bun run sync
```

## Build Order (topological)

The build must follow this exact order due to dependencies:

1. **sync-version** (`scripts/sync-version.ts`) - propagates root version to all packages
2. **native** (`packages/native/`) - `zig build` produces shared library in `zig-out/bin/`
3. **core** (`packages/core/`) - syncs native binary to `src/utils/`, then builds TypeScript
4. **compiler** (`packages/compiler/`) - builds SFC compiler (depends on `core`)
5. **playground** (`packages/playground/`) - syncs native binary, then builds TypeScript

The topological sort is handled by `scripts/build.ts`.

## Native Binary Distribution

The compiled shared library (`buntui.dll` / `buntui.dylib` / `buntui.so`) is:

1. Built by `zig build` into `packages/native/zig-out/bin/`
2. Copied to `packages/core/src/utils/` and `packages/core/dist/` by `packages/core/scripts/sync.ts`
3. Copied to `packages/playground/` by `packages/playground/scripts/sync.ts`

On Windows, the `.pdb` file is also synced.

## DLL Path Resolution

`fetchDllPath()` in `packages/core/src/utils/ffi.ts` searches in this order:

1. `path.dirname(Bun.main)` - same directory as the entry script
2. `import.meta.dir` - same directory as the importing module (i.e. `packages/core/src/utils/`)
3. OS `PATH` environment variable (fallback, not yet implemented)

## Testing

```bash
bun run --cwd ./packages/core test
```

- Test framework: Bun's built-in test runner (`bun test`)
- Test files: placed in `__tests__/` directories next to the source
- Test patterns: `*.test.ts`

### Test conventions

- Use `it()` and `expect()` from Bun test runner
- Focus areas: FFI boundary, memory layout, type validation
- Example test files:
  - `packages/core/src/extern/__tests__/TuiDataViewWrapper.test.ts`
  - `packages/core/src/extern/__tests__/render.test.ts`
  - `packages/core/src/utils/__tests__/ffi.test.ts`
  - `packages/core/src/utils/__tests__/genId.test.ts`
  - `packages/core/src/utils/__tests__/styles.test.ts`

## Linting

There is no `lint` script in package.json. XO is a devDependency for programmatic use. Configuration is in `xo.config.ts` at the project root.

## Version Sync

```bash
bun run sync
```

Runs `scripts/sync-version.ts` which reads `version` from the root `package.json` and writes it to all workspace `package.json` files.
