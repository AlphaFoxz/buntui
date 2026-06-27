<template>
  <Text value="Box" styleModifier="bold" />
  <Text
    value="The fundamental layout container. Supports flex layout, borders, shadows, padding, and z-index."
  />

  <Text value="▸ Properties" styleModifier="bold" />

  <Text value="x, y            TuiSizeValue      Position (number or '50%')" />
  <Text value="width, height    TuiSizeValue      Size (number or '100%')" />
  <Text
    value="direction  'vertical'|'horizontal'|'-reverse'  Layout direction"
  />
  <Text
    value="gap, align, justifyContent, flexGrow, flexShrink, flexBasis, alignSelf"
  />
  <Text
    value="borderStyle      'solid'|'rounded'|'double'|'bold'|'dashed'|..."
  />
  <Text
    value="padding*         number            Padding (Top/Right/Bottom/Left)"
  />
  <Text value="shadowOffsetX/Y  number            Shadow offset" />
  <Text value="zIndex           number            Render order" />
  <Text value="draggable        boolean           Enable drag" />
  <Text
    value="styleModifier     FontStyle        Font style (bold, italic, underline...)"
  />

  <Text value="▸ Border Styles" styleModifier="bold" />
  <Box width="98%" :height="3" borderStyle="solid">
    <Text value="  solid" />
  </Box>
  <Box width="98%" :height="3" borderStyle="rounded">
    <Text value="  rounded" />
  </Box>
  <Box width="98%" :height="3" borderStyle="double">
    <Text value="  double" />
  </Box>
  <Box width="98%" :height="3" borderStyle="bold">
    <Text value="  bold" />
  </Box>
  <Box width="98%" :height="3" borderStyle="dashed">
    <Text value="  dashed" />
  </Box>
  <Box width="98%" :height="3" borderStyle="outsetbold">
    <Text value="  outsetbold" />
  </Box>

  <Text value="▸ Layout Direction" styleModifier="bold" />
  <Box
    width="98%"
    :height="4"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B" />
    <Text value="C" />
    <Text value="horizontal + gap=1" />
  </Box>
  <Box
    width="98%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B" />
    <Text value="vertical + gap=1" />
  </Box>

  <Text value="▸ Alignment" styleModifier="bold" />
  <Box
    width="98%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="align=start" />
    <Text value="short" />
  </Box>
  <Box
    width="98%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    :align="'center'"
    borderStyle="rounded"
  >
    <Text value="align=center" />
    <Text value="short" />
  </Box>
  <Box
    width="98%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    :align="'end'"
    borderStyle="rounded"
  >
    <Text value="align=end" />
    <Text value="short" />
  </Box>
  <Box
    width="98%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    :align="'stretch'"
    borderStyle="rounded"
  >
    <Text value="align=stretch" />
    <Text value="fills width" />
  </Box>

  <Text value="▸ Shadow & Padding" styleModifier="bold" />
  <Box
    width="98%"
    :height="3"
    borderStyle="rounded"
    :shadowOffsetX="2"
    :shadowOffsetY="1"
    :paddingLeft="2"
  >
    <Text value="shadow + padding" />
  </Box>
  <Box
    width="98%"
    :height="3"
    borderStyle="rounded"
    :paddingTop="1"
    :paddingLeft="2"
  >
    <Text value="padding T=1 L=2" />
  </Box>

  <Text
    value="▸ Events: click, mousedown, mouseup, contextmenu, dragstart, dragend"
    styleModifier="bold"
  />
  <Box width="98%" :height="3" borderStyle="rounded" @click="handleClick">
    <Text :value="clickLabel" />
  </Box>
  <Box
    width="98%"
    :height="3"
    borderStyle="rounded"
    draggable
    @dragend="handleDragEnd"
  >
    <Text :value="dragLabel" />
  </Box>

  <Text
    value="▸ justifyContent (main-axis distribution)"
    styleModifier="bold"
  />
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'start'"
    borderStyle="rounded"
  >
    <Text value="[start]" />
  </Box>
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'center'"
    borderStyle="rounded"
  >
    <Text value="[center]" />
  </Box>
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'end'"
    borderStyle="rounded"
  >
    <Text value="[end]" />
  </Box>
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'space-between'"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B" />
  </Box>

  <Text value="▸ flexGrow (per-child free-space share)" styleModifier="bold" />
  <Box width="98%" :height="3" :direction="'horizontal'" borderStyle="rounded">
    <Text value="g=0" />
    <Text value="g=1" :flexGrow="1" />
  </Box>
  <Box width="98%" :height="3" :direction="'horizontal'" borderStyle="rounded">
    <Text value="g=1" :flexGrow="1" />
    <Text value="g=1" :flexGrow="1" />
    <Text value="g=1" :flexGrow="1" />
  </Box>

  <Text value="▸ Reverse directions" styleModifier="bold" />
  <Box
    width="98%"
    :height="3"
    :direction="'vertical-reverse'"
    borderStyle="rounded"
  >
    <Text value="first (bottom)" />
    <Text value="second" />
  </Box>
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal-reverse'"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B (right)" />
  </Box>

  <Text value="▸ flexShrink (overflow compression)" styleModifier="bold" />
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
    <Text value="s=0" :flexBasis="24" />
  </Box>
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
  </Box>

  <Text value="▸ flexBasis (main-axis base size)" styleModifier="bold" />
  <Box
    width="98%"
    :height="3"
    :direction="'horizontal'"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="b=8" :flexBasis="8" />
    <Text value="b=16" :flexBasis="16" />
    <Text value="b=24" :flexBasis="24" />
  </Box>

  <Text
    value="▸ alignSelf (per-child cross-axis override)"
    styleModifier="bold"
  />
  <Box
    width="98%"
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
import { ref } from '@vue/reactivity';

const clickLabel = ref('Click me');
const dragLabel = ref('Drag me');

function handleClick() {
  clickLabel.value = `Clicked at ${Date.now() % 10000}`;
}

function handleDragEnd() {
  dragLabel.value = `Dropped at ${Date.now() % 10000}`;
}
</script>
