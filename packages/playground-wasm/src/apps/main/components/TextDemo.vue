<template>
    <Text :x="2" :y="1" value="Text" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="Inline text display widget. Supports font styles, overflow marquee, and color customization."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="value           string         Text content" />
    <Text :x="2" :y="6" value="width, height    TuiSizeValue   Bounding size" />
    <Text :x="2" :y="7" value="colorFg          TuiColor       Foreground color" />
    <Text :x="2" :y="8" value="colorBg          TuiColor       Background color" />
    <Text :x="2" :y="9" value="overflow         'clip'|'marquee'  Overflow behavior (default: marquee)" />
    <Text :x="2" :y="10" value="scrollSpeed      number        Marquee speed (cells/sec, default: 4)" />
    <Text :x="2" :y="11" value="scrollPauseMs    number        Pause at edges in ms (default: 1000)" />
    <Text :x="2" :y="12" value="styleModifier    FontStyle     Font style (bold, dim, italic, underline, ...)" />

    <Text :x="2" :y="14" value="▸ Font Styles (styleModifier)" styleModifier="bold" />
    <Box :x="2" :y="15" width="45%" :height="7" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text styleModifier="bold" value="bold" />
        <Text styleModifier="dim" value="dim" />
        <Text styleModifier="italic" value="italic" />
        <Text styleModifier="underline" value="underline" />
        <Text :styleModifier="['bold', 'underline']" value="bold + underline (array)" />
        <Text styleModifier="crossedout" value="crossedout (strikethrough)" />
    </Box>
    <Box x="50%" :y="15" width="45%" :height="7" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text styleModifier="reverse" value="reverse" />
        <Text styleModifier="slowblink" value="slowblink" />
        <Text styleModifier="rapidblink" value="rapidblink" />
        <Text styleModifier="hidden" value="hidden (invisible)" />
        <Text styleModifier="fraktur" value="fraktur" />
        <Text styleModifier="overline" value="overline" />
    </Box>

    <Text :x="2" :y="23" value="▸ Overflow: marquee vs clip" styleModifier="bold" />
    <Text :x="2" :y="24" value="marquee (default):" />
    <Text
        :x="2"
        :y="25"
        :width="50"
        overflow="marquee"
        :scrollSpeed="6"
        :scrollPauseMs="800"
        value="This is a long scrolling text that exceeds the widget width — runs like a marquee."
    />
    <Text :x="2" :y="27" value="clip:" />
    <Text
        :x="2"
        :y="28"
        :width="50"
        overflow="clip"
        value="This text is clipped because overflow='clip'. The rest is hidden."
    />

    <Text :x="2" :y="30" value="▸ Dynamic Content" styleModifier="bold" />
    <Text :x="2" :y="31" :value="clockText" styleModifier="bold" />
    <Text :x="2" :y="32" :value="`Elapsed: ${elapsed}s`" />

    <Text :x="2" :y="34" value="▸ Events: (none — Text is a non-interactive display widget)" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const elapsed = ref(0)
setInterval(() => {
    elapsed.value += 1
}, 1000)

const clockText = computed(() => {
    elapsed.value
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
})
</script>
