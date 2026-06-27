<template>
  <Text value="Switch" styleModifier="bold" />
  <Text
    value="Toggle switch widget with on/off states and animated indicator."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="label           string          Label text" />
  <Text value="checked         boolean         On/off state" />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="width, height    TuiSizeValue    Size" />

  <Text value="▸ Basic" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="2"
    :align="'start'"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Switch
      :width="20"
      :height="1"
      label="Notifications"
      @change="handleNotif"
    />
    <Switch
      :width="20"
      :height="1"
      label="Auto-update"
      :checked="autoUpdate"
      @change="handleAutoUpdate"
    />
  </Box>

  <Text value="▸ More Options" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="2"
    :align="'start'"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Switch
      :width="20"
      :height="1"
      label="Wi-Fi"
      :checked="wifi"
      @change="handleWifi"
    />
    <Switch
      :width="20"
      :height="1"
      label="Bluetooth"
      :checked="bt"
      @change="handleBt"
    />
  </Box>
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="2"
    :align="'start'"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Switch
      :width="20"
      :height="1"
      label="Location"
      :checked="loc"
      @change="handleLoc"
    />
    <Switch
      :width="20"
      :height="1"
      label="Dark Mode"
      :checked="dark"
      @change="handleDark"
    />
  </Box>

  <Text value="▸ Disabled" styleModifier="bold" />
  <Box
    width="98%"
    :direction="'horizontal'"
    :gap="2"
    :align="'start'"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Switch :width="20" :height="1" label="Disabled Off" :disabled="true" />
    <Switch
      :width="20"
      :height="1"
      label="Disabled On"
      :disabled="true"
      :checked="true"
    />
  </Box>

  <Text value="▸ Summary" styleModifier="bold" />
  <Box
    width="98%"
    :height="3"
    borderStyle="rounded"
    :direction="'vertical'"
    :gap="1"
  >
    <Text
      :value="`Wi-Fi: ${wifi ? 'ON' : 'OFF'} | BT: ${bt ? 'ON' : 'OFF'} | Location: ${loc ? 'ON' : 'OFF'}`"
    />
    <Text
      :value="`Auto-update: ${autoUpdate ? 'ON' : 'OFF'} | Dark Mode: ${dark ? 'ON' : 'OFF'}`"
    />
  </Box>

  <Text value="▸ Events: change ({ checked: boolean })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity';

const notifEnabled = ref(false);
const autoUpdate = ref(true);
const wifi = ref(false);
const bt = ref(false);
const loc = ref(false);
const dark = ref(false);

function handleNotif(d: TuiSwitchChangeEvent) {
  notifEnabled.value = d.checked;
}
function handleAutoUpdate(d: TuiSwitchChangeEvent) {
  autoUpdate.value = d.checked;
}
function handleWifi(d: TuiSwitchChangeEvent) {
  wifi.value = d.checked;
}
function handleBt(d: TuiSwitchChangeEvent) {
  bt.value = d.checked;
}
function handleLoc(d: TuiSwitchChangeEvent) {
  loc.value = d.checked;
}
function handleDark(d: TuiSwitchChangeEvent) {
  dark.value = d.checked;
}
</script>
