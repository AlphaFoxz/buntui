<template>
    <Text :x="1" :y="3" value="Button widget — interactive clickable element" />

    <Button :x="1" :y="4" :width="18" :height="3" value="Click me" @click="handleClick" />
    <Text :x="21" :y="5" :value="log" />

    <Text :x="1" :y="8" value="Border variants:" />
    <Button :x="1" :y="9" :width="12" :height="3" value="Solid" borderStyleNormal="solid" @click="handleClick" />
    <Button :x="15" :y="9" :width="12" :height="3" value="Rounded" borderStyleNormal="rounded" @click="handleClick" />
    <Button :x="29" :y="9" :width="12" :height="3" value="Bold" borderStyleNormal="bold" @click="handleClick" />
    <Button :x="43" :y="9" :width="12" :height="3" value="Double" borderStyleNormal="double" @click="handleClick" />

    <Text :x="1" :y="13" value="States:" />
    <Button :x="1" :y="14" :width="18" :height="3" value="Disabled" :disabled="disabled" />
    <Button :x="21" :y="14" :width="18" :height="3" value="Toggle me" @click="toggleDisabled" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const log = ref('Click a button above')
const disabled = ref(false)

function handleClick() {
    const now = new Date()
    log.value = `Clicked at ${now.toLocaleTimeString()}`
}

function toggleDisabled() {
    disabled.value = !disabled.value
}
</script>
