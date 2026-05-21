<template>
    <Button :x="1" :y="3" :width="18" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="21" :y="3" :width="25" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />
</template>

<script setup lang="ts">
import { onTick, LOGGER } from '@buntui/core'
import { computed, ref } from '@vue/reactivity'
import { onMounted, onUnmounted } from 'vue'

const buttonLabel = computed(() => {
    return `Button: ${buttonDisabled.value ? 'Disabled' : 'Enabled(' + countdown.value + ')'} `
})

const buttonDisabled = ref(true)
const countdown = ref(5)
function handleToggleClick() {
    buttonDisabled.value = !buttonDisabled.value
    const timer = setInterval(() => {
        countdown.value = countdown.value - 1
        if (countdown.value === 0) {
            buttonDisabled.value = true
            countdown.value = 5
            clearInterval(timer)
        }
    }, 1000)
}

let date = new Date()
let count = 0
onTick(() => {
    if (new Date().getTime() - date.getTime() > 1000) {
        date = new Date()
        console.log(`ButtonDemo heartbeat: ${count++}`)
    }
})

onMounted(() => {
    LOGGER.logDebug('组件已挂载')
})
onUnmounted(() => {
    LOGGER.logDebug('组件已卸载')
})
</script>
