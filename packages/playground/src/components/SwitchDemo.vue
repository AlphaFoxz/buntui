<template>
    <Switch :x="1" :y="3" :width="20" :height="1" label="Notifications" @change="handleSwitchChange" />
    <Switch
        :x="31"
        :y="3"
        :width="20"
        :height="1"
        label="Auto-update"
        :checked="autoUpdate"
        @change="handleAutoUpdateChange"
    />
    <Switch :x="1" :y="4" :width="20" :height="1" label="Wi-Fi" :checked="wifiEnabled" @change="handleWifiChange" />
    <Switch :x="31" :y="4" :width="20" :height="1" label="Disabled" :disabled="true" :checked="true" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const autoUpdate = ref(true)
const wifiEnabled = ref(false)
function handleSwitchChange(data: TuiSwitchChangeEvent) {
    void data
}
function handleAutoUpdateChange(data: TuiSwitchChangeEvent) {
    autoUpdate.value = data.checked
}
function handleWifiChange(data: TuiSwitchChangeEvent) {
    wifiEnabled.value = data.checked
}
</script>
