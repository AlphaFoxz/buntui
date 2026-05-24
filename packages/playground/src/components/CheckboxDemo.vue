<template>
    <Checkbox :x="1" :y="3" :width="28" :height="1" label="Enable notifications" @change="handleCheckChange" />
    <Checkbox
        :x="1"
        :y="4"
        :width="28"
        :height="1"
        label="Dark mode"
        :checked="darkMode"
        @change="handleDarkModeChange"
    />
    <Checkbox :x="1" :y="5" :width="28" :height="1" label="Disabled option" :disabled="true" :checked="true" />
    <Checkbox
        :x="1"
        :y="6"
        :width="28"
        :height="1"
        label="Select all"
        :indeterminate="isIndeterminate"
        :checked="allChecked"
        @change="handleSelectAllChange"
    />
    <Checkbox :x="1" :y="7" :width="28" :height="1" label="Option A" :checked="optA" @change="handleOptA" />
    <Checkbox :x="1" :y="8" :width="28" :height="1" label="Option B" :checked="optB" @change="handleOptB" />
    <Checkbox :x="1" :y="9" :width="28" :height="1" label="Option C" :checked="optC" @change="handleOptC" />

    <Box
        x="35%"
        :y="3"
        width="60%"
        :height="9"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text value="▶ Checklist Summary" />
        <Text :value="`Notifications: ${notifLabel}`" />
        <Text :value="`Dark Mode: ${darkMode ? 'ON' : 'OFF'}`" />
        <Text
            :value="`Options: A=${optA ? '✓' : '✗'} B=${optB ? '✓' : '✗'} C=${optC ? '✓' : '✗'} (${checkedCount}/3)`"
        />
        <Text value="Click checkboxes or use Enter/Space when focused" />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const notifEnabled = ref(false)
const darkMode = ref(false)
const optA = ref(false)
const optB = ref(true)
const optC = ref(false)

const allChecked = computed(() => optA.value && optB.value && optC.value)
const noneChecked = computed(() => !optA.value && !optB.value && !optC.value)
const isIndeterminate = computed(() => !allChecked.value && !noneChecked.value)
const checkedCount = computed(() => [optA.value, optB.value, optC.value].filter(Boolean).length)
const notifLabel = computed(() => (notifEnabled.value ? 'Enabled' : 'Disabled'))

function handleCheckChange(data: TuiCheckboxChangeEvent) {
    notifEnabled.value = data.checked
}
function handleDarkModeChange(data: TuiCheckboxChangeEvent) {
    darkMode.value = data.checked
}
function handleSelectAllChange(data: TuiCheckboxChangeEvent) {
    optA.value = data.checked
    optB.value = data.checked
    optC.value = data.checked
}
function handleOptA(data: TuiCheckboxChangeEvent) {
    optA.value = data.checked
}
function handleOptB(data: TuiCheckboxChangeEvent) {
    optB.value = data.checked
}
function handleOptC(data: TuiCheckboxChangeEvent) {
    optC.value = data.checked
}
</script>
