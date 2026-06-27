<template>
  <Text value="Text" styleModifier="bold" />
  <Text
    value="Inline text display widget. Supports font styles, overflow marquee, and color customization."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="value           string         Text content" />
  <Text value="width, height    TuiSizeValue   Bounding size" />
  <Text value="colorFg          TuiColor       Foreground color" />
  <Text value="colorBg          TuiColor       Background color" />
  <Text
    value="overflow         'clip'|'marquee'  Overflow behavior (default: marquee)"
  />
  <Text
    value="scrollSpeed      number        Marquee speed (cells/sec, default: 4)"
  />
  <Text
    value="scrollPauseMs    number        Pause at edges in ms (default: 1000)"
  />
  <Text
    value="styleModifier    FontStyle     Font style (bold, dim, italic, underline, ...)"
  />

  <Text value="▸ Font Styles (styleModifier)" styleModifier="bold" />
  <Box
    width="98%"
    :height="7"
    borderStyle="rounded"
    direction="vertical"
    :gap="1"
  >
    <Text styleModifier="bold" value="bold" />
    <Text styleModifier="dim" value="dim" />
    <Text styleModifier="italic" value="italic" />
    <Text styleModifier="underline" value="underline" />
    <Text
      :styleModifier="['bold', 'underline']"
      value="bold + underline (array)"
    />
    <Text styleModifier="crossedout" value="crossedout (strikethrough)" />
  </Box>
  <Box
    width="98%"
    :height="7"
    borderStyle="rounded"
    direction="vertical"
    :gap="1"
  >
    <Text styleModifier="reverse" value="reverse" />
    <Text styleModifier="slowblink" value="slowblink" />
    <Text styleModifier="rapidblink" value="rapidblink" />
    <Text styleModifier="hidden" value="hidden (invisible)" />
    <Text styleModifier="fraktur" value="fraktur" />
    <Text styleModifier="overline" value="overline" />
  </Box>

  <Text value="▸ Overflow: marquee vs clip" styleModifier="bold" />
  <Text value="marquee (default):" />
  <Text
    :width="50"
    overflow="marquee"
    :scrollSpeed="6"
    :scrollPauseMs="800"
    value="This is a long scrolling text that exceeds the widget width — runs like a marquee."
  />
  <Text value="clip:" />
  <Text
    :width="50"
    overflow="clip"
    value="This text is clipped because overflow='clip'. The rest is hidden."
  />

  <Text value="▸ Dynamic Content" styleModifier="bold" />
  <Text :value="clockText" styleModifier="bold" />
  <Text :value="`Elapsed: ${elapsed}s`" />

  <Text
    value="▸ Events: (none — Text is a non-interactive display widget)"
    styleModifier="bold"
  />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const elapsed = ref(0);
setInterval(() => {
  elapsed.value += 1;
}, 1000);

const clockText = computed(() => {
  elapsed.value;
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
});
</script>
