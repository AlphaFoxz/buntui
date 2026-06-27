<template>
  <Text value="RadioGroup" styleModifier="bold" />
  <Text
    value="Single-selection radio group. Navigate with arrow keys, select with Enter/Space."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="options         string[]        Option labels" />
  <Text value="value           number          Selected index (-1 = none)" />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="width, height    TuiSizeValue    Size" />

  <Text value="▸ Basic" styleModifier="bold" />
  <RadioGroup
    width="98%"
    :height="3"
    :options="['Red', 'Green', 'Blue', 'Yellow']"
    :value="selectedColor"
    @change="handleColorChange"
  />
  <Text :value="`Selected color index: ${selectedColor}`" />

  <Text value="▸ Disabled" styleModifier="bold" />
  <RadioGroup
    width="98%"
    :height="3"
    :options="['Option A', 'Option B', 'Option C']"
    :value="1"
    :disabled="true"
  />

  <Text value="▸ Dynamic Options" styleModifier="bold" />
  <RadioGroup
    width="98%"
    :height="4"
    :options="frameworkOptions"
    :value="selectedFramework"
    @change="handleFrameworkChange"
  />
  <Text
    :value="`Selected framework: ${frameworkName} (index: ${selectedFramework})`"
  />

  <Text
    value="▸ Events: change ({ value: number, label: string })"
    styleModifier="bold"
  />
  <Text value="Keyboard: ArrowUp/Down to navigate, Enter/Space to select" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const selectedColor = ref(-1);
function handleColorChange(data: TuiRadioGroupChangeEvent) {
  selectedColor.value = data.value;
}

const frameworkOptions = ['Vue', 'React', 'Svelte', 'Solid', 'Angular'];
const selectedFramework = ref(-1);
const frameworkName = computed(
  () => frameworkOptions[selectedFramework.value] ?? 'None',
);
function handleFrameworkChange(data: TuiRadioGroupChangeEvent) {
  selectedFramework.value = data.value;
}
</script>
