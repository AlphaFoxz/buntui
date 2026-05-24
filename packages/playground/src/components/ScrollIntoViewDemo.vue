<template>
    <Text :x="1" :y="3" value="▶ Scroll Into View — Tab through inputs inside a ScrollBox" />

    <ScrollBox
        :x="1"
        :y="4"
        width="45%"
        :height="15"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="rounded"
        :alwaysShowScrollbar="true"
        :scrollbarColor="'rgba(137,180,250,0.6)'"
        :scrollbarTrackColor="'rgba(49,50,68,1)'"
        @scroll="handleScroll"
    >
        <template>
            <Input
                v-for="(item, index) in 8"
                :x="1"
                :y="index * 3"
                :width="28"
                :height="3"
                :label="`Field ${index + 1}`"
                :placeholder="`Input #${index + 1}...`"
                v-model="values[index]"
            />
        </template>
    </ScrollBox>

    <Box
        x="50%"
        :y="4"
        width="45%"
        :height="15"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :colorFg="'rgba(166,227,161,1)'" value="▶ How it works" />
        <Text value="Press Tab / Shift+Tab to navigate" />
        <Text value="The ScrollBox auto-scrolls to" />
        <Text value="keep the focused input visible." />
        <Text :colorFg="'rgba(108,112,134,1)'" value="" />
        <Text :colorFg="'rgba(250,179,135,1)'" :value="`Scroll offset: ${scrollOffsetY}`" />
        <Text :colorFg="'rgba(250,179,135,1)'" :value="`Max scroll:   ${maxScrollY}`" />
    </Box>

    <Text :x="1" :y="20" value="▶ Nested ScrollBox with Buttons" />

    <ScrollBox
        :x="1"
        :y="21"
        width="45%"
        :height="8"
        :colorBg="'rgba(24,24,37,1)'"
        :borderColor="'rgba(250,179,135,0.3)'"
        borderStyle="rounded"
        :gap="1"
    >
        <template>
            <Button
                v-for="(item, index) in 12"
                :x="1"
                :y="index * 3"
                :width="24"
                :height="3"
                :value="`Button ${index + 1}`"
                borderStyleNormal="rounded"
                @click="handleClick(index + 1)"
            />
        </template>
    </ScrollBox>

    <Box
        x="50%"
        :y="20"
        width="45%"
        :height="8"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(203,166,245,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :colorFg="'rgba(203,166,245,1)'" value="▶ Click Log" />
        <Text :value="clickLog" />
    </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const values = ref(Array.from({ length: 8 }, () => ''))

const scrollOffsetY = ref(0)
const maxScrollY = ref(0)

function handleScroll(event: TuiScrollEvent) {
    scrollOffsetY.value = event.scrollOffsetY
    maxScrollY.value = event.maxScrollY
}

const clickLog = ref('No clicks yet')
function handleClick(index: number) {
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    clickLog.value = `[${ts}] Clicked Button ${index}`
}
</script>
