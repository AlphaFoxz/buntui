<template>
    <Text :x="1" :y="1" :colorFg="'rgba(108,112,134,1)'" value="buntui 组件示例 | 按 Q 退出" />
    <SelectButton :x="1" :y="2" :height="1" :options="tabOptions" v-model="currentTab" />

    <BoxDemo v-if="currentTab === 'Box'" />
    <ButtonDemo v-if="currentTab === 'Button'" />
    <CheckboxDemo v-if="currentTab === 'Checkbox'" />
    <InputDemo v-if="currentTab === 'Input'" />
    <RadioDemo v-if="currentTab === 'Radio'" />
    <SwitchDemo v-if="currentTab === 'Switch'" />
    <TextDemo v-show="currentTab === 'Text'" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'
import BoxDemo from './components/BoxDemo.vue'
import ButtonDemo from './components/ButtonDemo.vue'
import CheckboxDemo from './components/CheckboxDemo.vue'
import InputDemo from './components/InputDemo.vue'
import RadioDemo from './components/RadioDemo.vue'
import SwitchDemo from './components/SwitchDemo.vue'
import TextDemo from './components/TextDemo.vue'

const tabOptions = ref(['Box', 'Button', 'Checkbox', 'Input', 'Radio', 'Switch', 'Text'])
const currentTab = ref('Box')
</script>
