<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ref, onMounted, onUnmounted } from 'vue'
import { createApp, HtmlBackend, WasmModule, createBox, createTextWidget, onTick, type TuiScene } from '@buntui/core'

const termRef = ref<HTMLDivElement | null>(null)

let term: Terminal
let fitAddon: FitAddon
let app: ReturnType<typeof createApp> | undefined

function handleResize() {
    fitAddon.fit()
}

onMounted(async () => {
    term = new Terminal({
        theme: {
            background: '#1a1b26',
            foreground: '#c0caf5',
            cursor: '#c0caf5',
        },
        cursorBlink: true,
    })
    fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.value ?? document.createElement('div'))
    fitAddon.fit()
    window.addEventListener('resize', handleResize)

    const wasm = new WasmModule()
    await wasm.load(fetch('/buntui.wasm'))

    const backend = new HtmlBackend({ terminal: term, wasmModule: wasm })
    app = createApp({ backend, logLevel: 'debug', debugMode: true, tickRate: 60, renderRate: 30 })

    const sceneModule = {
        setup(scene: TuiScene) {
            const title = createTextWidget({ value: ' BuntUI Browser Demo ', colorFg: '#7aa2f7' })
            const titleBox = createBox({
                x: 1,
                y: 1,
                width: '100%-2',
                height: 1,
                colorBg: '#1a1b26',
                direction: 'horizontal',
                align: 'center',
            })
            titleBox.addChild(title)
            scene.mount(titleBox)

            const counterText = createTextWidget({ value: 'Tick: 0', colorFg: '#9ece6a' })
            const counterBox = createBox({
                x: 1,
                y: 3,
                width: 30,
                height: 3,
                border: true,
                borderStyle: 'rounded',
                draggable: true,
                direction: 'vertical',
                align: 'center',
            })
            counterBox.addChild(counterText)
            scene.mount(counterBox)

            const infoText = createTextWidget({ value: 'Rendering via WASM + xterm.js', colorFg: '#565f89' })
            const infoBox = createBox({
                x: 32,
                y: 3,
                width: 35,
                height: 3,
                border: true,
                borderStyle: 'solid',
                borderColor: '#bb9af7',
                direction: 'vertical',
                align: 'center',
            })
            infoBox.addChild(infoText)
            scene.mount(infoBox)

            let count = 0
            onTick(() => {
                count++
                counterText.updateValue(`Tick: ${count}`)
            })
        },
    }

    app.createScene(sceneModule, { visible: true })
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
.xterm .xterm-viewport {
    overflow: auto !important;
}
.terminal {
    width: 100%;
    height: 100%;
}
</style>
