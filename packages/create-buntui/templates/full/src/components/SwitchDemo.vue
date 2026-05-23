<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="Switch widget — on/off toggle" />

    <Switch :x="1" :y="4" :label="'Dark mode'" @change="handleChange('Dark mode', $event)" />
    <Switch :x="1" :y="5" :label="'Notifications'" @change="handleChange('Notifications', $event)" />
    <Switch :x="1" :y="6" :label="'Disabled'" :disabled="true" />

    <Text :x="1" :y="8" :colorFg="'rgba(108,112,134,1)'" :value="log" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const log = ref('Toggle a switch above')

function handleChange(name: string, event: TuiSwitchChangeEvent) {
    log.value = `${name}: ${event.checked ? 'on' : 'off'}`
}
</script>
