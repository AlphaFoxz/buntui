<template>
  <Text value="Progress" styleModifier="bold" />
  <Text
    value="Progress bar with determinate and indeterminate (animated) modes."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text
    value="value           number|undefined  Progress value (undefined = indeterminate)"
  />
  <Text value="max             number          Maximum value (default: 1)" />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="width, height    TuiSizeValue    Size" />

  <Text value="▸ Determinate (0-1 range)" styleModifier="bold" />
  <Box
    width="98%"
    :height="1"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Text value="0.3" />
    <Progress :flexGrow="1" :height="1" :value="0.3" />
  </Box>
  <Box
    width="98%"
    :height="1"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Text value="0.6" />
    <Progress :flexGrow="1" :height="1" :value="0.6" />
  </Box>
  <Box
    width="98%"
    :height="1"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Text value="0.9" />
    <Progress :flexGrow="1" :height="1" :value="0.9" />
  </Box>

  <Text value="▸ Custom max (0-100)" styleModifier="bold" />
  <Text :value="`Download: ` + downloadProgress + `%`" />
  <Progress width="98%" :height="1" :value="downloadProgress" :max="100" />

  <Text value="▸ Indeterminate (value=undefined)" styleModifier="bold" />
  <Progress width="98%" :height="1" />

  <Text value="▸ Disabled" styleModifier="bold" />
  <Progress width="98%" :height="1" :value="0.8" :disabled="true" />

  <Text value="▸ Multi-step Progress" styleModifier="bold" />
  <Box
    width="98%"
    :height="4"
    borderStyle="rounded"
    :direction="'vertical'"
    :gap="1"
  >
    <Text :value="`Step ${currentStep}/3 — ${stepLabel}`" />
    <Progress width="100%" :height="1" :value="currentStep" :max="3" />
  </Box>

  <Text
    value="▸ Not focusable (acceptsFocus is always false)"
    styleModifier="bold"
  />
  <Text
    value="▸ No events — Progress is a display-only widget"
    styleModifier="bold"
  />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const downloadProgress = ref(0);
setInterval(() => {
  downloadProgress.value = (downloadProgress.value + 1) % 101;
}, 80);

const currentStep = ref(1);
setInterval(() => {
  currentStep.value = (currentStep.value % 3) + 1;
}, 3000);

const stepLabel = computed(() => {
  const labels = ['Downloading', 'Installing', 'Verifying'];
  return labels[currentStep.value - 1] ?? '';
});
</script>
