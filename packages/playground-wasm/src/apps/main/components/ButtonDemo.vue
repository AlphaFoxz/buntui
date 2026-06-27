<template>
  <Text value="Button" styleModifier="bold" />
  <Text
    value="Clickable button widget with hover, focus, and pressed states."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="value           string          Button label text" />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="width, height    TuiSizeValue    Size" />
  <Text value="borderStyle*     TuiBorderStyleName  Per-state border styles" />
  <Text
    value="colorFg/Border/Bg*  TuiColor     Per-state colors (Normal/Hovered/Focused/Pressed/Disabled)"
  />

  <Text value="▸ Basic Usage" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Button
      :width="16"
      :height="3"
      value="Click me"
      @click="handleClick('basic')"
    />
    <Button :width="16" :height="3" value="Disabled" :disabled="true" />
    <Text :value="clickLog" />
  </Box>

  <Text value="▸ Border Styles (per state)" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Button
      :width="12"
      :height="3"
      value="Solid"
      borderStyleNormal="solid"
      @click="handleClick('Solid')"
    />
    <Button
      :width="12"
      :height="3"
      value="Rounded"
      borderStyleNormal="rounded"
      @click="handleClick('Rounded')"
    />
    <Button
      :width="12"
      :height="3"
      value="Bold"
      borderStyleNormal="bold"
      @click="handleClick('Bold')"
    />
    <Button
      :width="12"
      :height="3"
      value="Double"
      borderStyleNormal="double"
      @click="handleClick('Double')"
    />
    <Button
      :width="12"
      :height="3"
      value="Dashed"
      borderStyleNormal="dashed"
      @click="handleClick('Dashed')"
    />
  </Box>

  <Text value="▸ Sizes" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="1"
    :align="'start'"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Button :width="10" :height="1" value="Tiny" @click="handleClick('Tiny')" />
    <Button
      :width="14"
      :height="3"
      value="Normal"
      @click="handleClick('Normal')"
    />
    <Button
      :width="18"
      :height="5"
      value="Large"
      @click="handleClick('Large')"
    />
  </Box>

  <Text value="▸ Toggle Disabled Demo" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Button
      :width="20"
      :height="3"
      value="Toggle disabled"
      @click="handleToggleClick"
    />
    <Button
      :width="24"
      :height="3"
      :disabled="!buttonEnabled"
      :value="buttonLabel"
    />
  </Box>

  <Text value="▸ Events: click (Enter/Space)" styleModifier="bold" />
</template>
<script setup lang="ts">
import { computed, ref } from '@vue/reactivity';

const clickLog = ref('(click a button)');
const buttonEnabled = ref(false);
const countdown = ref(5);

const buttonLabel = computed(() => {
  return buttonEnabled.value ? `Enabled (${countdown.value}s)` : 'Disabled';
});

function handleClick(name: string) {
  const now = new Date();
  const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  clickLog.value = `[${ts}] ${name}`;
}

let timer: ReturnType<typeof setInterval> | undefined;
function handleToggleClick() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }

  if (buttonEnabled.value) {
    buttonEnabled.value = false;
    countdown.value = 5;
    return;
  }

  buttonEnabled.value = true;
  countdown.value = 5;

  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      buttonEnabled.value = false;
      countdown.value = 5;
      clearInterval(timer);
      timer = undefined;
    }
  }, 1000);
}
</script>
