<template>
    <SelectButton :x="1" :y="2" :height="1" :options="tabOptions" v-model="currentTab" />

    <BoxDemo v-if="currentTab === 'Box'" />
    <ButtonDemo v-if="currentTab === 'Button'" />
    <InputDemo v-if="currentTab === 'Input'" />
    <TextDemo v-if="currentTab === 'Text'" />
    <ProgressDemo v-if="currentTab === 'Progress'" />
    <CheckboxDemo v-if="currentTab === 'Checkbox'" />
    <SwitchDemo v-if="currentTab === 'Switch'" />
    <RadioDemo v-if="currentTab === 'Radio'" />
    <ScrollBoxDemo v-if="currentTab === 'ScrollBox'" />
    <TextareaDemo v-if="currentTab === 'Textarea'" />
    <TableDemo v-if="currentTab === 'Table'" />
    <SelectDemo v-if="currentTab === 'Select'" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

import BoxDemo from './components/BoxDemo.vue'
import ButtonDemo from './components/ButtonDemo.vue'
import InputDemo from './components/InputDemo.vue'
import TextDemo from './components/TextDemo.vue'
import ProgressDemo from './components/ProgressDemo.vue'
import CheckboxDemo from './components/CheckboxDemo.vue'
import SwitchDemo from './components/SwitchDemo.vue'
import RadioDemo from './components/RadioDemo.vue'
import ScrollBoxDemo from './components/ScrollBoxDemo.vue'
import TextareaDemo from './components/TextareaDemo.vue'
import TableDemo from './components/TableDemo.vue'
import SelectDemo from './components/SelectDemo.vue'

const tabOptions = ref([
    'Box',
    'Button',
    'Input',
    'Text',
    'Progress',
    'Checkbox',
    'Switch',
    'Radio',
    'ScrollBox',
    'Textarea',
    'Table',
    'Select',
])
const currentTab = ref(tabOptions.value[0]!)
</script>
