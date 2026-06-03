<template>
    <Text :x="1" :y="3" value="Checkbox widget — boolean toggle" />

    <Checkbox :x="1" :y="4" label="Enable feature A" @change="handleChange('A', $event)" />
    <Checkbox :x="1" :y="5" label="Enable feature B" @change="handleChange('B', $event)" />
    <Checkbox :x="1" :y="6" label="Disabled option" :disabled="true" />

    <Text :x="1" :y="8" :value="log" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const log = ref('Toggle a checkbox above')

function handleChange(name: string, event: TuiCheckboxChangeEvent) {
    log.value = `${name}: ${event.checked ? 'checked' : 'unchecked'}`
}
</script>
