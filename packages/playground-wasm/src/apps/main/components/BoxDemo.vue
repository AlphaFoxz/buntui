<template>
  <Text :x="2" :y="1" value="Box" styleModifier="bold" />
  <Text
    :x="2"
    :y="2"
    value="The fundamental layout container. Supports flex layout, borders, shadows, padding, and z-index."
  />

  <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />

  <Text
    :x="2"
    :y="5"
    value="x, y            TuiSizeValue      Position (number or '50%')"
  />
  <Text
    :x="2"
    :y="6"
    value="width, height    TuiSizeValue      Size (number or '100%')"
  />
  <Text
    :x="2"
    :y="7"
    value="direction  'vertical'|'horizontal'|'-reverse'  Layout direction"
  />
  <Text
    :x="2"
    :y="8"
    value="gap, align, justifyContent, flexGrow, flexShrink, flexBasis, alignSelf"
  />
  <Text
    :x="2"
    :y="9"
    value="borderStyle      'solid'|'rounded'|'double'|'bold'|'dashed'|..."
  />
  <Text
    :x="2"
    :y="10"
    value="padding*         number            Padding (Top/Right/Bottom/Left)"
  />
  <Text
    :x="2"
    :y="11"
    value="shadowOffsetX/Y  number            Shadow offset"
  />
  <Text
    :x="2"
    :y="12"
    value="zIndex           number            Render order"
  />
  <Text :x="2" :y="13" value="draggable        boolean           Enable drag" />
  <Text
    :x="2"
    :y="14"
    value="styleModifier     FontStyle        Font style (bold, italic, underline...)"
  />

  <Text :x="2" :y="17" value="▸ Border Styles" styleModifier="bold" />
  <Box :x="2" :y="18" width="48%" :height="3" borderStyle="solid">
    <Text value="  solid" />
  </Box>
  <Box x="50%" :y="18" width="48%" :height="3" borderStyle="rounded">
    <Text value="  rounded" />
  </Box>
  <Box :x="2" :y="22" width="48%" :height="3" borderStyle="double">
    <Text value="  double" />
  </Box>
  <Box x="50%" :y="22" width="48%" :height="3" borderStyle="bold">
    <Text value="  bold" />
  </Box>
  <Box :x="2" :y="26" width="48%" :height="3" borderStyle="dashed">
    <Text value="  dashed" />
  </Box>
  <Box x="50%" :y="26" width="48%" :height="3" borderStyle="outsetbold">
    <Text value="  outsetbold" />
  </Box>

  <Text :x="2" :y="30" value="▸ Layout Direction" styleModifier="bold" />
  <Box
    :x="2"
    :y="31"
    width="48%"
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
    x="50%"
    :y="31"
    width="48%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B" />
    <Text value="vertical + gap=1" />
  </Box>

  <Text :x="2" :y="36" value="▸ Alignment" styleModifier="bold" />
  <Box
    :x="2"
    :y="37"
    width="48%"
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
    x="50%"
    :y="37"
    width="48%"
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
    :x="2"
    :y="42"
    width="48%"
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
    x="50%"
    :y="42"
    width="48%"
    :height="4"
    :direction="'vertical'"
    :gap="1"
    :align="'stretch'"
    borderStyle="rounded"
  >
    <Text value="align=stretch" />
    <Text value="fills width" />
  </Box>

  <Text :x="2" :y="47" value="▸ Shadow & Padding" styleModifier="bold" />
  <Box
    :x="2"
    :y="48"
    width="48%"
    :height="3"
    borderStyle="rounded"
    :shadowOffsetX="2"
    :shadowOffsetY="1"
    :paddingLeft="2"
  >
    <Text value="shadow + padding" />
  </Box>
  <Box
    x="50%"
    :y="48"
    width="48%"
    :height="3"
    borderStyle="rounded"
    :paddingTop="1"
    :paddingLeft="2"
  >
    <Text value="padding T=1 L=2" />
  </Box>

  <Text
    :x="2"
    :y="52"
    value="▸ Events: click, mousedown, mouseup, contextmenu, dragstart, dragend"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="53"
    width="48%"
    :height="3"
    borderStyle="rounded"
    @click="handleClick"
  >
    <Text :value="clickLabel" />
  </Box>
  <Box
    x="50%"
    :y="53"
    width="48%"
    :height="3"
    borderStyle="rounded"
    draggable
    @dragend="handleDragEnd"
  >
    <Text :value="dragLabel" />
  </Box>

  <Text
    :x="2"
    :y="57"
    value="▸ justifyContent (main-axis distribution)"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="58"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'start'"
    borderStyle="rounded"
  >
    <Text value="[start]" />
  </Box>
  <Box
    x="50%"
    :y="58"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'center'"
    borderStyle="rounded"
  >
    <Text value="[center]" />
  </Box>
  <Box
    :x="2"
    :y="62"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    :justifyContent="'end'"
    borderStyle="rounded"
  >
    <Text value="[end]" />
  </Box>
  <Box
    x="50%"
    :y="62"
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
    :x="2"
    :y="66"
    value="▸ flexGrow (per-child free-space share)"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="67"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    borderStyle="rounded"
  >
    <Text value="g=0" />
    <Text value="g=1" :flexGrow="1" />
  </Box>
  <Box
    x="50%"
    :y="67"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    borderStyle="rounded"
  >
    <Text value="g=1" :flexGrow="1" />
    <Text value="g=1" :flexGrow="1" />
    <Text value="g=1" :flexGrow="1" />
  </Box>

  <Text :x="2" :y="71" value="▸ Reverse directions" styleModifier="bold" />
  <Box
    :x="2"
    :y="72"
    width="48%"
    :height="3"
    :direction="'vertical-reverse'"
    borderStyle="rounded"
  >
    <Text value="first (bottom)" />
    <Text value="second" />
  </Box>
  <Box
    x="50%"
    :y="72"
    width="48%"
    :height="3"
    :direction="'horizontal-reverse'"
    borderStyle="rounded"
  >
    <Text value="A" />
    <Text value="B (right)" />
  </Box>

  <Text
    :x="2"
    :y="76"
    value="▸ flexShrink (overflow compression)"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="77"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
    <Text value="s=0" :flexBasis="24" />
  </Box>
  <Box
    x="50%"
    :y="77"
    width="48%"
    :height="3"
    :direction="'horizontal'"
    :align="'start'"
    borderStyle="rounded"
  >
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
    <Text value="s=1" :flexBasis="24" :flexShrink="1" />
  </Box>

  <Text
    :x="2"
    :y="81"
    value="▸ flexBasis (main-axis base size)"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="82"
    width="96%"
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
    :x="2"
    :y="86"
    value="▸ alignSelf (per-child cross-axis override)"
    styleModifier="bold"
  />
  <Box
    :x="2"
    :y="87"
    width="96%"
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
