<template>
    <Box
        x="20%"
        y="30%"
        width="60%"
        :height="9"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(137,180,250,1)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        align="center"
    >
        <Text colorFg="rgba(137,180,250,1)" :value="title" styleModifier="bold" />
        <Text colorFg="rgba(166,227,161,1)" value="Edit src/App.vue to get started" />
        <Text colorFg="rgba(108,112,134,1)" :value="clock" />
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
