# Roadmap

Vision: a Vite + Vue-like DX for building terminal UI apps that run on Bun.

Last updated: 2026-04-20

## Phase 0 — Make the core work (current phase) — [#10](https://github.com/AlphaFoxz/term-bed/issues/10)

Goal: a working imperative API — create app, mount text widgets, see output, handle keyboard.

| # | Task | Status |
|---|------|--------|
| 0-1 | Complete rasterization system (draw text/border/shadow into cells) | Not started |
| 0-2 | Fix text component pointer transfer (TS → Zig) | Not started |
| 0-3 | Wire event processing into app loop | Not started |
| 0-4 | Fix event header size mismatch (12 → 16 bytes on TS side) | Not started |
| 0-5 | Scene background color from parameter, not hard-coded | Not started |
| 0-6 | End-to-end smoke test: render a TextWidget and verify output | Not started |

## Phase 1 — Cross-platform support — [#12](https://github.com/AlphaFoxz/term-bed/issues/12)

Goal: run on Linux and macOS in addition to Windows.

| # | Task | Status |
|---|------|--------|
| 1-1 | Implement POSIX raw-mode terminal setup (`termios`) | Not started |
| 1-2 | Implement POSIX input listener (stdin read, ANSI escape parsing) | Not started |
| 1-3 | Platform-agnostic terminal size detection | Not started |
| 1-4 | CI: test build on Linux and macOS | Not started |

## Phase 2 — Widget library — [#11](https://github.com/AlphaFoxz/term-bed/issues/11)

Goal: a usable set of built-in widgets beyond plain text.

| # | Task | Status |
|---|------|--------|
| 2-1 | Box / Panel widget (rect + border + optional title) | Not started |
| 2-2 | Flex / Stack layout engine | Not started |
| 2-3 | Input / TextField widget | Not started |
| 2-4 | List / Select widget | Not started |
| 2-5 | Progress bar widget | Not started |
| 2-6 | Scroll / Viewport widget | Not started |

## Phase 3 — Reactive binding layer — [#13](https://github.com/AlphaFoxz/term-bed/issues/13)

Goal: widgets automatically re-render when reactive state changes.

| # | Task | Status |
|---|------|--------|
| 3-1 | Integrate `@vue/reactivity` with widget props (ref → component update) | Not started |
| 3-2 | Implement `computed` / `watch` / `watchEffect` helpers | Not started |
| 3-3 | Automatic dirty-marking when reactive state mutates | Not started |
| 3-4 | Batch updates within a single tick | Not started |

## Phase 4 — Declarative API (SFC / JSX) — [#14](https://github.com/AlphaFoxz/term-bed/issues/14)

Goal: write UIs with Vue-like template syntax as shown in USAGE.md.

| # | Task | Status |
|---|------|--------|
| 4-1 | Design component descriptor format (`defineComponent`-like API) | Not started |
| 4-2 | Build a Vite plugin that compiles `.vue` SFCs to term-bed render functions | Not started |
| 4-3 | Template compiler: `<text>`, `<scene>`, `<box>` → imperative mount calls | Not started |
| 4-4 | Event binding syntax (`@keydown`, `@click`) | Not started |
| 4-5 | Prop binding (`:x`, `:y`, `v-if`, `v-for`) | Not started |
| 4-6 | `bun run dev` dev server with HMR | Not started |

## Phase 5 — Ecosystem — [#15](https://github.com/AlphaFoxz/term-bed/issues/15)

Goal: publishable package with good DX.

| # | Task | Status |
|---|------|--------|
| 5-1 | CLI scaffolding tool (`bunx create-term-bed`) | Not started |
| 5-2 | Pre-built binary distribution (npm package with pre-compiled .dll/.so/.dylib) | Not started |
| 5-3 | Documentation site | Not started |
| 5-4 | Plugin system (custom widgets, middleware) | Not started |
| 5-5 | DevTools (widget inspector, state viewer) | Not started |

## Dependency graph

```
Phase 0 (core works)          #10
  └→ Phase 1 (cross-platform)   #12
      └→ Phase 2 (widget library)  #11
          └→ Phase 3 (reactive bindings)  #13
              └→ Phase 4 (declarative API)   #14
                  └→ Phase 5 (ecosystem)       #15
```

Phases 0–1 are foundational and must be sequential. Phases 2 and 3 can proceed in parallel once Phase 1 is done.
