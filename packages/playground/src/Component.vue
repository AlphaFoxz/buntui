<template>
    <!-- Z-Index: green (top, zIndex=2) -->
    <Box
        v-if="show"
        :x="35"
        :y="1"
        :width="24"
        :height="3"
        :colorBg="0xa6_e3_a1_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
    >
        <Text :colorFg="0x1e_1e_2e_ff" value="zIndex=2 最上层" />
    </Box>

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :x="25"
        :y="2"
        :width="24"
        :height="3"
        :colorBg="0x89_b4_fa_55"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
    />

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        :x="15"
        :y="3"
        :width="24"
        :height="3"
        :colorBg="0xf3_8b_a8_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="0"
    >
        <Text :colorFg="0x1e_1e_2e_ff" value="zIndex=0 最底层" />
    </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const show = ref(true)

setInterval(() => {
    show.value = !show.value
}, 1000)
</script>
