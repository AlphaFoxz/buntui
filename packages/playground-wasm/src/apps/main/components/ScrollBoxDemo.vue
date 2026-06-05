<template>
    <Text :x="2" :y="1" value="ScrollBox" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="Scrollable container with optional border and scrollbar. Clips children to its viewport."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="borderStyle     TuiBorderStyleName" />
    <Text :x="2" :y="6" value="scrollSpeed      number         Scroll speed multiplier (default: 3)" />
    <Text :x="2" :y="7" value="alwaysShowScrollbar  boolean   Always show scrollbar (default: false)" />
    <Text :x="2" :y="8" value="colorScrollbar   TuiColor       Scrollbar thumb color" />
    <Text :x="2" :y="9" value="colorScrollbarTrack TuiColor    Scrollbar track color" />
    <Text :x="2" :y="10" value="padding*        number         Padding" />
    <Text :x="2" :y="11" value="gap             number         Gap between children" />
    <Text :x="2" :y="12" value="shadow*         Shadow props   Shadow offset and color" />

    <Text :x="2" :y="14" value="▸ With Border & Scrollbar" styleModifier="bold" />
    <ScrollBox
        :x="2"
        :y="15"
        width="45%"
        :height="8"
        borderStyle="rounded"
        :alwaysShowScrollbar="true"
        @scroll="handleScroll"
    >
        <template>
            <Text
                v-for="(item, index) in 20"
                :x="1"
                :y="16 + index"
                :value="`${String(index + 1).padStart(2, '0')}. Line ${index + 1} — scrollable content`"
            />
        </template>
    </ScrollBox>

    <Box x="50%" :y="15" width="45%" :height="8" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text value="▸ Scroll Info" styleModifier="bold" />
        <Text :value="`Offset: ${scrollOffsetY}`" />
        <Text :value="`Max: ${maxScrollY}`" />
        <Text :value="`Progress: ${scrollPercent}%`" />
        <Text value="" />
        <Text value="Controls:" />
        <Text value="  Mouse wheel to scroll" />
        <Text value="  Arrow keys / PageUp/Down" />
    </Box>

    <Text :x="2" :y="24" value="▸ No Border (compact)" styleModifier="bold" />
    <ScrollBox :x="2" :y="25" width="45%" :height="5">
        <template>
            <Text
                v-for="(item, index) in 30"
                :x="1"
                :y="26 + index"
                :value="`  Item ${String(index + 1).padStart(2, '0')} — no border scroll`"
            />
        </template>
    </ScrollBox>

    <ScrollBox x="50%" :y="25" width="45%" :height="5" borderStyle="double">
        <template>
            <Text v-for="(item, index) in 15" :x="1" :y="26 + index" :value="barValues[index]" />
        </template>
    </ScrollBox>

    <Text
        :x="2"
        :y="31"
        value="▸ Methods: scrollTo(n), scrollToTop(), scrollToBottom(), scrollBy(n), scrollIntoView(child)"
        styleModifier="bold"
    />
    <Text :x="2" :y="32" value="▸ Events: scroll ({ scrollOffsetY, maxScrollY })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity'

const scrollOffsetY = ref(0)
const maxScrollY = ref(0)
const scrollPercent = ref('0')

const barValues = Array.from({ length: 15 }, (_, i) => {
    const filled = '\u2588'.repeat(Math.max(1, 20 - i))
    const empty = '\u2591'.repeat(i)
    return `${filled}${empty} ${20 - i}%`
})

function handleScroll(event: TuiScrollEvent) {
    scrollOffsetY.value = event.scrollOffsetY
    maxScrollY.value = event.maxScrollY
    scrollPercent.value =
        maxScrollY.value > 0 ? String(Math.round((event.scrollOffsetY / event.maxScrollY) * 100)) : '0'
}
</script>
