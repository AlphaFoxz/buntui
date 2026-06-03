<template>
    <Text :x="1" :y="3" value="ScrollBox widget — scrollable container" />

    <ScrollBox
        :x="1"
        :y="4"
        :width="40"
        :height="8"
        borderStyle="rounded"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
        :alwaysShowScrollbar="true"
    >
        <Text v-for="item in items" :key="item" :value="item" />
    </ScrollBox>

    <Box
        :x="44"
        :y="4"
        :width="30"
        :height="8"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Scroll with arrow keys" />
        <Text value="Content overflows the visible area" />
        <Text value="Scrollbar appears automatically" />
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
