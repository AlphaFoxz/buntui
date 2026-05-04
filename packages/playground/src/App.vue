<template>
    <Tabs :options="['test1', 'test2', 'test3']">
        <Tab value="test1"></Tab>
        <Tab value="test2"></Tab>
        <Tab value="test3"></Tab>
    </Tabs>

    <!-- Title bar -->
    <Box :x="0" :y="0" :width="60" :height="1" :colorFg="'rgba(203,166,245,1)'" :colorBg="'rgba(49,50,68,1)'">
        <Text :colorFg="'rgba(203,166,245,1)'" :value="title" />
    </Box>

    <!-- Solid border, English -->
    <Box
        :draggable="true"
        @dragstart="handleDragstart"
        @dragend="handleDragend"
        :x="1"
        :y="2"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text1" />
    </Box>

    <!-- Rounded border, Chinese -->
    <Box
        @mousedown="handleMousedown"
        @mouseup="handleMouseup"
        :x="31"
        :y="2"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,1)'"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text2" />
    </Box>

    <!-- Double border, mixed -->
    <Box
        @click="handleClick"
        :x="1"
        :y="6"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,1)'"
        :borderStyle="2"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text3" />
    </Box>

    <!-- Bold border -->
    <Box
        @contextmenu="handleContextmenu"
        :x="31"
        :y="6"
        :width="28"
        :height="3"
        :colorFg="'rgba(197,207,224,1)'"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(243,139,168,1)'"
        :borderStyle="4"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(197,207,224,1)'" :value="text4" />
    </Box>

    <!-- Partial: top + bottom only -->
    <Box
        :x="1"
        :y="10"
        :width="28"
        :height="3"
        :colorFg="'rgba(249,226,175,1)'"
        :colorBg="'rgba(24,24,37,1)'"
        :borderColor="'rgba(249,226,175,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="false"
        :borderBottom="true"
        :borderLeft="false"
    >
        <Text :colorFg="'rgba(249,226,175,1)'" value="李白斗酒诗百篇 长安市上酒家眠 天子呼来不上船 自称臣是酒中仙" />
    </Box>

    <!-- Partial: left only -->
    <Box
        :x="31"
        :y="10"
        :width="28"
        :height="3"
        :colorFg="'rgba(148,226,213,1)'"
        :colorBg="'rgba(24,24,37,1)'"
        :borderColor="'rgba(148,226,213,1)'"
        :borderStyle="1"
        :borderTop="false"
        :borderRight="false"
        :borderBottom="false"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(148,226,213,1)'" value="Left-only sidebar 侧栏" />
    </Box>

    <!-- No border, highlighted row -->
    <Box :x="1" :y="14" :width="58" :height="1" :colorBg="'rgba(137,180,250,1)'">
        <Text :colorFg="'rgba(30,30,46,1)'" value="无边框高亮行 — Borderless highlight row" />
    </Box>

    <!-- No border, subtle row -->
    <Box :x="1" :y="15" :width="58" :height="1" :colorBg="'rgba(30,30,46,1)'">
        <Text :colorFg="'rgba(166,173,200,1)'" value="普通行：Normal row without border 无边框普通行" />
    </Box>

    <!-- Dashed border -->
    <Box
        :x="1"
        :y="17"
        :width="20"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(180,190,254,1)'"
        :borderStyle="5"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(180,190,254,1)'" value="虚线 Dashed" />
    </Box>

    <!-- OutsetBold border -->
    <Box
        :x="22"
        :y="17"
        :width="20"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,1)'"
        :borderStyle="7"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(245,194,231,1)'" value="浮雕 Outset" />
    </Box>

    <!-- OutsetDouble border -->
    <Box
        :x="43"
        :y="17"
        :width="20"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(148,226,213,1)'"
        :borderStyle="8"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(148,226,213,1)'" value="双浮雕 Outset²" />
    </Box>

    <!-- Footer -->
    <Box :x="0" :y="21" :width="60" :height="1" :colorBg="'rgba(17,17,27,1)'">
        <Text :colorFg="'rgba(108,112,134,1)'" value="按 Q 退出 | Press Q to quit" />
    </Box>

    <!-- Z-index label -->
    <Box :x="1" :y="23" :width="20" :height="1" :colorBg="'rgba(30,30,46,1)'">
        <Text :colorFg="'rgba(249,226,175,1)'" value="Z-Index 层叠演示 →" />
    </Box>

    <!-- Z-Index: green (top, zIndex=2) -->
    <Box
        v-if="show"
        :x="35"
        :y="23"
        :width="24"
        :height="3"
        :colorBg="'rgba(166,227,161,1)'"
        :borderColor="'rgba(166,227,161,1)'"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=2 最上层" />
    </Box>

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :x="25"
        :y="24"
        :width="24"
        :height="3"
        :colorBg="'rgba(137,180,250,0.33)'"
        :borderColor="'rgba(137,180,250,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=1 中间层" />
    </Box>

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        :x="15"
        :y="25"
        :width="24"
        :height="3"
        :colorBg="'rgba(243,139,168,1)'"
        :borderColor="'rgba(243,139,168,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="0"
    >
        <Text :colorFg="'rgba(30,30,46,1)'" value="zIndex=0 最底层" />
    </Box>

    <!-- FPS watcher -->
    <FrameRateWatcher />

    <!-- Input widgets -->
    <Input
        :x="1"
        :y="28"
        :width="28"
        :height="3"
        placeholder="Type something..."
        v-model="inputValue"
        @input="handleInput"
        @submit="handleSubmit"
    />
    <Input
        :x="31"
        :y="28"
        :width="28"
        :height="3"
        label="UserName"
        placeholder="Another input..."
        readonly
        :value="inputValue"
    />

    <!-- Button widgets -->
    <Button :x="1" :y="32" :width="18" :height="3" value="Toggle disabled" @click="handleToggleClick" />
    <Button :x="21" :y="32" :width="18" :height="3" :disabled="buttonDisabled" :value="buttonLabel" />

    <!-- Checkbox widgets -->
    <Checkbox :x="1" :y="36" :width="28" :height="1" label="Enable notifications" @change="handleCheckChange" />
    <Checkbox
        :x="1"
        :y="37"
        :width="28"
        :height="1"
        label="Dark mode"
        :checked="darkMode"
        @change="handleDarkModeChange"
    />
    <Checkbox :x="1" :y="38" :width="28" :height="1" label="Disabled option" :disabled="true" :checked="true" />
    <Checkbox :x="31" :y="36" :width="28" :height="1" label="Auto-save" @change="handleCheckChange" />
    <Checkbox :x="31" :y="37" :width="28" :height="1" label="Show line numbers" @change="handleCheckChange" />

    <!-- RadioGroup widgets -->
    <RadioGroup
        :x="1"
        :y="40"
        :width="28"
        :height="3"
        :options="['Red', 'Green', 'Blue']"
        :value="selectedColor"
        @change="handleColorChange"
    />
    <RadioGroup
        :x="31"
        :y="40"
        :width="28"
        :height="3"
        :options="['Small', 'Medium', 'Large']"
        :value="selectedSize"
        @change="handleSizeChange"
    />

    <!-- TabBar widget -->
    <TabBar
        :x="1"
        :y="44"
        :width="58"
        :height="1"
        :tabs="['Files', 'Git', 'Debug']"
        :value="activeTab"
        @change="handleTabChange"
    />
    <Box :x="1" :y="45" :width="58" :height="1" :colorBg="'rgba(24,24,37,1)'">
        <Text :colorFg="'rgba(166,173,200,1)'" :value="activeTabLabel" />
    </Box>

    <!-- Switch widgets -->
    <Switch :x="1" :y="47" :width="20" :height="1" label="Notifications" @change="handleSwitchChange" />
    <Switch
        :x="31"
        :y="47"
        :width="20"
        :height="1"
        label="Auto-update"
        :checked="autoUpdate"
        @change="handleAutoUpdateChange"
    />
    <Switch :x="1" :y="48" :width="20" :height="1" label="Wi-Fi" :checked="wifiEnabled" @change="handleWifiChange" />
    <Switch :x="31" :y="48" :width="20" :height="1" label="Disabled" :disabled="true" :checked="true" />

    <!-- Layout demo: align=Start (left) -->
    <Box
        draggable
        :x="1"
        :y="50"
        :width="28"
        :height="5"
        :direction="1"
        :gap="1"
        :align="0"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Start" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <!-- Layout demo: align=Center -->
    <Box
        :x="31"
        :y="50"
        :width="28"
        :height="5"
        :direction="1"
        :gap="1"
        :align="1"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Center" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <!-- Layout demo: align=End (right) -->
    <Box
        :x="1"
        :y="56"
        :width="28"
        :height="5"
        :direction="1"
        :gap="1"
        :align="2"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=End" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <!-- Layout demo: align=Stretch (fill width) -->
    <Box
        :x="31"
        :y="56"
        :width="28"
        :height="5"
        :direction="1"
        :gap="1"
        :align="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(245,194,231,1)'"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="align=Stretch" />
        <Text :colorFg="'rgba(197,207,224,1)'" value="Row 1" :colorBg="'rgba(49,50,68,1)'" />
        <Text :colorFg="'rgba(166,227,161,1)'" value="Row Two" :colorBg="'rgba(49,50,68,1)'" />
    </Box>

    <Component></Component>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'
// import Component from './Component.vue'

const timeCount = ref(0)
const show = ref(true)

setInterval(() => {
    timeCount.value += 1
    show.value = !show.value
}, 1000)
const title = computed(() => {
    return `buntui Demo ${timeCount.value} s`
})

const text1 = ref('Drag Me!')
function handleDragstart() {
    text1.value = 'Dragging...'
}
function handleDragend() {
    text1.value = 'Dragged!'
}

const text2 = ref('Click Me!')
function handleMousedown() {
    text2.value = 'MouseDown!'
}
function handleMouseup() {
    text2.value = 'MouseUp!'
}

const text3 = ref('Click Me!')
function handleClick() {
    text3.value = 'Clicked!'
}

const text4 = ref('Right click me!')
function handleContextmenu() {
    text4.value = 'Right clicked!'
}

const inputValue = ref('')
function handleInput(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}
function handleSubmit(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}

const buttonLabel = computed(() => {
    return `Button: ${buttonDisabled.value ? 'Locked' : 'Unlocked'}`
})

const buttonDisabled = ref(true)
function handleToggleClick() {
    buttonDisabled.value = !buttonDisabled.value
}

const darkMode = ref(false)
function handleCheckChange(data) {
    void data
}
function handleDarkModeChange(data) {
    darkMode.value = data.checked
}

const selectedColor = ref(-1)
function handleColorChange(data) {
    selectedColor.value = data.value
}

const selectedSize = ref(1)
function handleSizeChange(data) {
    selectedSize.value = data.value
}

const activeTab = ref(0)
const activeTabLabel = computed(() => {
    const labels = ['Files', 'Git', 'Debug']
    return `Active tab: ${labels[activeTab.value] ?? 'None'}`
})
function handleTabChange(data) {
    activeTab.value = data.value
}

const autoUpdate = ref(true)
const wifiEnabled = ref(false)
function handleSwitchChange(data: { checked: boolean }) {
    void data
}
function handleAutoUpdateChange(data: { checked: boolean }) {
    autoUpdate.value = data.checked
}
function handleWifiChange(data: { checked: boolean }) {
    wifiEnabled.value = data.checked
}
</script>
