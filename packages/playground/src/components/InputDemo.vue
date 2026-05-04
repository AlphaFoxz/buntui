<template>
    <!-- Input widgets -->
    <Input
        :x="1"
        :y="3"
        placeholder="Type something..."
        v-model="inputValue"
        @input="handleInput"
        @submit="handleSubmit"
    />
    <Input :x="1" :y="6" label="Readonly" placeholder="Another input..." readonly :value="inputValue" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const inputValue = ref('')
function handleInput(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}

function handleSubmit(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}
</script>
