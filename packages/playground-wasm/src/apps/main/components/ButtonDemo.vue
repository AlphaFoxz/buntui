<template>
    <Text :x="2" :y="1" value="Button" styleModifier="bold" />
    <Text :x="2" :y="2" value="Clickable button widget with hover, focus, and pressed states." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="value           string          Button label text" />
    <Text :x="2" :y="6" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="7" value="width, height    TuiSizeValue    Size" />
    <Text :x="2" :y="8" value="borderStyle*     TuiBorderStyleName  Per-state border styles" />
    <Text
        :x="2"
        :y="9"
        value="colorFg/Border/Bg*  TuiColor     Per-state colors (Normal/Hovered/Focused/Pressed/Disabled)"
    />

    <Text :x="2" :y="11" value="▸ Basic Usage" styleModifier="bold" />
    <Button :x="2" :y="12" :width="16" :height="3" value="Click me" @click="handleClick('basic')" />
    <Button :x="20" :y="12" :width="16" :height="3" value="Disabled" :disabled="true" />
    <Text :x="40" :y="13" :value="clickLog" />

    <Text :x="2" :y="16" value="▸ Border Styles (per state)" styleModifier="bold" />
    <Button
        :x="2"
        :y="17"
        :width="12"
        :height="3"
        value="Solid"
        borderStyleNormal="solid"
        @click="handleClick('Solid')"
    />
    <Button
        :x="16"
        :y="17"
        :width="12"
        :height="3"
        value="Rounded"
        borderStyleNormal="rounded"
        @click="handleClick('Rounded')"
    />
    <Button
        :x="30"
        :y="17"
        :width="12"
        :height="3"
        value="Bold"
        borderStyleNormal="bold"
        @click="handleClick('Bold')"
    />
    <Button
        :x="44"
        :y="17"
        :width="12"
        :height="3"
        value="Double"
        borderStyleNormal="double"
        @click="handleClick('Double')"
    />
    <Button
        :x="58"
        :y="17"
        :width="12"
        :height="3"
        value="Dashed"
        borderStyleNormal="dashed"
        @click="handleClick('Dashed')"
    />

    <Text :x="2" :y="21" value="▸ Sizes" styleModifier="bold" />
    <Button :x="2" :y="22" :width="10" :height="1" value="Tiny" @click="handleClick('Tiny')" />
    <Button :x="14" :y="21" :width="14" :height="3" value="Normal" @click="handleClick('Normal')" />
    <Button :x="30" :y="20" :width="18" :height="5" value="Large" @click="handleClick('Large')" />

    <Text :x="2" :y="26" value="▸ Toggle Disabled Demo" styleModifier="bold" />
    <Button :x="2" :y="27" :width="20" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="24" :y="27" :width="24" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />

    <Text :x="2" :y="31" value="▸ Events: click (Enter/Space)" styleModifier="bold" />
</template>
<script setup lang="ts">
import { computed, ref } from '@vue/reactivity'

const clickLog = ref('(click a button)')
const buttonDisabled = ref(true)
const countdown = ref(5)

const buttonLabel = computed(() => {
    return buttonDisabled.value ? 'Disabled' : `Enabled (${countdown.value}s)`
})

function handleClick(name: string) {
    const now = new Date()
    const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    clickLog.value = `[${ts}] ${name}`
}

function handleToggleClick() {
    buttonDisabled.value = false
    countdown.value = 5
    const timer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0) {
            buttonDisabled.value = true
            countdown.value = 5
            clearInterval(timer)
        }
    }, 1000)
}
</script>
