<template>
    <Box
        :draggable="true"
        @dragstart="handleDragstart"
        @dragend="handleDragend"
        :x="1"
        :y="3"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="solid"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text1" />
    </Box>

    <Box
        @mousedown="handleMousedown"
        @mouseup="handleMouseup"
        :x="31"
        :y="3"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,1)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text2" />
    </Box>

    <Box
        @click="handleClick"
        :x="1"
        :y="6"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,1)'"
        borderStyle="double"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text3" />
    </Box>

    <Box
        @contextmenu="handleContextmenu"
        :x="31"
        :y="6"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(243,139,168,1)'"
        borderStyle="bold"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text4" />
    </Box>

    <!-- Dashed border -->
    <Box
        :x="1"
        :y="9"
        :width="20"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(180,190,254,1)'"
        borderStyle="dashed"
    >
        <Text :colorFg="'rgba(180,190,254,1)'" value="虚线 Dashed" />
    </Box>

    <!-- OutsetBold border -->
    <Box
        :x="22"
        :y="9"
        :width="20"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,1)'"
        borderStyle="outsetbold"
    >
        <Text :colorFg="'rgba(245,194,231,1)'" value="浮雕 Outset" />
    </Box>

    <!-- OutsetDouble border -->
    <Box
        :x="43"
        :y="9"
        :width="20"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(148,226,213,1)'"
        borderStyle="outsetdouble"
    >
        <Text :colorFg="'rgba(148,226,213,1)'" value="双浮雕 Outset²" />
    </Box>

    <Box
        draggable
        :x="35"
        :y="12"
        :width="24"
        :height="5"
        :colorBg="'rgba(166,227,161,0.5)'"
        :borderColor="'rgba(166,227,161,1)'"
        borderStyle="rounded"
        :z-index="2"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=2 最上层" />
    </Box>

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :x="25"
        :y="13"
        :width="24"
        :height="5"
        :colorBg="'rgba(137,180,250,0.33)'"
        :borderColor="'rgba(137,180,250,1)'"
        :zIndex="1"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=1 中间层" />
    </Box>

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        draggable
        :x="15"
        :y="14"
        :width="24"
        :height="5"
        :colorBg="'rgba(243,139,168,1)'"
        :borderColor="'rgba(243,139,168,1)'"
        border="1 0"
        :zIndex="0"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=0 最底层" />
    </Box>

    <Box
        draggable
        :x="1"
        :y="19"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'start'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,1)'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Start" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" />
    </Box>

    <Box
        draggable
        x="50%"
        :y="19"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'center'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,1)'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Center" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <Box
        draggable
        :x="1"
        :y="27"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'end'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,1)'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=End" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <Box
        draggable
        x="50%"
        :y="27"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'stretch'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,1)'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Stretch" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const timeCount = ref(0)
const show = ref(true)

setInterval(() => {
    timeCount.value += 1
    show.value = !show.value
}, 1000)

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
