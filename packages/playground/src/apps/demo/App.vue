<template>
  <Matrix width="100%" height="100%" />

  <Select
    :x="0"
    :y="1"
    width="50%"
    label="Widget"
    :options="tabOptions"
    v-model="currentTab"
  />
  <Select
    x="50%"
    :y="1"
    width="50%"
    label="Color Theme"
    :options="themeOptions"
    v-model="currentTheme"
    @change="handleThemeChange"
  />

  <ScrollBox
    :x="0"
    :y="4"
    width="100%"
    height="90%"
    :colorBg="colorThemed({ alpha: 0.6 })"
  >
    <BoxDemo v-if="currentTab === 'Box'" />
    <ButtonDemo v-if="currentTab === 'Button'" />
    <CheckboxDemo v-if="currentTab === 'Checkbox'" />
    <InputDemo v-if="currentTab === 'Input'" />
    <RadioDemo v-if="currentTab === 'Radio'" />
    <ScrollBoxDemo v-if="currentTab === 'ScrollBox'" />
    <ScrollIntoViewDemo v-if="currentTab === 'ScrollIntoView'" />
    <ProgressDemo v-if="currentTab === 'Progress'" />
    <SwitchDemo v-if="currentTab === 'Switch'" />
    <TextDemo v-show="currentTab === 'Text'" />
    <TableDemo v-if="currentTab === 'Table'" />
    <SelectDemo v-if="currentTab === 'Select'" />
    <SelectButtonDemo v-if="currentTab === 'SelectButton'" />
    <TextareaDemo v-if="currentTab === 'Textarea'" />
  </ScrollBox>

  <FrameRateWatcher x="10%" />
  <Logger />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity';
import {
  colorThemed,
  setTheme,
  tokyoNightMoon,
  tokyoNightStorm,
  rosePineMoon,
  rosePineDawn,
  highContrast,
} from '@buntui/core';
import Logger from '@buntui/extensions/logger';
import Matrix from '@buntui/extensions/matrix';
import FrameRateWatcher from '@buntui/extensions/framerate';

import BoxDemo from './components/BoxDemo.vue';
import ButtonDemo from './components/ButtonDemo.vue';
import CheckboxDemo from './components/CheckboxDemo.vue';
import InputDemo from './components/InputDemo.vue';
import ProgressDemo from './components/ProgressDemo.vue';
import RadioDemo from './components/RadioDemo.vue';
import ScrollBoxDemo from './components/ScrollBoxDemo.vue';
import ScrollIntoViewDemo from './components/ScrollIntoViewDemo.vue';
import SwitchDemo from './components/SwitchDemo.vue';
import TextDemo from './components/TextDemo.vue';
import TableDemo from './components/TableDemo.vue';
import SelectDemo from './components/SelectDemo.vue';
import SelectButtonDemo from './components/SelectButtonDemo.vue';
import TextareaDemo from './components/TextareaDemo.vue';

const themes = [
  tokyoNightMoon,
  tokyoNightStorm,
  rosePineMoon,
  rosePineDawn,
  highContrast,
] as const;
const themeOptions = ref(themes.map((t) => ({ value: t.name, label: t.name })));
const currentTheme = ref(tokyoNightMoon.name);
function handleThemeChange(data: TuiSelectChangeEvent) {
  const t = themes.find((t) => t.name === data.value);
  if (t) setTheme(t);
}

const tabOptions = ref([
  { value: 'Box', label: 'Box' },
  { value: 'Button', label: 'Button' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Input', label: 'Input' },
  { value: 'Progress', label: 'Progress' },
  { value: 'Radio', label: 'Radio' },
  { value: 'Switch', label: 'Switch' },
  { value: 'ScrollBox', label: 'ScrollBox' },
  { value: 'ScrollIntoView', label: 'ScrollIntoView' },
  { value: 'Text', label: 'Text' },
  { value: 'Table', label: 'Table' },
  { value: 'Select', label: 'Select' },
  { value: 'SelectButton', label: 'SelectButton' },
  { value: 'Textarea', label: 'Textarea' },
]);
const currentTab = ref(tabOptions.value[0]!.value);
</script>
