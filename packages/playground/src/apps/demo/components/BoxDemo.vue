<template>
    <Box
        position="absolute"
        :draggable="true"
        :x="1"
        :y="0"
        @dragstart="handleDragstart"
        @dragend="handleDragend"
        :width="28"
        :height="3"
        borderStyle="solid"
    >
        <Text :value="text1" />
    </Box>

    <Box
        position="absolute"
        @mousedown="handleMousedown"
        @mouseup="handleMouseup"
        :x="31"
        :y="0"
        :width="28"
        :height="3"
        borderStyle="rounded"
    >
        <Text :value="text2" />
    </Box>

    <Box
        position="absolute"
        @click="handleClick"
        :x="1"
        :y="3"
        :width="28"
        :height="3"
        borderStyle="double"
    >
        <Text :value="text3" />
    </Box>

    <Box
        position="absolute"
        @contextmenu="handleContextmenu"
        :x="31"
        :y="3"
        :width="28"
        :height="3"
        borderStyle="bold"
    >
        <Text :value="text4" />
    </Box>

    <!-- Dashed border -->
    <Box
        position="absolute"
        :x="1"
        :y="6"
        :width="20"
        :height="3"
        borderStyle="dashed"
    >
        <Text value="虚线 Dashed" />
    </Box>

    <!-- OutsetBold border -->
    <Box
        position="absolute"
        :x="22"
        :y="6"
        :width="20"
        :height="3"
        borderStyle="outsetbold"
    >
        <Text value="浮雕 Outset" />
    </Box>

    <!-- OutsetDouble border -->
    <Box
        position="absolute"
        :x="43"
        :y="6"
        :width="20"
        :height="3"
        borderStyle="outsetdouble"
    >
        <Text value="双浮雕 Outset²" />
    </Box>

    <Box
        position="absolute"
        draggable
        :x="35"
        :y="9"
        :width="24"
        :height="5"
        :colorBg="'rgba(166,227,161,0.5)'"
        :colorBorder="'rgba(166,227,161,1)'"
        borderStyle="rounded"
        :z-index="2"
    >
        <Text value="zIndex=2 最上层" />
    </Box>

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        position="absolute"
        draggable
        :x="25"
        :y="10"
        :width="24"
        :height="5"
        :colorBg="'rgba(137,180,250,0.33)'"
        :colorBorder="'rgba(137,180,250,1)'"
        :zIndex="1"
    >
        <Text value="zIndex=1 中间层" />
    </Box>

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        position="absolute"
        draggable
        :x="15"
        :y="11"
        :width="24"
        :height="5"
        :colorBg="'rgba(243,139,168,1)'"
        :colorBorder="'rgba(243,139,168,1)'"
        border="1 0"
        :zIndex="0"
    >
        <Text value="zIndex=0 最底层" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="16"
        value="▸ Flex Layout (row/column container)"
        styleModifier="bold"
    />
    <Text
        position="absolute"
        :x="1"
        :y="17"
        value="▶ Alignment (cross-axis)"
        styleModifier="bold"
    />

    <Box
        position="absolute"
        draggable
        v-model:x="dx"
        :y="18"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'start'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Start" />
        <Text value="Row 1" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" />
    </Box>

    <Box
        position="absolute"
        draggable
        x="50%"
        :y="18"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'center'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Center" />
        <Text value="Row 1" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" />
    </Box>

    <Box
        position="absolute"
        draggable
        :x="dx"
        :y="26"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'end'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=End" />
        <Text value="Row 1" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" />
    </Box>

    <Box
        position="absolute"
        draggable
        x="50%"
        :y="26"
        width="48%"
        :height="7"
        :direction="'vertical'"
        :gap="1"
        :align="'stretch'"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Stretch" />
        <Text value="Row 1" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="34"
        value="▶ justifyContent (main-axis distribution)"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="35"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        :justifyContent="'start'"
        borderStyle="rounded"
    >
        <Text value="[start]" />
    </Box>
    <Box
        position="absolute"
        x="50%"
        :y="35"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        :justifyContent="'center'"
        borderStyle="rounded"
    >
        <Text value="[center]" />
    </Box>
    <Box
        position="absolute"
        :x="1"
        :y="39"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        :justifyContent="'end'"
        borderStyle="rounded"
    >
        <Text value="[end]" />
    </Box>
    <Box
        position="absolute"
        x="50%"
        :y="39"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        :justifyContent="'space-between'"
        borderStyle="rounded"
    >
        <Text value="A" />
        <Text value="B" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="43"
        value="▶ flexGrow (per-child free-space share)"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="44"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        borderStyle="rounded"
    >
        <Text value="g=0" />
        <Text value="g=1 absorbs free space" :flexGrow="1" />
    </Box>
    <Box
        position="absolute"
        x="50%"
        :y="44"
        width="48%"
        :height="3"
        :direction="'horizontal'"
        borderStyle="rounded"
    >
        <Text value="g=1" :flexGrow="1" />
        <Text value="g=1" :flexGrow="1" />
        <Text value="g=1" :flexGrow="1" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="48"
        value="▶ Reverse directions"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="49"
        width="48%"
        :height="4"
        :direction="'vertical-reverse'"
        :gap="1"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(137,180,250,1)'" value="first (bottom)" />
        <Text value="second (top)" />
    </Box>
    <Box
        position="absolute"
        x="50%"
        :y="49"
        width="48%"
        :height="4"
        :direction="'horizontal-reverse'"
        borderStyle="rounded"
    >
        <Text value="A" />
        <Text :colorFg="'rgba(137,180,250,1)'" value="B (right)" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="54"
        value="▶ flexShrink (overflow compression)"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="55"
        :width="20"
        :height="3"
        :direction="'horizontal'"
        :align="'start'"
        borderStyle="rounded"
    >
        <Text value="s=1" :flexBasis="12" :flexShrink="1" />
        <Text value="s=0" :flexBasis="12" />
    </Box>
    <Box
        position="absolute"
        :x="24"
        :y="55"
        :width="20"
        :height="3"
        :direction="'horizontal'"
        :align="'start'"
        borderStyle="rounded"
    >
        <Text value="s=1" :flexBasis="12" :flexShrink="1" />
        <Text value="s=1" :flexBasis="12" :flexShrink="1" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="59"
        value="▶ flexBasis (main-axis base size)"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="60"
        :width="28"
        :height="3"
        :direction="'horizontal'"
        :align="'start'"
        borderStyle="rounded"
    >
        <Text value="b=4" :flexBasis="4" />
        <Text value="b=8" :flexBasis="8" />
        <Text value="b=12" :flexBasis="12" />
    </Box>

    <Text
        position="absolute"
        :x="1"
        :y="64"
        value="▶ alignSelf (per-child cross-axis override)"
        styleModifier="bold"
    />
    <Box
        position="absolute"
        :x="1"
        :y="65"
        :width="28"
        :height="5"
        :direction="'horizontal'"
        :align="'start'"
        borderStyle="rounded"
    >
        <Text value="start" />
        <Text value="center" :alignSelf="'center'" />
        <Text value="end" :alignSelf="'end'" />
        <Text value="stretch" :alignSelf="'stretch'" />
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

const dx = ref(1)
</script>
