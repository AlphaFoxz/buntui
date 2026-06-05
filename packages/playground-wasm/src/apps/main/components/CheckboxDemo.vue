<template>
    <Text :x="2" :y="1" value="Checkbox" styleModifier="bold" />
    <Text :x="2" :y="2" value="Boolean checkbox with label, checked state, and indeterminate mode." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="label           string          Label text" />
    <Text :x="2" :y="6" value="checked         boolean         Checked state" />
    <Text :x="2" :y="7" value="indeterminate    boolean         Indeterminate (partial) state" />
    <Text :x="2" :y="8" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="9" value="width, height    TuiSizeValue    Size" />

    <Text :x="2" :y="11" value="▸ Basic" styleModifier="bold" />
    <Checkbox :x="2" :y="12" :width="28" :height="1" label="Enable notifications" @change="handleNotif" />
    <Checkbox :x="2" :y="13" :width="28" :height="1" label="Dark mode" :checked="darkMode" @change="handleDarkMode" />
    <Checkbox :x="2" :y="14" :width="28" :height="1" label="Disabled unchecked" :disabled="true" />
    <Checkbox :x="2" :y="15" :width="28" :height="1" label="Disabled checked" :disabled="true" :checked="true" />

    <Text :x="2" :y="17" value="▸ Indeterminate (Select All pattern)" styleModifier="bold" />
    <Checkbox
        :x="2"
        :y="18"
        :width="28"
        :height="1"
        label="Select all"
        :indeterminate="isIndeterminate"
        :checked="allChecked"
        @change="handleSelectAll"
    />
    <Checkbox :x="2" :y="19" :width="28" :height="1" label="Option A" :checked="optA" @change="handleOptA" />
    <Checkbox :x="2" :y="20" :width="28" :height="1" label="Option B" :checked="optB" @change="handleOptB" />
    <Checkbox :x="2" :y="21" :width="28" :height="1" label="Option C" :checked="optC" @change="handleOptC" />

    <Text x="35%" :y="17" value="▸ Summary" styleModifier="bold" />
    <Box x="35%" :y="18" width="60%" :height="5" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text :value="`Notifications: ${notifEnabled ? 'ON' : 'OFF'}`" />
        <Text :value="`Dark Mode: ${darkMode ? 'ON' : 'OFF'}`" />
        <Text
            :value="`Options: A=${optA ? 'Y' : 'N'} B=${optB ? 'Y' : 'N'} C=${optC ? 'Y' : 'N'} (${checkedCount}/3)`"
        />
    </Box>

    <Text :x="2" :y="24" value="▸ Events: change ({ checked: boolean })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const notifEnabled = ref(false)
const darkMode = ref(false)
const optA = ref(false)
const optB = ref(true)
const optC = ref(false)

const allChecked = computed(() => optA.value && optB.value && optC.value)
const noneChecked = computed(() => !optA.value && !optB.value && !optC.value)
const isIndeterminate = computed(() => !allChecked.value && !noneChecked.value)
const checkedCount = computed(() => [optA.value, optB.value, optC.value].filter(Boolean).length)

function handleNotif(d: TuiCheckboxChangeEvent) {
    notifEnabled.value = d.checked
}

function handleDarkMode(d: TuiCheckboxChangeEvent) {
    darkMode.value = d.checked
}

function handleSelectAll(d: TuiCheckboxChangeEvent) {
    optA.value = d.checked
    optB.value = d.checked
    optC.value = d.checked
}

function handleOptA(d: TuiCheckboxChangeEvent) {
    optA.value = d.checked
}

function handleOptB(d: TuiCheckboxChangeEvent) {
    optB.value = d.checked
}

function handleOptC(d: TuiCheckboxChangeEvent) {
    optC.value = d.checked
}
</script>
