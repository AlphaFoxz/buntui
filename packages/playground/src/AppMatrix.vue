<template>
    <Box
        v-if="show"
        :rectX="35"
        :rectY="1"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0xa6_e3_a1_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
        text="zIndex=2 最上层 闪烁"
    />

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :rectX="25"
        :rectY="2"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0x89_b4_fa_55"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
        text=""
    />

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        :rectX="15"
        :rectY="3"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0xf3_8b_a8_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="0"
        text="zIndex=0 最底层"
    />
</template>

<script setup>
import { ref, computed } from '@vue/reactivity'

const currentTimeStr = ref(Date.now().toString())
const show = ref(true)

setInterval(() => {
    show.value = !show.value
}, 1000)
</script>
