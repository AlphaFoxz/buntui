<template>
    <Box
        x="20%"
        y="30%"
        width="60%"
        :height="9"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        align="center"
    >
        <Text :value="title" styleModifier="bold" />
        <Text value="Edit src/App.vue to get started" />
        <Text :value="clock" />
    </Box>
</template>

<script setup lang="ts">
import { onTick } from '@buntui/core'
import { ref } from '@vue/reactivity'

const title = '{{name}}'
const clock = ref('')

onTick(() => {
    const now = new Date()
    clock.value = now.toLocaleTimeString()
})
</script>
