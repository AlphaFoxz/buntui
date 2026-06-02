<template>
    <Text :x="1" :y="3" value="▶ Basic Switches" />

    <Switch :x="1" :y="4" :width="20" :height="1" label="Notifications" @change="handleSwitchChange" />
    <Switch
        :x="31"
        :y="4"
        :width="20"
        :height="1"
        label="Auto-update"
        :checked="autoUpdate"
        @change="handleAutoUpdateChange"
    />

    <Text :x="1" :y="6" value="▶ More Options" />

    <Switch :x="1" :y="7" :width="20" :height="1" label="Wi-Fi" :checked="wifiEnabled" @change="handleWifiChange" />
    <Switch :x="31" :y="7" :width="20" :height="1" label="Bluetooth" :checked="btEnabled" @change="handleBtChange" />
    <Switch
        :x="1"
        :y="8"
        :width="20"
        :height="1"
        label="Location"
        :checked="locationEnabled"
        @change="handleLocationChange"
    />
    <Switch
        :x="31"
        :y="8"
        :width="20"
        :height="1"
        label="Dark Mode"
        :checked="darkMode"
        @change="handleDarkModeChange"
    />

    <Text :x="1" :y="10" value="▶ Disabled State" />

    <Switch :x="1" :y="11" :width="20" :height="1" label="Disabled Off" :disabled="true" />
    <Switch :x="31" :y="11" :width="20" :height="1" label="Disabled On" :disabled="true" :checked="true" />

    <Text :x="1" :y="13" value="▶ Status Summary" />

    <Box
        :x="1"
        :y="14"
        width="95%"
        :height="5"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :value="statusLine1" />
        <Text :value="statusLine2" />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const autoUpdate = ref(true)
const wifiEnabled = ref(false)
const btEnabled = ref(false)
const locationEnabled = ref(false)
const darkMode = ref(false)

function handleSwitchChange(data: TuiSwitchChangeEvent) {
    void data
}
function handleAutoUpdateChange(data: TuiSwitchChangeEvent) {
    autoUpdate.value = data.checked
}
function handleWifiChange(data: TuiSwitchChangeEvent) {
    wifiEnabled.value = data.checked
}
function handleBtChange(data: TuiSwitchChangeEvent) {
    btEnabled.value = data.checked
}
function handleLocationChange(data: TuiSwitchChangeEvent) {
    locationEnabled.value = data.checked
}
function handleDarkModeChange(data: TuiSwitchChangeEvent) {
    darkMode.value = data.checked
}

const statusLine1 = computed(() => {
    const wifi = wifiEnabled.value ? 'ON ' : 'OFF'
    const bt = btEnabled.value ? 'ON ' : 'OFF'
    const loc = locationEnabled.value ? 'ON ' : 'OFF'
    return `Wi-Fi: ${wifi} | Bluetooth: ${bt} | Location: ${loc}`
})
const statusLine2 = computed(() => {
    const auto = autoUpdate.value ? 'ON ' : 'OFF'
    const dark = darkMode.value ? 'ON ' : 'OFF'
    return `Auto-update: ${auto} | Dark Mode: ${dark}`
})
</script>
