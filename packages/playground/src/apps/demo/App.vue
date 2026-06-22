<template>
    <Matrix width="100%" height="100%" />

    <Select :x="1" :y="0" width="30%" label="Widget" :options="tabOptions" v-model="currentTab" />

    <ScrollBox :x="0" :y="2" width="100%" height="90%">
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
    </ScrollBox>

    <FrameRateWatcher x="10%" />
    <Logger />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'
import Logger from '@buntui/extensions/logger'
import Matrix from '@buntui/extensions/matrix'
import FrameRateWatcher from '@buntui/extensions/framerate'

import BoxDemo from './components/BoxDemo.vue'
import ButtonDemo from './components/ButtonDemo.vue'
import CheckboxDemo from './components/CheckboxDemo.vue'
import InputDemo from './components/InputDemo.vue'
import ProgressDemo from './components/ProgressDemo.vue'
import RadioDemo from './components/RadioDemo.vue'
import ScrollBoxDemo from './components/ScrollBoxDemo.vue'
import ScrollIntoViewDemo from './components/ScrollIntoViewDemo.vue'
import SwitchDemo from './components/SwitchDemo.vue'
import TextDemo from './components/TextDemo.vue'
import TableDemo from './components/TableDemo.vue'
import SelectDemo from './components/SelectDemo.vue'

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
])
const currentTab = ref(tabOptions.value[0]!.value)

setTimeout(() => {
    console.log('你好')
}, 1000)
</script>
