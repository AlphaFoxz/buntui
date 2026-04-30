<template>
    <!-- Title bar -->
    <Box
        :rectX="0"
        :rectY="0"
        :rectWidth="60"
        :rectHeight="1"
        :colorFg="0xcb_a6_f5_ff"
        :colorBg="0x31_32_44_ff"
        :text="title"
    />

    <!-- Solid border, English -->
    <Box
        :draggable="true"
        @dragstart="handleDragstart"
        @dragend="handleDragend"
        :rectX="1"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :text="text1"
    />

    <!-- Rounded border, Chinese -->
    <Box
        @mousedown="handleMousedown"
        @mouseup="handleMouseup"
        :rectX="31"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :text="text2"
    />

    <!-- Double border, mixed -->
    <Box
        @click="handleClick"
        :rectX="1"
        :rectY="6"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xfa_b3_87_ff"
        :borderStyle="2"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :text="text3"
    />

    <!-- Bold border -->
    <Box
        @contextmenu="handleContextmenu"
        :rectX="31"
        :rectY="6"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="4"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :text="text4"
    />

    <!-- Partial: top + bottom only -->
    <Box
        :rectX="1"
        :rectY="10"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xf9_e2_af_ff"
        :colorBg="0x18_18_25_ff"
        :borderColor="0xf9_e2_af_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="false"
        :borderBottom="true"
        :borderLeft="false"
        text="Top+Bottom 仅上下"
    />

    <!-- Partial: left only -->
    <Box
        :rectX="31"
        :rectY="10"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0x94_e2_d5_ff"
        :colorBg="0x18_18_25_ff"
        :borderColor="0x94_e2_d5_ff"
        :borderStyle="1"
        :borderTop="false"
        :borderRight="false"
        :borderBottom="false"
        :borderLeft="true"
        text="Left-only sidebar 侧栏"
    />

    <!-- No border, highlighted row -->
    <Box
        :rectX="1"
        :rectY="14"
        :rectWidth="58"
        :rectHeight="1"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0x89_b4_fa_ff"
        text="无边框高亮行 — Borderless highlight row"
    />

    <!-- No border, subtle row -->
    <Box
        :rectX="1"
        :rectY="15"
        :rectWidth="58"
        :rectHeight="1"
        :colorFg="0xa6_ad_c8_ff"
        :colorBg="0x1e_1e_2e_ff"
        text="普通行：Normal row without border 无边框普通行"
    />

    <!-- Dashed border -->
    <Box
        :rectX="1"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0xb4_be_fe_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xb4_be_fe_ff"
        :borderStyle="5"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="虚线 Dashed"
    />

    <!-- OutsetBold border -->
    <Box
        :rectX="22"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0xf5_c2_e7_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf5_c2_e7_ff"
        :borderStyle="7"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="浮雕 Outset"
    />

    <!-- OutsetDouble border -->
    <Box
        :rectX="43"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0x94_e2_d5_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x94_e2_d5_ff"
        :borderStyle="8"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="双浮雕 Outset²"
    />

    <!-- Footer -->
    <Box
        :rectX="0"
        :rectY="21"
        :rectWidth="60"
        :rectHeight="1"
        :colorFg="0x6c_70_86_ff"
        :colorBg="0x11_11_1b_ff"
        text="按 Q 退出 | Press Q to quit | 边框: Solid·Rounded·Double·Bold·Dashed·Outset"
    />

    <!-- Z-index label -->
    <Box
        :rectX="1"
        :rectY="23"
        :rectWidth="20"
        :rectHeight="1"
        :colorFg="0xf9_e2_af_ff"
        :colorBg="0x1e_1e_2e_ff"
        text="Z-Index 层叠演示 →"
    />

    <!-- Z-Index: green (top, zIndex=2) -->
    <Box
        v-if="show"
        :rectX="35"
        :rectY="23"
        :rectWidth="24"
        :rectHeight="3"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0xa6_e3_a1_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
        text="zIndex=2 最上层"
    />

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :rectX="25"
        :rectY="24"
        :rectWidth="24"
        :rectHeight="3"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0x89_b4_fa_55"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
        text="zIndex=1 中间层"
    />

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        :rectX="15"
        :rectY="25"
        :rectWidth="24"
        :rectHeight="3"
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

    <!-- FPS watcher -->
    <FrameRateWatcher />
</template>

<script setup>
import { ref, computed } from '@vue/reactivity'

const currentTimeStr = ref(Date.now().toString())
const show = ref(true)

setInterval(() => {
    currentTimeStr.value = Date.now().toString()
    show.value = !show.value
}, 1000)
const title = computed(() => {
    return `buntui Demo ${currentTimeStr.value} s`
})

const text1 = ref('Drag Me!')
function handleDragstart() {
    text1.value = 'Dragging...'
}
function handleDragend() {
    text1.value = 'Dragged!'
}

const text2 = ref('Click Me!')
function handleMousedown() {
    text2.value = 'MouseDown!'
}
function handleMouseup() {
    text2.value = 'MouseUp!'
}

const text3 = ref('Click Me!')
function handleClick() {
    text3.value = 'Clicked!'
}

const text4 = ref('Right click me!')
function handleContextmenu() {
    text4.value = 'Right clicked!'
}
</script>
