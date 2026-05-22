<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="▶ ScrollBox with Border & Scrollbar" />

    <ScrollBox
        :x="1"
        :y="4"
        width="45%"
        :height="10"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="rounded"
        :alwaysShowScrollbar="true"
        :scrollbarColor="'rgba(137,180,250,0.6)'"
        :scrollbarTrackColor="'rgba(49,50,68,1)'"
        @scroll="handleScroll"
    >
        <template>
            <Text
                v-for="(item, index) in 20"
                :x="1"
                :y="5 + index"
                :colorFg="index % 2 === 0 ? 'rgba(205,214,244,1)' : 'rgba(108,112,134,1)'"
                :value="`${String(index + 1).padStart(2, '0')}. 第${index + 1}行内容 - Scrollable content line ${index + 1}`"
            />
        </template>
    </ScrollBox>

    <Box
        x="50%"
        :y="4"
        width="45%"
        :height="10"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :colorFg="'rgba(166,227,161,1)'" value="▶ Scroll Info" />
        <Text :colorFg="'rgba(205,214,244,1)'" :value="`Offset: ${scrollOffsetY}`" />
        <Text :colorFg="'rgba(205,214,244,1)'" :value="`Max: ${maxScrollY}`" />
        <Text :colorFg="'rgba(205,214,244,1)'" :value="`Progress: ${scrollPercent}%`" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="Controls:" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="  Mouse wheel / drag to scroll" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="  ↑↓ Arrow keys (1 line)" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="  PageUp/Down (viewport)" />
    </Box>

    <Text :x="1" :y="15" :colorFg="'rgba(250,179,135,1)'" value="▶ Compact List (no border)" />

    <ScrollBox
        :x="1"
        :y="16"
        width="45%"
        :height="6"
        :colorBg="'rgba(24,24,37,1)'"
        @scroll="handleScroll2"
    >
        <template>
            <Text
                v-for="(item, index) in 30"
                :x="1"
                :y="17 + index"
                :colorFg="index === highlightIndex ? 'rgba(250,179,135,1)' : 'rgba(108,112,134,1)'"
                :value="`  ${index === highlightIndex ? '▸' : ' '} Item ${String(index + 1).padStart(2, '0')} - compact scroll list`"
            />
        </template>
    </ScrollBox>

    <ScrollBox
        x="50%"
        :y="15"
        width="45%"
        :height="6"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,0.3)'"
        borderStyle="double"
    >
        <template>
            <Text
                v-for="(item, index) in 15"
                :x="1"
                :y="16 + index"
                :colorFg="'rgba(245,194,231,1)'"
                :value="`${'█'.repeat(Math.max(1, 20 - index))}${'░'.repeat(index)} ${20 - index}%`"
            />
        </template>
    </ScrollBox>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const scrollOffsetY = ref(0)
const maxScrollY = ref(0)
const scrollPercent = ref('0')

function handleScroll(event: TuiScrollEvent) {
    scrollOffsetY.value = event.scrollOffsetY
    maxScrollY.value = event.maxScrollY
    scrollPercent.value = maxScrollY.value > 0
        ? String(Math.round((event.scrollOffsetY / event.maxScrollY) * 100))
        : '0'
}

const highlightIndex = ref(3)

function handleScroll2(event: TuiScrollEvent) {
    void event
}
</script>
