<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="RadioGroup widget — single selection from options" />

    <RadioGroup
        :x="1"
        :y="4"
        :width="30"
        :options="['Red', 'Green', 'Blue']"
        @change="handleChange"
    />

    <Text :x="1" :y="8" :colorFg="'rgba(108,112,134,1)'" :value="log" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const log = ref('Select a color above')

function handleChange(event: TuiRadioGroupChangeEvent) {
    log.value = `Selected: ${event.label} (index ${event.value})`
}
</script>
