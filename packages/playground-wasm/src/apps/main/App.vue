<template>
    <Text :x="0" :y="0" value="Buntui" styleModifier="bold" />
    <Select :x="0" :y="1" width="50%" label="Core Widget" :options="pageOptions" v-model="currentPage" />
    <Select
        x="50%"
        :y="1"
        width="50%"
        label="Color Theme"
        :options="themeOptions"
        v-model="currentTheme"
        @change="handleThemeChange"
    />

    <ScrollBox :x="0" :y="4" width="100%" height="90%">
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
import { setTheme, tokyoNightMoon, tokyoNightStorm, rosePineMoon, rosePineDawn, highContrast } from '@buntui/core'
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
])
const currentPage = ref(pageOptions.value[0]!.value)

const themes = [tokyoNightMoon, tokyoNightStorm, rosePineMoon, rosePineDawn, highContrast] as const
const themeOptions = ref(themes.map((t) => ({ value: t.name, label: t.name })))
const currentTheme = ref(tokyoNightMoon.name)
function handleThemeChange(data: TuiSelectChangeEvent) {
    const t = themes.find((t) => t.name === data.value)
    if (t) setTheme(t)
}
</script>
