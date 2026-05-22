<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="▶ State Buttons (hover / focus / click)" />

    <Button :x="1" :y="4" :width="18" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="21" :y="4" :width="25" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />

    <Text :x="1" :y="8" :colorFg="'rgba(166,227,161,1)'" value="▶ Border Style Variants" />

    <Button :x="1" :y="9" :width="14" :height="3" value="Solid" borderStyleNormal="solid" @click="handleClick('Solid')" />
    <Button :x="17" :y="9" :width="14" :height="3" value="Rounded" borderStyleNormal="rounded" @click="handleClick('Rounded')" />
    <Button :x="33" :y="9" :width="14" :height="3" value="Bold" borderStyleNormal="bold" @click="handleClick('Bold')" />
    <Button :x="49" :y="9" :width="14" :height="3" value="Double" borderStyleNormal="double" @click="handleClick('Double')" />
    <Button :x="65" :y="9" :width="14" :height="3" value="Dashed" borderStyleNormal="dashed" @click="handleClick('Dashed')" />

    <Text :x="1" :y="13" :colorFg="'rgba(250,179,135,1)'" value="▶ Custom Color Schemes" />

    <Button
        :x="1"
        :y="14"
        :width="18"
        :height="3"
        value="Rose"
        :borderStyleNormal="'rounded'"
        :colorBgNormal="'rgba(243,139,168,0.15)'"
        :colorFgNormal="'rgba(243,139,168,1)'"
        :borderColorNormal="'rgba(243,139,168,0.5)'"
        :colorBgHovered="'rgba(243,139,168,0.3)'"
        :colorFgHovered="'rgba(243,139,168,1)'"
        :borderColorHovered="'rgba(243,139,168,1)'"
        :colorBgPressed="'rgba(243,139,168,0.5)'"
        :colorFgPressed="'rgba(30,30,46,1)'"
        :borderColorPressed="'rgba(243,139,168,1)'"
        @click="handleClick('Rose')"
    />
    <Button
        :x="21"
        :y="14"
        :width="18"
        :height="3"
        value="Sapphire"
        :borderStyleNormal="'rounded'"
        :colorBgNormal="'rgba(137,180,250,0.15)'"
        :colorFgNormal="'rgba(137,180,250,1)'"
        :borderColorNormal="'rgba(137,180,250,0.5)'"
        :colorBgHovered="'rgba(137,180,250,0.3)'"
        :colorFgHovered="'rgba(137,180,250,1)'"
        :borderColorHovered="'rgba(137,180,250,1)'"
        :colorBgPressed="'rgba(137,180,250,0.5)'"
        :colorFgPressed="'rgba(30,30,46,1)'"
        :borderColorPressed="'rgba(137,180,250,1)'"
        @click="handleClick('Sapphire')"
    />
    <Button
        :x="41"
        :y="14"
        :width="18"
        :height="3"
        value="Green"
        :borderStyleNormal="'rounded'"
        :colorBgNormal="'rgba(166,227,161,0.15)'"
        :colorFgNormal="'rgba(166,227,161,1)'"
        :borderColorNormal="'rgba(166,227,161,0.5)'"
        :colorBgHovered="'rgba(166,227,161,0.3)'"
        :colorFgHovered="'rgba(166,227,161,1)'"
        :borderColorHovered="'rgba(166,227,161,1)'"
        :colorBgPressed="'rgba(166,227,161,0.5)'"
        :colorFgPressed="'rgba(30,30,46,1)'"
        :borderColorPressed="'rgba(166,227,161,1)'"
        @click="handleClick('Green')"
    />
    <Button
        :x="61"
        :y="14"
        :width="18"
        :height="3"
        value="Yellow"
        :borderStyleNormal="'rounded'"
        :colorBgNormal="'rgba(249,226,175,0.15)'"
        :colorFgNormal="'rgba(249,226,175,1)'"
        :borderColorNormal="'rgba(249,226,175,0.5)'"
        :colorBgHovered="'rgba(249,226,175,0.3)'"
        :colorFgHovered="'rgba(249,226,175,1)'"
        :borderColorHovered="'rgba(249,226,175,1)'"
        :colorBgPressed="'rgba(249,226,175,0.5)'"
        :colorFgPressed="'rgba(30,30,46,1)'"
        :borderColorPressed="'rgba(249,226,175,1)'"
        @click="handleClick('Yellow')"
    />

    <Text :x="1" :y="18" :colorFg="'rgba(203,166,245,1)'" value="▶ Sizes & Disabled" />

    <Button :x="1" :y="19" :width="10" :height="1" value="Tiny" @click="handleClick('Tiny')" />
    <Button :x="13" :y="18" :width="16" :height="3" value="Normal" @click="handleClick('Normal')" />
    <Button :x="31" :y="17" :width="20" :height="5" value="Large" @click="handleClick('Large')" />
    <Button :x="53" :y="18" :width="18" :height="3" value="Disabled" :disabled="true" />

    <Text :x="1" :y="22" :colorFg="'rgba(108,112,134,1)'" :value="clickLog" />
</template>

<script setup lang="ts">
import { computed, ref } from '@vue/reactivity'

const buttonDisabled = ref(true)
const countdown = ref(5)
const clickLog = ref('Click any button to see output here')

const buttonLabel = computed(() => {
    return `Button: ${buttonDisabled.value ? 'Disabled' : 'Enabled(' + countdown.value + ')'} `
})

function handleToggleClick() {
    buttonDisabled.value = !buttonDisabled.value
    const timer = setInterval(() => {
        countdown.value = countdown.value - 1
        if (countdown.value === 0) {
            buttonDisabled.value = true
            countdown.value = 5
            clearInterval(timer)
        }
    }, 1000)
}

function handleClick(name: string) {
    const now = new Date()
    const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    clickLog.value = `[${ts}] Clicked: ${name}`
}
</script>
