<script setup lang="ts">
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { ref, onMounted, onUnmounted } from 'vue'

type TuiAppInstance = ReturnType<(typeof import('@buntui/core'))['createApp']>

const termRef = ref<HTMLDivElement | null>(null)

let term: Terminal | undefined
let fitAddon: FitAddon | undefined
let app: TuiAppInstance | undefined

function handleResize() {
    fitAddon?.fit()
}

onMounted(async () => {
    const [
        { Terminal: XTerm },
        { FitAddon: FitAddonCtor },
        { createApp, HtmlBackend, WasmModule, animationFrameScheduler },
        { App: TuiApp },
    ] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@buntui/core'),
        import('@buntui/playground-wasm/dist/main.js'),
    ])

    term = new XTerm({
        fontFamily: 'Cascadia Code, SF Mono, Menlo, Consolas, Liberation Mono, Courier New, monospace',
        cursorBlink: true,
    })
    fitAddon = new FitAddonCtor()
    term.loadAddon(fitAddon)
    term.open(termRef.value ?? document.createElement('div'))
    fitAddon.fit()
    window.addEventListener('resize', handleResize)

    const wasm = new WasmModule()
    const wasmUrl = `${import.meta.env.BASE_URL}buntui.wasm`
    await wasm.load(fetch(wasmUrl))

    const backend = new HtmlBackend({
        terminal: term,
        wasmModule: wasm,
        isTextInputFocused: () => {
            const w = app?.focusedWidget
            return w !== null && w !== undefined && 'getSelection' in w
        },
    })
    app = createApp({
        backend,
        logLevel: 'info',
        tickRate: 60,
        renderRate: 30,
        scheduler: animationFrameScheduler,
    })

    app.createScene(TuiApp, { visible: true })
    app.start()
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    app?.dispose()
    term?.dispose()
})
</script>

<template>
    <div ref="termRef" class="terminal"></div>
</template>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #1a1b26;
}
.terminal {
    width: 100%;
    height: 100%;
}
</style>
