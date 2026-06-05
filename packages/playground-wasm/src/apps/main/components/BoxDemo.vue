<template>
    <Text :x="2" :y="1" value="Box" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="The fundamental layout container. Supports flex layout, borders, shadows, padding, and z-index."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />

    <Text :x="2" :y="5" value="x, y            TuiSizeValue      Position (number or '50%')" />
    <Text :x="2" :y="6" value="width, height    TuiSizeValue      Size (number or '100%')" />
    <Text :x="2" :y="7" value="direction        'vertical'|'horizontal'  Child layout direction" />
    <Text :x="2" :y="8" value="gap              number            Gap between children" />
    <Text :x="2" :y="9" value="align            'start'|'center'|'end'|'stretch'  Cross-axis alignment" />
    <Text :x="2" :y="10" value="borderStyle      'solid'|'rounded'|'double'|'bold'|'dashed'|..." />
    <Text :x="2" :y="11" value="padding*         number            Padding (Top/Right/Bottom/Left)" />
    <Text :x="2" :y="12" value="shadowOffsetX/Y  number            Shadow offset" />
    <Text :x="2" :y="13" value="zIndex           number            Render order" />
    <Text :x="2" :y="14" value="draggable        boolean           Enable drag" />
    <Text :x="2" :y="15" value="styleModifier     FontStyle        Font style (bold, italic, underline...)" />

    <Text :x="2" :y="17" value="▸ Border Styles" styleModifier="bold" />
    <Box :x="2" :y="18" :width="12" :height="2" borderStyle="solid">
        <Text value="  solid" />
    </Box>
    <Box :x="16" :y="18" :width="12" :height="2" borderStyle="rounded">
        <Text value="  rounded" />
    </Box>
    <Box :x="30" :y="18" :width="12" :height="2" borderStyle="double">
        <Text value="  double" />
    </Box>
    <Box :x="44" :y="18" :width="12" :height="2" borderStyle="bold">
        <Text value="  bold" />
    </Box>
    <Box :x="58" :y="18" :width="12" :height="2" borderStyle="dashed">
        <Text value="  dashed" />
    </Box>
    <Box :x="72" :y="18" :width="14" :height="2" borderStyle="outsetbold">
        <Text value="  outsetbold" />
    </Box>

    <Text :x="2" :y="21" value="▸ Layout Direction" styleModifier="bold" />
    <Box :x="2" :y="22" width="45%" :height="4" :direction="'horizontal'" :gap="1" borderStyle="rounded">
        <Text value="A" />
        <Text value="B" />
        <Text value="C" />
        <Text value="horizontal + gap=1" />
    </Box>
    <Box x="50%" :y="22" width="45%" :height="4" :direction="'vertical'" :gap="1" borderStyle="rounded">
        <Text value="A" />
        <Text value="B" />
        <Text value="vertical + gap=1" />
    </Box>

    <Text :x="2" :y="27" value="▸ Alignment" styleModifier="bold" />
    <Box :x="2" :y="28" width="24%" :height="4" :direction="'vertical'" :gap="1" :align="'start'" borderStyle="rounded">
        <Text value="align=start" />
        <Text value="short" />
    </Box>
    <Box
        x="26%"
        :y="28"
        width="24%"
        :height="4"
        :direction="'vertical'"
        :gap="1"
        :align="'center'"
        borderStyle="rounded"
    >
        <Text value="align=center" />
        <Text value="short" />
    </Box>
    <Box x="52%" :y="28" width="24%" :height="4" :direction="'vertical'" :gap="1" :align="'end'" borderStyle="rounded">
        <Text value="align=end" />
        <Text value="short" />
    </Box>
    <Box
        x="78%"
        :y="28"
        width="20%"
        :height="4"
        :direction="'vertical'"
        :gap="1"
        :align="'stretch'"
        borderStyle="rounded"
    >
        <Text value="align=stretch" />
        <Text value="fills width" />
    </Box>

    <Text :x="2" :y="33" value="▸ Shadow & Padding" styleModifier="bold" />
    <Box
        :x="2"
        :y="34"
        :width="20"
        :height="3"
        borderStyle="rounded"
        :shadowOffsetX="2"
        :shadowOffsetY="1"
        :paddingLeft="2"
    >
        <Text value="shadow + padding" />
    </Box>
    <Box :x="25" :y="34" :width="20" :height="3" borderStyle="rounded" :paddingTop="1" :paddingLeft="2">
        <Text value="padding T=1 L=2" />
    </Box>

    <Text
        :x="2"
        :y="38"
        value="▸ Events: click, mousedown, mouseup, contextmenu, dragstart, dragend"
        styleModifier="bold"
    />
    <Box :x="2" :y="39" :width="30" :height="2" borderStyle="rounded" @click="handleClick">
        <Text :value="clickLabel" />
    </Box>
    <Box :x="34" :y="39" :width="30" :height="2" borderStyle="rounded" draggable @dragend="handleDragEnd">
        <Text :value="dragLabel" />
    </Box>
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity'

const clickLabel = ref('Click me')
const dragLabel = ref('Drag me')

function handleClick() {
    clickLabel.value = `Clicked at ${Date.now() % 10000}`
}

function handleDragEnd() {
    dragLabel.value = `Dropped at ${Date.now() % 10000}`
}
</script>
