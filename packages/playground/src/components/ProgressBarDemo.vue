<template>
    <ProgressBar :x="1" :y="3" width="95%" :height="1" :value="downloadProgress" label="Download" />
    <ProgressBar :x="1" :y="5" width="95%" :height="1" :value="cpuUsage" label="CPU" />
    <ProgressBar :x="1" :y="7" width="95%" :height="1" :value="memoryUsage" label="Memory" />
    <ProgressBar :x="1" :y="9" width="95%" :height="1" :value="diskUsage" label="Disk" />
    <ProgressBar :x="1" :y="11" width="95%" :height="2" :value="health" label="Health" />
    <ProgressBar :x="1" :y="14" width="95%" :height="1" :value="50" :disabled="true" label="Disabled" />
    <ProgressBar :x="1" :y="16" width="95%" :height="1" :value="100" :showPercentage="false" label="No %" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const downloadProgress = ref(0)
const cpuUsage = ref(42)
const memoryUsage = ref(67)
const diskUsage = ref(23)
const health = ref(85)

setInterval(() => {
    downloadProgress.value = (downloadProgress.value + 1) % 101
    cpuUsage.value = Math.floor(Math.random() * 100)
    memoryUsage.value = Math.floor(Math.random() * 100)
    diskUsage.value = Math.floor(Math.random() * 100)
}, 500)
</script>
