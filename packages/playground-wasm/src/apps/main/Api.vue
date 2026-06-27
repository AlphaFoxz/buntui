<template>
  <Select
    :x="0"
    :y="1"
    width="50%"
    label="Core Widget"
    :options="componentOptions"
    v-model="currentComponent"
  />

  <ScrollBox
    :x="0"
    :y="4"
    width="100%"
    height="90%"
    :colorBg="colorThemed({ alpha: 0.6 })"
  >
    <BoxDemo v-if="currentComponent === 'Box'" />
    <TextDemo v-else-if="currentComponent === 'Text'" />
    <InputDemo v-else-if="currentComponent === 'Input'" />
    <ButtonDemo v-else-if="currentComponent === 'Button'" />
    <CheckboxDemo v-else-if="currentComponent === 'Checkbox'" />
    <RadioGroupDemo v-else-if="currentComponent === 'RadioGroup'" />
    <SelectButtonDemo v-else-if="currentComponent === 'SelectButton'" />
    <SelectDemo v-else-if="currentComponent === 'Select'" />
    <SwitchDemo v-else-if="currentComponent === 'Switch'" />
    <ScrollBoxDemo v-else-if="currentComponent === 'ScrollBox'" />
    <TextareaDemo v-else-if="currentComponent === 'Textarea'" />
    <TableDemo v-else-if="currentComponent === 'Table'" />
    <ProgressDemo v-else-if="currentComponent === 'Progress'" />
  </ScrollBox>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity';
import { colorThemed } from '@buntui/core';
import BoxDemo from './components/BoxDemo.vue';
import TextDemo from './components/TextDemo.vue';
import InputDemo from './components/InputDemo.vue';
import ButtonDemo from './components/ButtonDemo.vue';
import CheckboxDemo from './components/CheckboxDemo.vue';
import RadioGroupDemo from './components/RadioGroupDemo.vue';
import SelectButtonDemo from './components/SelectButtonDemo.vue';
import SelectDemo from './components/SelectDemo.vue';
import SwitchDemo from './components/SwitchDemo.vue';
import ScrollBoxDemo from './components/ScrollBoxDemo.vue';
import TextareaDemo from './components/TextareaDemo.vue';
import TableDemo from './components/TableDemo.vue';
import ProgressDemo from './components/ProgressDemo.vue';

const componentOptions = ref([
  { value: 'Box', label: 'Box' },
  { value: 'Text', label: 'Text' },
  { value: 'Input', label: 'Input' },
  { value: 'Button', label: 'Button' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'RadioGroup', label: 'RadioGroup' },
  { value: 'SelectButton', label: 'SelectButton' },
  { value: 'Select', label: 'Select' },
  { value: 'Switch', label: 'Switch' },
  { value: 'ScrollBox', label: 'ScrollBox' },
  { value: 'Textarea', label: 'Textarea' },
  { value: 'Table', label: 'Table' },
  { value: 'Progress', label: 'Progress' },
]);
const currentComponent = ref(componentOptions.value[0]!.value);
</script>
