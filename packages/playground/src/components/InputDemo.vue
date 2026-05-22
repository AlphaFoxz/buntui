<template>
    <!-- Input widgets -->
    <Input
        ref="input"
        :x="1"
        :y="3"
        placeholder="Type something..."
        v-model="inputValue"
        @input="handleInput"
        @submit="handleSubmit"
    />
    <Input :x="1" :y="6" label="Readonly" placeholder="Another input..." readonly :value="inputValue" />
    <Input :x="1" :y="9" type="password" label="Readonly" placeholder="I'm Password" />
</template>

<script setup lang="ts">
import type { InputWidget } from '@buntui/core'
import { ref } from '@vue/reactivity'
import { onMounted, useTemplateRef } from 'vue'

const inputValue = ref('Same value')
function handleInput(data: TuiInputEvent) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}

function handleSubmit(data: TuiSubmitEvent) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}

const input = useTemplateRef<InputWidget>('input')
onMounted(() => {
    input.value?.focus()
    setTimeout(() => {
        input.value?.select()
    }, 3000)
})
</script>
