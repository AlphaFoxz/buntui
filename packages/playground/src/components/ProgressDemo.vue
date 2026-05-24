<template>
    <Text :x="1" :y="3" value="▶ Determinate Progress" />
    <Text :x="1" :y="4" :colorFg="'rgba(108,112,134,1)'" :value="`Download: ${downloadProgress}%`" />
    <Progress :x="1" :y="5" width="95%" :height="1" :value="downloadProgress" :max="100" />

    <Text :x="1" :y="7" value="▶ Fractional (0-1 range)" />
    <Text :x="1" :y="8" :colorFg="'rgba(108,112,134,1)'" value="0.3" />
    <Progress :x="5" :y="8" width="20%" :height="1" :value="0.3" />
    <Text :x="30" :y="8" :colorFg="'rgba(108,112,134,1)'" value="0.6" />
    <Progress :x="34" :y="8" width="20%" :height="1" :value="0.6" />
    <Text :x="59" :y="8" :colorFg="'rgba(108,112,134,1)'" value="0.9" />
    <Progress :x="63" :y="8" width="30%" :height="1" :value="0.9" />

    <Text :x="1" :y="10" value="▶ Indeterminate (value=undefined)" />
    <Progress :x="1" :y="11" width="95%" :height="1" />

    <Text :x="1" :y="13" value="▶ Disabled" />
    <Progress :x="1" :y="14" width="95%" :height="1" :value="0.8" :disabled="true" />

    <Text :x="1" :y="16" value="▶ Multi-step Progress" />
    <Box
        :x="1"
        :y="17"
        width="95%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(203,166,245,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :value="`Step ${currentStep}/3 - ${stepLabel}`" />
        <Progress width="100%" :height="1" :value="currentStep" :max="3" />
        <Text :colorFg="'rgba(108,112,134,1)'" :value="stepDesc" />
    </Box>
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
const stepDesc = computed(() => {
    const descs = ['Fetching packages from registry...', 'Writing files to disk...', 'Checking integrity checksums...']
    return descs[currentStep.value - 1] ?? ''
})
</script>
