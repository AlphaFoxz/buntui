<template>
    <Progress :x="1" :y="3" width="95%" :height="1" :value="downloadProgress" :max="100" />
    <Progress :x="1" :y="5" width="95%" :height="1" :value="0.6" />
    <Progress :x="1" :y="7" width="95%" :height="1" :value="0.8" :disabled="true" />
    <Progress :x="1" :y="9" width="95%" :height="1" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const downloadProgress = ref(0)

setInterval(() => {
    downloadProgress.value = (downloadProgress.value + 1) % 101
}, 500)
</script>
