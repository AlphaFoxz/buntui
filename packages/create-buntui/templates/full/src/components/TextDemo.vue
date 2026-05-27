<template>
    <Text :x="1" :y="3" value="Text widget — display styled text" />

    <Box
        :x="1"
        :y="4"
        width="45%"
        :height="8"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Font styles" />
        <Text styleModifier="bold" value="Bold text" />
        <Text styleModifier="italic" value="Italic text" />
    </Box>

    <Box
        x="50%"
        :y="4"
        width="45%"
        :height="10"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Colors" />
        <Text colorFg="rgba(243,139,168,1)" value="Red " />
        <Text colorFg="rgba(137,180,250,1)" value="Blue " />
        <Text colorFg="rgba(166,227,161,1)" value="Green" />
    </Box>

    <Box
        :x="1"
        :y="15"
        width="95%"
        :height="6"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Dynamic clock:" />
        <Text :value="clock" />
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
