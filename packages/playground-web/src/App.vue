<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

const termRef = useTemplateRef<HTMLDivElement>('term')

let term: Terminal
let fitAddon: FitAddon

function onResize() {
    fitAddon.fit()
}

onMounted(() => {
    term = new Terminal()
    fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.value!)
    fitAddon.fit()
    window.addEventListener('resize', onResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', onUnmounted)
    term.dispose()
})
</script>

<template>
    <div ref="term" class="terminal"></div>
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
}
.xterm .xterm-viewport {
    overflow: auto !important;
}
.terminal {
    width: 100%;
    height: 100%;
}
</style>
