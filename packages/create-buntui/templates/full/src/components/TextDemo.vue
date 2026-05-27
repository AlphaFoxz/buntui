<template>
    <Text :x="1" :y="3" colorFg="rgba(137,180,250,1)" value="Text widget — display styled text" />

    <Box
        :x="1"
        :y="4"
        width="45%"
        :height="5"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(137,180,250,0.5)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text colorFg="rgba(137,180,250,1)" value="Font styles" />
        <Text styleModifier="bold" colorFg="rgba(205,214,244,1)" value="Bold text" />
        <Text styleModifier="italic" colorFg="rgba(205,214,244,1)" value="Italic text" />
    </Box>

    <Box
        x="50%"
        :y="4"
        width="45%"
        :height="5"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(166,227,161,0.5)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text colorFg="rgba(166,227,161,1)" value="Colors" />
        <Text colorFg="rgba(243,139,168,1)" value="Red " />
        <Text colorFg="rgba(137,180,250,1)" value="Blue " />
        <Text colorFg="rgba(166,227,161,1)" value="Green" />
    </Box>

    <Box
        :x="1"
        :y="10"
        width="95%"
        :height="3"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(250,179,135,0.5)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text colorFg="rgba(250,179,135,1)" value="Dynamic clock:" />
        <Text colorFg="rgba(205,214,244,1)" :value="clock" />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const elapsed = ref(0)
setInterval(() => {
    elapsed.value += 1
}, 1000)

const clock = computed(() => {
    elapsed.value
    const now = new Date()
    return now.toLocaleTimeString()
})
</script>
