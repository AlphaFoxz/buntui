<template>
    <Text :x="2" :y="1" value="SelectButton" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="Compact inline segmented control. Navigate with ArrowLeft/Right, select with Enter/Space."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="options         unknown[]       Option values (displayed via String())" />
    <Text :x="2" :y="6" value="value           unknown         Currently selected value" />
    <Text :x="2" :y="7" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="8" value="width, height    TuiSizeValue    Size (width=0 means auto-size)" />

    <Text :x="2" :y="10" value="▸ Basic" styleModifier="bold" />
    <SelectButton :x="2" :y="11" :height="1" :options="sizeOptions" v-model="selectedSize" />
    <Text :x="2" :y="13" :value="`Selected: ${selectedSize}`" />

    <Text :x="2" :y="15" value="▸ Tab Navigation (like this page)" styleModifier="bold" />
    <SelectButton :x="2" :y="16" :height="1" :options="tabOptions" v-model="currentTab" />
    <Text :x="2" :y="18" :value="`Current tab: ${currentTab}`" />

    <Text :x="2" :y="20" value="▸ Disabled" styleModifier="bold" />
    <SelectButton :x="2" :y="21" :height="1" :options="sizeOptions" :disabled="true" value="M" />

    <Text :x="2" :y="23" value="▸ Events: change ({ value: unknown, label: string })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity'

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL']
const selectedSize = ref('M')

const tabOptions = ['Tab1', 'Tab2', 'Tab3']
const currentTab = ref('Tab1')
</script>
