<template>
  <Text value="Checkbox" styleModifier="bold" />
  <Text
    value="Boolean checkbox with label, checked state, and indeterminate mode."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="label           string          Label text" />
  <Text value="checked         boolean         Checked state" />
  <Text
    value="indeterminate    boolean         Indeterminate (partial) state"
  />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="width, height    TuiSizeValue    Size" />

  <Text value="▸ Basic" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="2"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Checkbox
      :width="28"
      :height="1"
      label="Enable notifications"
      @change="handleNotif"
    />
    <Checkbox
      :width="28"
      :height="1"
      label="Dark mode"
      :checked="darkMode"
      @change="handleDarkMode"
    />
  </Box>
  <Box
    width="98%"
    direction="horizontal"
    :gap="2"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Checkbox
      :width="28"
      :height="1"
      label="Disabled unchecked"
      :disabled="true"
    />
    <Checkbox
      :width="28"
      :height="1"
      label="Disabled checked"
      :disabled="true"
      :checked="true"
    />
  </Box>

  <Text value="▸ Indeterminate (Select All pattern)" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="2"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Box
      direction="vertical"
      :gap="1"
      borderStyle="none"
      colorBg="rgba(0,0,0,0)"
    >
      <Checkbox
        :width="28"
        :height="1"
        label="Select all"
        :indeterminate="isIndeterminate"
        :checked="allChecked"
        @change="handleSelectAll"
      />
      <Checkbox
        :width="28"
        :height="1"
        label="Option A"
        :checked="optA"
        @change="handleOptA"
      />
      <Checkbox
        :width="28"
        :height="1"
        label="Option B"
        :checked="optB"
        @change="handleOptB"
      />
      <Checkbox
        :width="28"
        :height="1"
        label="Option C"
        :checked="optC"
        @change="handleOptC"
      />
    </Box>
    <Box
      width="60%"
      :height="5"
      borderStyle="rounded"
      direction="vertical"
      :gap="1"
    >
      <Text value="▸ Summary" styleModifier="bold" />
      <Text :value="`Notifications: ${notifEnabled ? 'ON' : 'OFF'}`" />
      <Text :value="`Dark Mode: ${darkMode ? 'ON' : 'OFF'}`" />
      <Text
        :value="`Options: A=${optA ? 'Y' : 'N'} B=${optB ? 'Y' : 'N'} C=${optC ? 'Y' : 'N'} (${checkedCount}/3)`"
      />
    </Box>
  </Box>

  <Text value="▸ Events: change ({ checked: boolean })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const notifEnabled = ref(false);
const darkMode = ref(false);
const optA = ref(false);
const optB = ref(true);
const optC = ref(false);

const allChecked = computed(() => optA.value && optB.value && optC.value);
const noneChecked = computed(() => !optA.value && !optB.value && !optC.value);
const isIndeterminate = computed(() => !allChecked.value && !noneChecked.value);
const checkedCount = computed(
  () => [optA.value, optB.value, optC.value].filter(Boolean).length,
);

function handleNotif(d: TuiCheckboxChangeEvent) {
  notifEnabled.value = d.checked;
}

function handleDarkMode(d: TuiCheckboxChangeEvent) {
  darkMode.value = d.checked;
}

function handleSelectAll(d: TuiCheckboxChangeEvent) {
  optA.value = d.checked;
  optB.value = d.checked;
  optC.value = d.checked;
}

function handleOptA(d: TuiCheckboxChangeEvent) {
  optA.value = d.checked;
}

function handleOptB(d: TuiCheckboxChangeEvent) {
  optB.value = d.checked;
}

function handleOptC(d: TuiCheckboxChangeEvent) {
  optC.value = d.checked;
}
</script>
