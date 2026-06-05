<template>
    <Text :x="2" :y="1" value="Progress" styleModifier="bold" />
    <Text :x="2" :y="2" value="Progress bar with determinate and indeterminate (animated) modes." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="value           number|undefined  Progress value (undefined = indeterminate)" />
    <Text :x="2" :y="6" value="max             number          Maximum value (default: 1)" />
    <Text :x="2" :y="7" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="8" value="width, height    TuiSizeValue    Size" />

    <Text :x="2" :y="10" value="▸ Determinate (0-1 range)" styleModifier="bold" />
    <Text :x="2" :y="11" value="0.3" />
    <Progress :x="6" :y="11" width="20%" :height="1" :value="0.3" />
    <Text x="30%" :y="11" value="0.6" />
    <Progress x="34%" :y="11" width="20%" :height="1" :value="0.6" />
    <Text x="58%" :y="11" value="0.9" />
    <Progress x="62%" :y="11" width="30%" :height="1" :value="0.9" />

    <Text :x="2" :y="13" value="▸ Custom max (0-100)" styleModifier="bold" />
    <Text :x="2" :y="14" :value="`Download: ` + downloadProgress + `%`" />
    <Progress :x="2" :y="15" width="95%" :height="1" :value="downloadProgress" :max="100" />

    <Text :x="2" :y="17" value="▸ Indeterminate (value=undefined)" styleModifier="bold" />
    <Progress :x="2" :y="18" width="95%" :height="1" />

    <Text :x="2" :y="20" value="▸ Disabled" styleModifier="bold" />
    <Progress :x="2" :y="21" width="95%" :height="1" :value="0.8" :disabled="true" />

    <Text :x="2" :y="23" value="▸ Multi-step Progress" styleModifier="bold" />
    <Box :x="2" :y="24" width="95%" :height="4" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text :value="`Step ${currentStep}/3 — ${stepLabel}`" />
        <Progress width="100%" :height="1" :value="currentStep" :max="3" />
    </Box>

    <Text :x="2" :y="29" value="▸ Not focusable (acceptsFocus is always false)" styleModifier="bold" />
    <Text :x="2" :y="30" value="▸ No events — Progress is a display-only widget" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const downloadProgress = ref(0)
setInterval(() => {
    downloadProgress.value = (downloadProgress.value + 1) % 101
}, 80)

const currentStep = ref(1)
setInterval(() => {
    currentStep.value = (currentStep.value % 3) + 1
}, 3000)

const stepLabel = computed(() => {
    const labels = ['Downloading', 'Installing', 'Verifying']
    return labels[currentStep.value - 1] ?? ''
})
</script>
