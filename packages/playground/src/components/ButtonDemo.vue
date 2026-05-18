<template>
    <Button :x="1" :y="3" :width="18" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="21" :y="3" :width="18" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />
</template>

<script setup lang="ts">
import { onTick } from '@buntui/core'
import { computed, ref } from '@vue/reactivity'
import { onMounted, onUnmounted } from 'vue'

const buttonLabel = computed(() => {
    return `Button: ${buttonDisabled.value ? 'Disabled' : 'Enabled'}`
})

const buttonDisabled = ref(true)
function handleToggleClick() {
    buttonDisabled.value = !buttonDisabled.value
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
    console.log('组件已挂载')
})
onUnmounted(() => {
    console.log('组件已卸载')
})
</script>
