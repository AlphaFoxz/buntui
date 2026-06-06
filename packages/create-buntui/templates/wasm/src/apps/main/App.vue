<template>
    <Box
        x="20%"
        y="25%"
        width="60%"
        :height="15"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        align="center"
        :paddingTop="1"
        :paddingBottom="1"
        :paddingLeft="2"
        :paddingRight="2"
    >
        <Text :value="title" styleModifier="bold" />
        <Text value="WASM template running in the browser" />
        <Text value="Edit src/apps/main/App.vue to get started" />
        <Text :value="clock" />
        <Box direction="horizontal" :gap="2" align="center" borderStyle="none">
            <Button :value="'Count: ' + count" :width="14" @click="increment" />
        </Box>
    </Box>
</template>

<script setup lang="ts">
import { onTick } from '@buntui/core'
import { ref } from '@vue/reactivity'

const title = '{{name}}'
const clock = ref('')
const count = ref(0)

onTick(() => {
    const now = new Date()
    clock.value = now.toLocaleTimeString()
})

function increment() {
    count.value++
}
</script>
