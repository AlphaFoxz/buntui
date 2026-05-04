<template>
    <Text :x="1" :y="3" :colorFg="'rgba(203,166,245,1)'" :value="title" />

    <Text
        :x="1"
        :y="4"
        :colorFg="'rgba(249,226,175,1)'"
        value="李白斗酒诗百篇 长安市上酒家眠 天子呼来不上船 自称臣是酒中仙"
    />
</template>

<script setup lang="ts">
import { computed, ref } from '@vue/reactivity'

const timeCount = ref(0)

setInterval(() => {
    timeCount.value += 1
}, 1000)
const title = computed(() => {
    return `buntui Components ${timeCount.value} s`
})
</script>
