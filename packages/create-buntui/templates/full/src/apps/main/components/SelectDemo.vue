<template>
    <Text :x="1" :y="3" value="Select widget — dropdown selection" />

    <Box
        :x="1"
        :y="4"
        :width="50"
        :height="8"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Choose a framework:" />
        <Select
            :width="46"
            :options="frameworks"
            placeholder="Select a framework..."
            @change="handleChange"
        />
    </Box>

    <Text :x="1" :y="13" :value="selected" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const frameworks = ref([
    {value: 'bun', label: 'Bun'},
    {value: 'node', label: 'Node.js'},
    {value: 'deno', label: 'Deno'},
])

const selected = ref('Select an option above')

function handleChange(event: TuiChangeEventData) {
    selected.value = `Selected: ${String(event.value)}`
}
</script>
