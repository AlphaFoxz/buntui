<template>
    <Text :x="2" :y="1" value="Switch" styleModifier="bold" />
    <Text :x="2" :y="2" value="Toggle switch widget with on/off states and animated indicator." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="label           string          Label text" />
    <Text :x="2" :y="6" value="checked         boolean         On/off state" />
    <Text :x="2" :y="7" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="8" value="width, height    TuiSizeValue    Size" />

    <Text :x="2" :y="10" value="▸ Basic" styleModifier="bold" />
    <Switch :x="2" :y="11" :width="20" :height="1" label="Notifications" @change="handleNotif" />
    <Switch
        :x="30"
        :y="11"
        :width="20"
        :height="1"
        label="Auto-update"
        :checked="autoUpdate"
        @change="handleAutoUpdate"
    />

    <Text :x="2" :y="13" value="▸ More Options" styleModifier="bold" />
    <Switch :x="2" :y="14" :width="20" :height="1" label="Wi-Fi" :checked="wifi" @change="handleWifi" />
    <Switch :x="30" :y="14" :width="20" :height="1" label="Bluetooth" :checked="bt" @change="handleBt" />
    <Switch :x="2" :y="15" :width="20" :height="1" label="Location" :checked="loc" @change="handleLoc" />
    <Switch :x="30" :y="15" :width="20" :height="1" label="Dark Mode" :checked="dark" @change="handleDark" />

    <Text :x="2" :y="17" value="▸ Disabled" styleModifier="bold" />
    <Switch :x="2" :y="18" :width="20" :height="1" label="Disabled Off" :disabled="true" />
    <Switch :x="30" :y="18" :width="20" :height="1" label="Disabled On" :disabled="true" :checked="true" />

    <Text :x="2" :y="20" value="▸ Summary" styleModifier="bold" />
    <Box :x="2" :y="21" width="95%" :height="3" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text :value="`Wi-Fi: ${wifi ? 'ON' : 'OFF'} | BT: ${bt ? 'ON' : 'OFF'} | Location: ${loc ? 'ON' : 'OFF'}`" />
        <Text :value="`Auto-update: ${autoUpdate ? 'ON' : 'OFF'} | Dark Mode: ${dark ? 'ON' : 'OFF'}`" />
    </Box>

    <Text :x="2" :y="25" value="▸ Events: change ({ checked: boolean })" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref } from '@vue/reactivity'

const notifEnabled = ref(false)
const autoUpdate = ref(true)
const wifi = ref(false)
const bt = ref(false)
const loc = ref(false)
const dark = ref(false)

function handleNotif(d: TuiSwitchChangeEvent) {
    notifEnabled.value = d.checked
}
function handleAutoUpdate(d: TuiSwitchChangeEvent) {
    autoUpdate.value = d.checked
}
function handleWifi(d: TuiSwitchChangeEvent) {
    wifi.value = d.checked
}
function handleBt(d: TuiSwitchChangeEvent) {
    bt.value = d.checked
}
function handleLoc(d: TuiSwitchChangeEvent) {
    loc.value = d.checked
}
function handleDark(d: TuiSwitchChangeEvent) {
    dark.value = d.checked
}
</script>
