<template>
  <Text value="ScrollBox" styleModifier="bold" />
  <Text
    value="Scrollable container with optional border and scrollbar. Clips children to its viewport."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="borderStyle     TuiBorderStyleName" />
  <Text
    value="scrollSpeed      number         Scroll speed multiplier (default: 3)"
  />
  <Text
    value="alwaysShowScrollbar  boolean   Always show scrollbar (default: false)"
  />
  <Text value="colorScrollbar   TuiColor       Scrollbar thumb color" />
  <Text value="colorScrollbarTrack TuiColor    Scrollbar track color" />
  <Text value="padding*        number         Padding" />
  <Text value="gap             number         Gap between children" />
  <Text value="shadow*         Shadow props   Shadow offset and color" />

  <Text value="▸ With Border & Scrollbar" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <ScrollBox
      width="48%"
      :height="8"
      borderStyle="rounded"
      :alwaysShowScrollbar="true"
      @scroll="handleScroll"
    >
      <template>
        <Text
          v-for="(item, index) in 20"
          :value="`${String(index + 1).padStart(2, '0')}. Line ${index + 1} — scrollable content`"
        />
      </template>
    </ScrollBox>

    <Box
      width="48%"
      :height="7"
      borderStyle="rounded"
      direction="vertical"
      :gap="1"
    >
      <Text value="▸ Scroll Info" styleModifier="bold" />
      <Text :value="`Offset: ${scrollOffsetY}`" />
      <Text :value="`Max: ${maxScrollY}`" />
      <Text :value="`Progress: ${scrollPercent}%`" />
      <Text value="" />
      <Text value="Controls:" />
      <Text value="  Mouse wheel to scroll" />
      <Text value="  Arrow keys / PageUp/Down" />
    </Box>
  </Box>

  <Text value="▸ No Border (compact)" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <ScrollBox width="48%" :height="5">
      <template>
        <Text
          v-for="(item, index) in 30"
          :value="`  Item ${String(index + 1).padStart(2, '0')} — no border scroll`"
        />
      </template>
    </ScrollBox>

    <ScrollBox width="48%" :height="5" borderStyle="double">
      <template>
        <Text v-for="(item, index) in 15" :value="barValues[index]" />
      </template>
    </ScrollBox>
  </Box>

  <Text
    value="▸ Methods: scrollTo(n), scrollToTop(), scrollToBottom(), scrollBy(n), scrollIntoView(child)"
    styleModifier="bold"
  />
  <Text
    value="▸ Events: scroll ({ scrollOffsetY, maxScrollY })"
    styleModifier="bold"
  />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity';

const scrollOffsetY = ref(0);
const maxScrollY = ref(0);
const scrollPercent = ref('0');

const barValues = Array.from({ length: 15 }, (_, i) => {
  const filled = '\u2588'.repeat(Math.max(1, 20 - i));
  const empty = '\u2591'.repeat(i);
  return `${filled}${empty} ${20 - i}%`;
});

function handleScroll(event: TuiScrollEvent) {
  scrollOffsetY.value = event.scrollOffsetY;
  maxScrollY.value = event.maxScrollY;
  scrollPercent.value =
    maxScrollY.value > 0
      ? String(Math.round((event.scrollOffsetY / event.maxScrollY) * 100))
      : '0';
}
</script>
