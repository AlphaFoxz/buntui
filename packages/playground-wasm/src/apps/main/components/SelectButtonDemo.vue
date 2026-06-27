<template>
  <Text value="SelectButton" styleModifier="bold" />
  <Text
    value="Compact inline segmented control. Navigate with ArrowLeft/Right, select with Enter/Space."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text
    value="options         unknown[]       Option values (displayed via String())"
  />
  <Text value="value           unknown         Currently selected value" />
  <Text value="disabled        boolean          Disabled state" />
  <Text
    value="width, height    TuiSizeValue    Size (width=0 means auto-size)"
  />

  <Text value="▸ Basic" styleModifier="bold" />
  <SelectButton :height="1" :options="sizeOptions" v-model="selectedSize" />
  <Text :value="`Selected: ${selectedSize}`" />

  <Text value="▸ Tab Navigation (like this page)" styleModifier="bold" />
  <SelectButton :height="1" :options="tabOptions" v-model="currentTab" />
  <Text :value="`Current tab: ${currentTab}`" />

  <Text value="▸ Disabled" styleModifier="bold" />
  <SelectButton :height="1" :options="sizeOptions" :disabled="true" value="M" />

  <Text
    value="▸ Events: change ({ value: unknown, label: string })"
    styleModifier="bold"
  />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity';

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL'];
const selectedSize = ref('M');

const tabOptions = ['Tab1', 'Tab2', 'Tab3'];
const currentTab = ref('Tab1');
</script>
