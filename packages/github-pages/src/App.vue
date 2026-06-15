<script setup lang="ts">
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { ref, onMounted, onUnmounted } from 'vue'

type WebApp = Awaited<ReturnType<(typeof import('@buntui/playground-wasm'))['createWebApp']>>

const termRef = ref<HTMLDivElement | null>(null)

let term: Terminal | undefined
let fitAddon: FitAddon | undefined
let app: WebApp | undefined

function handleResize() {
    fitAddon?.fit()
}

onMounted(async () => {
    const [{ Terminal: XTerm }, { FitAddon: FitAddonCtor }, { createWebApp, RECOMMENDED_FONTS }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@buntui/playground-wasm'),
    ])

    term = new XTerm({
        fontFamily: RECOMMENDED_FONTS.join(', '),
        cursorBlink: true,
    })
    fitAddon = new FitAddonCtor()
    term.loadAddon(fitAddon)
    term.open(termRef.value ?? document.createElement('div'))
    fitAddon.fit()
    window.addEventListener('resize', handleResize)

    app = await createWebApp(term, {
        wasmUrl: `${import.meta.env.BASE_URL}buntui.wasm`,
    })
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
