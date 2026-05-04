<template>
    <Checkbox :x="1" :y="36" :width="28" :height="1" label="Enable notifications" @change="handleCheckChange" />
    <Checkbox
        :x="1"
        :y="37"
        :width="28"
        :height="1"
        label="Dark mode"
        :checked="darkMode"
        @change="handleDarkModeChange"
    />
    <Checkbox :x="1" :y="38" :width="28" :height="1" label="Disabled option" :disabled="true" :checked="true" />
    <Checkbox :x="31" :y="36" :width="28" :height="1" label="Auto-save" @change="handleCheckChange" />
    <Checkbox :x="31" :y="37" :width="28" :height="1" label="Show line numbers" @change="handleCheckChange" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const darkMode = ref(false)
function handleCheckChange(data) {
    void data
}
function handleDarkModeChange(data) {
    darkMode.value = data.checked
}
</script>
