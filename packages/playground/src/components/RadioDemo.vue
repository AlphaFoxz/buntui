<template>
    <RadioGroup
        :x="1"
        :y="3"
        :width="28"
        :height="3"
        :options="['Red', 'Green', 'Blue']"
        :value="selectedColor"
        @change="handleColorChange"
    />
    <RadioGroup
        :x="31"
        :y="3"
        :width="28"
        :height="3"
        :options="['Small', 'Medium', 'Large']"
        :value="selectedSize"
        @change="handleSizeChange"
    />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const selectedColor = ref(-1)
function handleColorChange(data) {
    selectedColor.value = data.value
}

const selectedSize = ref(1)
function handleSizeChange(data) {
    selectedSize.value = data.value
}
</script>
