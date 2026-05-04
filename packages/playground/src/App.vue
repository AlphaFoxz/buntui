<template>
    <Text :x="1" :y="1" :colorFg="'rgba(108,112,134,1)'" value="buntui 组件示例 | 按 Q 退出" />
    <SelectButton :x="1" :y="2" :height="1" :options="tabOptions" v-model="currentTab" />

    <BoxDemo v-if="currentTab === 'Box'" />
    <InputDemo v-if="currentTab === 'Input'" />
    <RadioDemo v-if="currentTab === 'Radio'" />
    <SwitchDemo v-if="currentTab === 'Switch'" />
    <TextDemo v-if="currentTab === 'Text'" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'
import BoxDemo from '../demo/BoxDemo.vue'
import InputDemo from '../demo/InputDemo.vue'
import RadioDemo from '../demo/RadioDemo.vue'
import SwitchDemo from '../demo/SwitchDemo.vue'
import TextDemo from '../demo/TextDemo.vue'

const tabOptions = ref(['Box', 'Input', 'Radio', 'Switch', 'Text'])
const currentTab = ref('Box')
</script>
