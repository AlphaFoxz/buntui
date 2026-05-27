<template>
    <Text :x="1" :y="3" colorFg="rgba(137,180,250,1)" value="Progress widget — bar indicator" />

    <Text :x="1" :y="4" colorFg="rgba(108,112,134,1)" value="Determinate:" />
    <Progress :x="1" :y="5" :width="40" :height="1" :value="progress" />

    <Text :x="1" :y="7" colorFg="rgba(166,227,161,1)" :value="`${Math.round(progress * 100)}%`" />

    <Button :x="1" :y="9" :width="20" :height="3" value="Reset" @click="reset" />
    <Button :x="23" :y="9" :width="20" :height="3" value="Set 75%" @click="set75" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const progress = ref(0.5)

function reset() {
    progress.value = 0
}

function set75() {
    progress.value = 0.75
}
</script>
