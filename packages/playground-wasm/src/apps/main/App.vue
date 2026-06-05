<template>
    <Box :x="0" :y="0" width="100%" :height="3" :direction="'horizontal'" :gap="1" :align="'center'" borderStyle="none">
        <Text value="bunui" />
        <SelectButton :height="1" :options="pageOptions" v-model="currentPage" />
    </Box>

    <ScrollBox :x="0" :y="3" width="100%" height="95%">
        <BoxDemo v-if="currentPage === 'Box'" />
        <TextDemo v-else-if="currentPage === 'Text'" />
        <InputDemo v-else-if="currentPage === 'Input'" />
        <ButtonDemo v-else-if="currentPage === 'Button'" />
        <CheckboxDemo v-else-if="currentPage === 'Checkbox'" />
        <RadioGroupDemo v-else-if="currentPage === 'RadioGroup'" />
        <SelectButtonDemo v-else-if="currentPage === 'SelectButton'" />
        <SelectDemo v-else-if="currentPage === 'Select'" />
        <SwitchDemo v-else-if="currentPage === 'Switch'" />
        <ScrollBoxDemo v-else-if="currentPage === 'ScrollBox'" />
        <TextareaDemo v-else-if="currentPage === 'Textarea'" />
        <TableDemo v-else-if="currentPage === 'Table'" />
        <ProgressDemo v-else-if="currentPage === 'Progress'" />
    </ScrollBox>
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity'
import BoxDemo from './components/BoxDemo.vue'
import TextDemo from './components/TextDemo.vue'
import InputDemo from './components/InputDemo.vue'
import ButtonDemo from './components/ButtonDemo.vue'
import CheckboxDemo from './components/CheckboxDemo.vue'
import RadioGroupDemo from './components/RadioGroupDemo.vue'
import SelectButtonDemo from './components/SelectButtonDemo.vue'
import SelectDemo from './components/SelectDemo.vue'
import SwitchDemo from './components/SwitchDemo.vue'
import ScrollBoxDemo from './components/ScrollBoxDemo.vue'
import TextareaDemo from './components/TextareaDemo.vue'
import TableDemo from './components/TableDemo.vue'
import ProgressDemo from './components/ProgressDemo.vue'

const pageOptions = ref([
    'Box',
    'Text',
    'Input',
    'Button',
    'Checkbox',
    'RadioGroup',
    'SelectButton',
    'Select',
    'Switch',
    'ScrollBox',
    'Textarea',
    'Table',
    'Progress',
])
const currentPage = ref(pageOptions.value[0]!)
</script>
