<template>
    <Box
        x="20%"
        y="25%"
        width="60%"
        :height="12"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(137,180,250,1)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        align="center"
        :paddingTop="1"
        :paddingBottom="1"
        :paddingLeft="2"
        :paddingRight="2"
    >
        <Text colorFg="rgba(137,180,250,1)" :value="title" styleModifier="bold" />
        <Text colorFg="rgba(166,227,161,1)" value="SFC template with hot reload" />
        <Text colorFg="rgba(205,214,244,1)" value="Edit src/App.vue to get started" />
        <Text colorFg="rgba(108,112,134,1)" :value="clock" />
        <Box direction="horizontal" :gap="2" align="center">
            <Button :value="'Count: ' + count" @click="increment" />
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
