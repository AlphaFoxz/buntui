<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ref, onMounted, onUnmounted } from 'vue'
import { createApp, HtmlBackend, WasmModule, animationFrameScheduler } from '@buntui/core'
import { App as TuiApp } from '@buntui/playground-wasm/dist/main.js'

const termRef = ref<HTMLDivElement | null>(null)

let term: Terminal
let fitAddon: FitAddon
let app: ReturnType<typeof createApp> | undefined

function handleResize() {
    fitAddon.fit()
}

onMounted(async () => {
    term = new Terminal({
        fontFamily: 'Cascadia Code, JetBrains Mono, Fira Code, monospace',
        cursorBlink: true,
    })
    fitAddon = new FitAddon()
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
