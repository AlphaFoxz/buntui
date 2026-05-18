<template>
    <Matrix width="100%" height="100%" />

    <SelectButton :x="1" :y="2" :height="1" :options="tabOptions" v-model="currentTab" />

    <BoxDemo v-if="currentTab === 'Box'" />
    <ButtonDemo v-if="currentTab === 'Button'" />
    <CheckboxDemo v-if="currentTab === 'Checkbox'" />
    <InputDemo v-if="currentTab === 'Input'" />
    <RadioDemo v-if="currentTab === 'Radio'" />
    <ScrollBoxDemo v-if="currentTab === 'ScrollBox'" />
    <ProgressBarDemo v-if="currentTab === 'ProgressBar'" />
    <SwitchDemo v-if="currentTab === 'Switch'" />
    <TextDemo v-show="currentTab === 'Text'" />

    <FrameRateWatcher x="10%" />
    <Logger hijack />
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
import ProgressBarDemo from './components/ProgressBarDemo.vue'
import RadioDemo from './components/RadioDemo.vue'
import ScrollBoxDemo from './components/ScrollBoxDemo.vue'
import SwitchDemo from './components/SwitchDemo.vue'
import TextDemo from './components/TextDemo.vue'

const tabOptions = ref([
    'Box',
    'Button',
    'Checkbox',
    'Input',
    'ProgressBar',
    'Radio',
    'Switch',
    'ScrollBox',
    'Text',
    // 'Text',
])
const currentTab = ref(tabOptions.value[0]!)

setTimeout(() => {
    console.log('你好')
}, 1000)
</script>
