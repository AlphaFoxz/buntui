<template>
    <Text :x="2" :y="1" value="RadioGroup" styleModifier="bold" />
    <Text :x="2" :y="2" value="Single-selection radio group. Navigate with arrow keys, select with Enter/Space." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="options         string[]        Option labels" />
    <Text :x="2" :y="6" value="value           number          Selected index (-1 = none)" />
    <Text :x="2" :y="7" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="8" value="width, height    TuiSizeValue    Size" />

    <Text :x="2" :y="10" value="▸ Basic" styleModifier="bold" />
    <RadioGroup
        :x="2"
        :y="11"
        width="45%"
        :height="3"
        :options="['Red', 'Green', 'Blue', 'Yellow']"
        :value="selectedColor"
        @change="handleColorChange"
    />
    <Text :x="2" :y="15" :value="`Selected color index: ${selectedColor}`" />

    <Text x="50%" :y="10" value="▸ Disabled" styleModifier="bold" />
    <RadioGroup
        x="50%"
        :y="11"
        width="45%"
        :height="3"
        :options="['Option A', 'Option B', 'Option C']"
        :value="1"
        :disabled="true"
    />

    <Text :x="2" :y="17" value="▸ Dynamic Options" styleModifier="bold" />
    <RadioGroup
        :x="2"
        :y="18"
        width="95%"
        :height="4"
        :options="frameworkOptions"
        :value="selectedFramework"
        @change="handleFrameworkChange"
    />
    <Text :x="2" :y="23" :value="`Selected framework: ${frameworkName} (index: ${selectedFramework})`" />

    <Text :x="2" :y="25" value="▸ Events: change ({ value: number, label: string })" styleModifier="bold" />
    <Text :x="2" :y="26" value="Keyboard: ArrowUp/Down to navigate, Enter/Space to select" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const selectedColor = ref(-1)
function handleColorChange(data: TuiRadioGroupChangeEvent) {
    selectedColor.value = data.value
}

const frameworkOptions = ['Vue', 'React', 'Svelte', 'Solid', 'Angular']
const selectedFramework = ref(-1)
const frameworkName = computed(() => frameworkOptions[selectedFramework.value] ?? 'None')
function handleFrameworkChange(data: TuiRadioGroupChangeEvent) {
    selectedFramework.value = data.value
}
</script>
