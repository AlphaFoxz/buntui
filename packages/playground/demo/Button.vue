<template>
    <Button :x="1" :y="32" :width="18" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="21" :y="32" :width="18" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />
</template>

<script setup lang="ts">
import { computed, ref } from '@vue/reactivity'

const buttonLabel = computed(() => {
    return `Button: ${buttonDisabled.value ? 'Disabled' : 'Enabled'}`
})

const buttonDisabled = ref(true)
function handleToggleClick() {
    buttonDisabled.value = !buttonDisabled.value
}
</script>
