<template>
    <!-- Title bar -->
    <Box :rectX="0" :rectY="0" :rectWidth="60" :rectHeight="1" :colorFg="0xcb_a6_f5_ff" :colorBg="0x31_32_44_ff">
        <Text :rectX="0" :rectY="0" :rectWidth="60" :rectHeight="1" :colorFg="0xcb_a6_f5_ff" :text="title" />
    </Box>

    <!-- Solid border, English -->
    <Box
        :draggable="true"
        @dragstart="handleDragstart"
        @dragend="handleDragend"
        :rectX="1"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="2" :rectY="3" :rectWidth="26" :rectHeight="1" :colorFg="0xc5_cf_e0_ff" :text="text1" />
    </Box>

    <!-- Rounded border, Chinese -->
    <Box
        @mousedown="handleMousedown"
        @mouseup="handleMouseup"
        :rectX="31"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="32" :rectY="3" :rectWidth="26" :rectHeight="1" :colorFg="0xc5_cf_e0_ff" :text="text2" />
    </Box>

    <!-- Double border, mixed -->
    <Box
        @click="handleClick"
        :rectX="1"
        :rectY="6"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xfa_b3_87_ff"
        :borderStyle="2"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="2" :rectY="7" :rectWidth="26" :rectHeight="1" :colorFg="0xc5_cf_e0_ff" :text="text3" />
    </Box>

    <!-- Bold border -->
    <Box
        @contextmenu="handleContextmenu"
        :rectX="31"
        :rectY="6"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="4"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="32" :rectY="7" :rectWidth="26" :rectHeight="1" :colorFg="0xc5_cf_e0_ff" :text="text4" />
    </Box>

    <!-- Partial: top + bottom only -->
    <Box
        :rectX="1"
        :rectY="10"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0xf9_e2_af_ff"
        :colorBg="0x18_18_25_ff"
        :borderColor="0xf9_e2_af_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="false"
        :borderBottom="true"
        :borderLeft="false"
    >
        <Text
            :rectX="1"
            :rectY="11"
            :rectWidth="28"
            :rectHeight="1"
            :colorFg="0xf9_e2_af_ff"
            text="Top+Bottom 仅上下"
        />
    </Box>

    <!-- Partial: left only -->
    <Box
        :rectX="31"
        :rectY="10"
        :rectWidth="28"
        :rectHeight="3"
        :colorFg="0x94_e2_d5_ff"
        :colorBg="0x18_18_25_ff"
        :borderColor="0x94_e2_d5_ff"
        :borderStyle="1"
        :borderTop="false"
        :borderRight="false"
        :borderBottom="false"
        :borderLeft="true"
    >
        <Text
            :rectX="32"
            :rectY="11"
            :rectWidth="27"
            :rectHeight="1"
            :colorFg="0x94_e2_d5_ff"
            text="Left-only sidebar 侧栏"
        />
    </Box>

    <!-- No border, highlighted row -->
    <Box :rectX="1" :rectY="14" :rectWidth="58" :rectHeight="1" :colorBg="0x89_b4_fa_ff">
        <Text
            :rectX="1"
            :rectY="14"
            :rectWidth="58"
            :rectHeight="1"
            :colorFg="0x1e_1e_2e_ff"
            text="无边框高亮行 — Borderless highlight row"
        />
    </Box>

    <!-- No border, subtle row -->
    <Box :rectX="1" :rectY="15" :rectWidth="58" :rectHeight="1" :colorBg="0x1e_1e_2e_ff">
        <Text
            :rectX="1"
            :rectY="15"
            :rectWidth="58"
            :rectHeight="1"
            :colorFg="0xa6_ad_c8_ff"
            text="普通行：Normal row without border 无边框普通行"
        />
    </Box>

    <!-- Dashed border -->
    <Box
        :rectX="1"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xb4_be_fe_ff"
        :borderStyle="5"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="2" :rectY="18" :rectWidth="18" :rectHeight="1" :colorFg="0xb4_be_fe_ff" text="虚线 Dashed" />
    </Box>

    <!-- OutsetBold border -->
    <Box
        :rectX="22"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf5_c2_e7_ff"
        :borderStyle="7"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="23" :rectY="18" :rectWidth="18" :rectHeight="1" :colorFg="0xf5_c2_e7_ff" text="浮雕 Outset" />
    </Box>

    <!-- OutsetDouble border -->
    <Box
        :rectX="43"
        :rectY="17"
        :rectWidth="20"
        :rectHeight="3"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x94_e2_d5_ff"
        :borderStyle="8"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
    >
        <Text :rectX="44" :rectY="18" :rectWidth="18" :rectHeight="1" :colorFg="0x94_e2_d5_ff" text="双浮雕 Outset²" />
    </Box>

    <!-- Footer -->
    <Box :rectX="0" :rectY="21" :rectWidth="60" :rectHeight="1" :colorBg="0x11_11_1b_ff">
        <Text
            :rectX="0"
            :rectY="21"
            :rectWidth="60"
            :rectHeight="1"
            :colorFg="0x6c_70_86_ff"
            text="按 Q 退出 | Press Q to quit"
        />
    </Box>

    <!-- Z-index label -->
    <Box :rectX="1" :rectY="23" :rectWidth="20" :rectHeight="1" :colorBg="0x1e_1e_2e_ff">
        <Text
            :rectX="1"
            :rectY="23"
            :rectWidth="20"
            :rectHeight="1"
            :colorFg="0xf9_e2_af_ff"
            text="Z-Index 层叠演示 →"
        />
    </Box>

    <!-- Z-Index: green (top, zIndex=2) -->
    <Box
        v-if="show"
        :rectX="35"
        :rectY="23"
        :rectWidth="24"
        :rectHeight="3"
        :colorBg="0xa6_e3_a1_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
    >
        <Text :rectX="36" :rectY="24" :rectWidth="22" :rectHeight="1" :colorFg="0x1e_1e_2e_ff" text="zIndex=2 最上层" />
    </Box>

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Box
        draggable
        :rectX="25"
        :rectY="24"
        :rectWidth="24"
        :rectHeight="3"
        :colorBg="0x89_b4_fa_55"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
    >
        <Text :rectX="26" :rectY="25" :rectWidth="22" :rectHeight="1" :colorFg="0x1e_1e_2e_ff" text="zIndex=1 中间层" />
    </Box>

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Box
        :rectX="15"
        :rectY="25"
        :rectWidth="24"
        :rectHeight="3"
        :colorBg="0xf3_8b_a8_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="0"
    >
        <Text :rectX="16" :rectY="26" :rectWidth="22" :rectHeight="1" :colorFg="0x1e_1e_2e_ff" text="zIndex=0 最底层" />
    </Box>

    <!-- FPS watcher -->
    <FrameRateWatcher />

    <!-- Input widgets -->
    <Input
        :rectX="1"
        :rectY="28"
        :rectWidth="28"
        :rectHeight="3"
        placeholder="Type something..."
        v-model="inputValue"
        @input="handleInput"
        @submit="handleSubmit"
    />
    <Input :rectX="31" :rectY="28" :rectWidth="28" :rectHeight="3" placeholder="Another input..." />

    <!-- Button widgets -->
    <Button :rectX="1" :rectY="32" :rectWidth="18" :rectHeight="3" text="Click Me" @click="handleButtonClick" />
    <Button :rectX="21" :rectY="32" :rectWidth="18" :rectHeight="3" :disabled="buttonDisabled" :text="buttonLabel" />
    <Button :rectX="41" :rectY="32" :rectWidth="18" :rectHeight="3" text="Toggle Other" @click="handleToggleClick" />

    <!-- Checkbox widgets -->
    <Checkbox
        :rectX="1"
        :rectY="36"
        :rectWidth="28"
        :rectHeight="1"
        label="Enable notifications"
        @change="handleCheckChange"
    />
    <Checkbox
        :rectX="1"
        :rectY="37"
        :rectWidth="28"
        :rectHeight="1"
        label="Dark mode"
        :checked="darkMode"
        @change="handleDarkModeChange"
    />
    <Checkbox
        :rectX="1"
        :rectY="38"
        :rectWidth="28"
        :rectHeight="1"
        label="Disabled option"
        :disabled="true"
        :checked="true"
    />
    <Checkbox :rectX="31" :rectY="36" :rectWidth="28" :rectHeight="1" label="Auto-save" @change="handleCheckChange" />
    <Checkbox
        :rectX="31"
        :rectY="37"
        :rectWidth="28"
        :rectHeight="1"
        label="Show line numbers"
        @change="handleCheckChange"
    />

    <!-- RadioGroup widgets -->
    <RadioGroup
        :rectX="1"
        :rectY="40"
        :rectWidth="28"
        :rectHeight="3"
        :options="['Red', 'Green', 'Blue']"
        :value="selectedColor"
        @change="handleColorChange"
    />
    <RadioGroup
        :rectX="31"
        :rectY="40"
        :rectWidth="28"
        :rectHeight="3"
        :options="['Small', 'Medium', 'Large']"
        :value="selectedSize"
        @change="handleSizeChange"
    />

    <!-- TabBar widget -->
    <TabBar
        :rectX="1"
        :rectY="44"
        :rectWidth="58"
        :rectHeight="1"
        :tabs="['Files', 'Git', 'Debug']"
        :value="activeTab"
        @change="handleTabChange"
    />
    <Box :rectX="1" :rectY="45" :rectWidth="58" :rectHeight="1" :colorBg="0x18_18_25_ff">
        <Text :rectX="1" :rectY="45" :rectWidth="58" :rectHeight="1" :colorFg="0xa6_ad_c8_ff" :text="activeTabLabel" />
    </Box>

    <!-- Switch widgets -->
    <Switch :rectX="1" :rectY="47" :rectWidth="20" :rectHeight="1" label="Notifications" @change="handleSwitchChange" />
    <Switch
        :rectX="31"
        :rectY="47"
        :rectWidth="20"
        :rectHeight="1"
        label="Auto-update"
        :checked="autoUpdate"
        @change="handleAutoUpdateChange"
    />
    <Switch
        :rectX="1"
        :rectY="48"
        :rectWidth="20"
        :rectHeight="1"
        label="Wi-Fi"
        :checked="wifiEnabled"
        @change="handleWifiChange"
    />
    <Switch :rectX="31" :rectY="48" :rectWidth="20" :rectHeight="1" label="Disabled" :disabled="true" :checked="true" />
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

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
setTimeout(() => {
    inputValue.value = 'Hello, world!'
}, 1000)
function handleInput(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}
function handleSubmit(data) {
    // Intentionally empty — console.log would corrupt the TUI display
    void data
}

const buttonLabel = ref('Click Me')
function handleButtonClick() {
    buttonLabel.value = 'Clicked!'
}

const buttonDisabled = ref(false)
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
