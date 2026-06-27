# Third-Party License Notices

This document lists all third-party software components used by the buntui
project, along with their licenses and copyright information.

buntui itself is licensed under the [Apache License, Version 2.0](./LICENSE).

---

## Summary

| License | Components |
|---|---|
| MIT | @vue/compiler-core, @vue/compiler-sfc, @vue/reactivity, @vue/shared, commander, sucrase, string-width, vite, @xterm/xterm, @xterm/addon-fit, vue, @types/bun, xo, vue-tsc |
| Apache-2.0 | typescript |

All listed licenses are compatible with the Apache License, Version 2.0.

---

## Runtime Dependencies

These dependencies are declared by the published packages
(`@buntui/core`, `@buntui/compiler`, `@buntui/cli`, `@buntui/extensions`,
`@buntui/buntui`, `@buntui/create-buntui`) and are distributed to end users.

### @vue/compiler-core

- **Version:** 3.5.39
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vuejs/core
- **License File:** `node_modules/@vue/compiler-core/LICENSE`

### @vue/compiler-sfc

- **Version:** 3.5.39
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vuejs/core
- **License File:** `node_modules/@vue/compiler-sfc/LICENSE`

### @vue/reactivity

- **Version:** 3.5.39
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vuejs/core
- **License File:** `node_modules/@vue/reactivity/LICENSE`

### @vue/shared

- **Version:** 3.5.39
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vuejs/core
- **License File:** `node_modules/@vue/shared/LICENSE`

### commander

- **Version:** 15.0.0
- **License:** MIT
- **Author:** TJ Holowaychuk <tj@vision-media.ca>
- **Repository:** https://github.com/tj/commander.js
- **License File:** `node_modules/commander/LICENSE`

### sucrase

- **Version:** 3.35.1
- **License:** MIT
- **Author:** Alan Pierce <alangpierce@gmail.com>
- **Repository:** https://github.com/alangpierce/sucrase
- **License File:** `node_modules/sucrase/LICENSE`

### string-width

- **Version:** 8.2.1
- **License:** MIT
- **Author:** Sindre Sorhus <sindresorhus@gmail.com>
- **Repository:** https://github.com/sindresorhus/string-width
- **License File:** `node_modules/string-width/license`

### vite

- **Version:** 8.1.0
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vitejs/vite
- **License File:** `node_modules/vite/LICENSE.md`

> `vite` is a peer dependency of `@buntui/cli`.

---

## Playground / Web Demo Dependencies

These dependencies are used by the private `playground-wasm` and `github-pages`
packages. They are bundled into the web demo distributed via GitHub Pages.

### @xterm/xterm

- **Version:** 6.0.0
- **License:** MIT
- **Author:** The xterm.js authors
- **Repository:** https://github.com/xtermjs/xterm.js
- **License File:** `node_modules/@xterm/xterm/LICENSE`

### @xterm/addon-fit

- **Version:** 0.11.0
- **License:** MIT
- **Author:** The xterm.js authors
- **Repository:** https://github.com/xtermjs/xterm.js
- **License File:** `node_modules/@xterm/addon-fit/LICENSE`

### vue

- **Version:** 3.5.39
- **License:** MIT
- **Author:** Yuxi (Evan) You
- **Repository:** https://github.com/vuejs/core
- **License File:** `node_modules/vue/LICENSE`

---

## Development Dependencies

These dependencies are used only for development (building, linting, type
checking) and are not distributed to end users.

### @types/bun

- **Version:** 1.3.14
- **License:** MIT
- **Repository:** https://github.com/DefinitelyTyped/DefinitelyTyped
- **License File:** `node_modules/@types/bun/LICENSE`

### typescript

- **Version:** 6.0.3
- **License:** Apache-2.0
- **Author:** Microsoft Corp.
- **Repository:** https://github.com/microsoft/TypeScript
- **License File:** `node_modules/typescript/LICENSE.txt`

### xo

- **Version:** 3.0.2
- **License:** MIT
- **Author:** Sindre Sorhus <sindresorhus@gmail.com>
- **Repository:** https://github.com/xojs/xo
- **License File:** `node_modules/xo/license`

### vue-tsc

- **Version:** 3.3.5
- **License:** MIT
- **Repository:** https://github.com/vuejs/language-tools
- **License File:** `node_modules/vue-tsc/LICENSE`

---

## License Texts

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Apache License, Version 2.0

See https://www.apache.org/licenses/LICENSE-2.0 for the full text.
