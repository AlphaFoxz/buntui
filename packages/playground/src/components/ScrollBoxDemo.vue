<template>
    <ScrollBox :x="1" :y="3" width="95%" :height="9" :colorBg="'rgba(0,0,0,0)'">
        <template v-for="(item, index) in 20">
            <Text
                :x="1"
                :y="4 + index"
                :colorFg="'rgba(249,226,175,1)'"
                :value="`${index}.李白斗酒诗百篇 长安市上酒家眠 天子呼来不上船 自称臣是酒中仙`"
            />
        </template>
    </ScrollBox>
</template>

<script setup lang="ts"></script>
