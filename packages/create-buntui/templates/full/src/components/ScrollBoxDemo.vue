<template>
    <Text :x="1" :y="3" colorFg="rgba(137,180,250,1)" value="ScrollBox widget — scrollable container" />

    <ScrollBox
        :x="1"
        :y="4"
        :width="40"
        :height="8"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(137,180,250,0.5)"
        borderStyle="rounded"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
        :alwaysShowScrollbar="true"
    >
        <Text v-for="item in items" :key="item" colorFg="rgba(205,214,244,1)" :value="item" />
    </ScrollBox>

    <Box
        :x="44"
        :y="4"
        :width="30"
        :height="8"
        colorBg="rgba(30,30,46,1)"
        borderColor="rgba(166,227,161,0.5)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text colorFg="rgba(166,227,161,1)" value="Scroll with arrow keys" />
        <Text colorFg="rgba(108,112,134,1)" value="Content overflows the visible area" />
        <Text colorFg="rgba(108,112,134,1)" value="Scrollbar appears automatically" />
    </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const items = ref([
    'Item 1 — Apple',
    'Item 2 — Banana',
    'Item 3 — Cherry',
    'Item 4 — Date',
    'Item 5 — Elderberry',
    'Item 6 — Fig',
    'Item 7 — Grape',
    'Item 8 — Honeydew',
    'Item 9 — Kiwi',
    'Item 10 — Lemon',
])
</script>
