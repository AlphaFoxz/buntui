<template>
    <Box
        :x="1"
        :y="3"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(137,180,250,1)'" value="▶ Dynamic Clock" />
        <Text :colorFg="'rgba(205,214,244,1)'" :value="clockText" />
        <Text :colorFg="'rgba(108,112,134,1)'" :value="`Elapsed: ${elapsed}s`" />
    </Box>

    <Box
        x="50%"
        :y="3"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(250,179,135,1)'" value="▶ Font Styles" />
        <Text styleModifier="bold" :colorFg="'rgba(197,207,224,1)'" value="Bold 粗体" />
        <Text styleModifier="italic" :colorFg="'rgba(197,207,224,1)'" value="Italic 斜体" />
        <Text styleModifier="underline" :colorFg="'rgba(197,207,224,1)'" value="Underline 下划线" />
    </Box>

    <Box
        :x="1"
        :y="9"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(166,227,161,1)'" value="▶ More Styles" />
        <Text styleModifier="dim" :colorFg="'rgba(197,207,224,1)'" value="Dim 暗淡" />
        <Text :styleModifier="['bold', 'underline']" :colorFg="'rgba(197,207,224,1)'" value="Bold + Underline 组合" />
        <Text styleModifier="crossedout" :colorFg="'rgba(243,139,168,1)'" value="Strikethrough 删除线" />
    </Box>

    <Box
        x="50%"
        :y="9"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(203,166,245,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(203,166,245,1)'" value="▶ Color Palette" />
        <Text :colorFg="'rgba(243,139,168,1)'" value="Red " />
        <Text :colorFg="'rgba(250,179,135,1)'" value="Orange " />
        <Text :colorFg="'rgba(249,226,175,1)'" value="Yellow " />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Green " />
    </Box>

    <Box
        :x="1"
        :y="15"
        width="95%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(249,226,175,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(249,226,175,1)'" value="▶ Marquee Scroll (overflow='marquee')" />
        <Text
            :width="60"
            overflow="marquee"
            :scrollSpeed="6"
            :scrollPauseMs="800"
            :colorFg="'rgba(205,214,244,1)'"
            value="This is a long scrolling text that exceeds the widget width. 这是一段超长的跑马灯文字演示，文字会在容器内自动滚动显示。"
        />
        <Text
            :width="60"
            overflow="clip"
            :colorFg="'rgba(108,112,134,1)'"
            value="This text is clipped because overflow='clip'. 这段文字被裁剪了因为overflow='clip'。后面的内容不会显示。"
        />
    </Box>

    <Box
        :x="1"
        :y="21"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(148,226,213,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(148,226,213,1)'" value="▶ Bg Color" />
        <Text :colorFg="'rgba(30,30,46,1)'" :colorBg="'rgba(243,139,168,1)'" value=" Red BG " />
        <Text :colorFg="'rgba(30,30,46,1)'" :colorBg="'rgba(137,180,250,1)'" value=" Blue BG " />
        <Text :colorFg="'rgba(30,30,46,1)'" :colorBg="'rgba(166,227,161,1)'" value=" Green BG " />
    </Box>

    <Box
        x="50%"
        :y="21"
        width="45%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,0.5)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(245,194,231,1)'" value="▶ CJK & Special" />
        <Text :colorFg="'rgba(205,214,244,1)'" value="中文 日本語 한국어 Emoji" />
        <Text :colorFg="'rgba(205,214,244,1)'" value="★ ♠ ♣ ♥ ♦ ♪ ♫ → ← ↑ ↓" />
        <Text :colorFg="'rgba(205,214,244,1)'" :value="dynamicPoem" />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const elapsed = ref(0)
setInterval(() => {
    elapsed.value += 1
}, 1000)

const clockText = computed(() => {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
})

const poems = [
    '床前明月光，疑是地上霜',
    '举头望明月，低头思故乡',
    '春眠不觉晓，处处闻啼鸟',
    '夜来风雨声，花落知多少',
    '白日依山尽，黄河入海流',
    '欲穷千里目，更上一层楼',
]
const poemIndex = ref(0)
const dynamicPoem = computed(() => poems[poemIndex.value % poems.length]!)
setInterval(() => {
    poemIndex.value = (poemIndex.value + 1) % poems.length
}, 3000)
</script>
