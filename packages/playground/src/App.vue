<template>
    <!-- Title bar -->
    <Text
        :rectX="0"
        :rectY="0"
        :rectWidth="60"
        :rectHeight="1"
        :colorFg="0xcb_a6_f5_ff"
        :colorBg="0x31_32_44_ff"
        :text="title"
    />

    <!-- Solid border, English -->
    <Text
        :rectX="1"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="5"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="Solid Border (English)"
    />

    <!-- Rounded border, Chinese -->
    <Text
        :rectX="31"
        :rectY="2"
        :rectWidth="28"
        :rectHeight="5"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="圆角边框（中文）"
    />

    <!-- Double border, mixed -->
    <Text
        :rectX="1"
        :rectY="8"
        :rectWidth="28"
        :rectHeight="5"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xfa_b3_87_ff"
        :borderStyle="2"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="Double 双线边框 Mixed"
    />

    <!-- Bold border -->
    <Text
        :rectX="31"
        :rectY="8"
        :rectWidth="28"
        :rectHeight="5"
        :colorFg="0xc5_cf_e0_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="4"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="Bold 状态面板"
    />

    <!-- Partial: top + bottom only -->
    <Text
        :rectX="1"
        :rectY="14"
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
        text="Top+Bottom only / 仅上下"
    />

    <!-- Partial: left only -->
    <Text
        :rectX="31"
        :rectY="14"
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
        text="Left-only sidebar 侧栏样式"
    />

    <!-- No border, highlighted row -->
    <Text
        :rectX="1"
        :rectY="18"
        :rectWidth="58"
        :rectHeight="1"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0x89_b4_fa_ff"
        text="无边框高亮行 — Borderless highlight row"
    />

    <!-- No border, subtle row -->
    <Text
        :rectX="1"
        :rectY="19"
        :rectWidth="58"
        :rectHeight="1"
        :colorFg="0xa6_ad_c8_ff"
        :colorBg="0x1e_1e_2e_ff"
        text="普通行：Normal row without border 无边框普通行"
    />

    <!-- Dashed border -->
    <Text
        :rectX="1"
        :rectY="21"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0xb4_be_fe_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xb4_be_fe_ff"
        :borderStyle="5"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="虚线 Dashed"
    />

    <!-- OutsetBold border -->
    <Text
        :rectX="22"
        :rectY="21"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0xf5_c2_e7_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0xf5_c2_e7_ff"
        :borderStyle="7"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="浮雕 Outset"
    />

    <!-- OutsetDouble border -->
    <Text
        :rectX="43"
        :rectY="21"
        :rectWidth="20"
        :rectHeight="3"
        :colorFg="0x94_e2_d5_ff"
        :colorBg="0x1e_1e_2e_ff"
        :borderColor="0x94_e2_d5_ff"
        :borderStyle="8"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        text="双浮雕 Outset²"
    />

    <!-- Z-Index: green (top, zIndex=2) -->
    <Text
        v-if="show"
        :rectX="35"
        :rectY="29"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0xa6_e3_a1_ff"
        :borderColor="0xa6_e3_a1_ff"
        :borderStyle="3"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="2"
        text="zIndex=2 最上层"
    />

    <!-- Z-Index: blue (middle, zIndex=1) -->
    <Text
        :rectX="25"
        :rectY="31"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0x89_b4_fa_ff"
        :borderColor="0x89_b4_fa_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="1"
        text="zIndex=1 中间层"
    />

    <!-- Z-Index: red (bottom, zIndex=0) -->
    <Text
        :rectX="15"
        :rectY="33"
        :rectWidth="24"
        :rectHeight="5"
        :colorFg="0x1e_1e_2e_ff"
        :colorBg="0xf3_8b_a8_ff"
        :borderColor="0xf3_8b_a8_ff"
        :borderStyle="1"
        :borderTop="true"
        :borderRight="true"
        :borderBottom="true"
        :borderLeft="true"
        :styleZIndex="0"
        text="zIndex=0 最底层"
    />

    <!-- Z-index label -->
    <Text
        :rectX="1"
        :rectY="29"
        :rectWidth="20"
        :rectHeight="1"
        :colorFg="0xf9_e2_af_ff"
        :colorBg="0x1e_1e_2e_ff"
        text="Z-Index 层叠演示 →"
    />

    <!-- Footer -->
    <Text
        :rectX="0"
        :rectY="25"
        :rectWidth="60"
        :rectHeight="1"
        :colorFg="0x6c_70_86_ff"
        :colorBg="0x11_11_1b_ff"
        text="按 Q 退出 | Press Q to quit | 边框样式: Solid·Rounded·Double·Bold·Dashed·Outset"
    />

    <!-- FPS watcher -->
    <FrameRateWatcher />
</template>

<script setup>
import { ref, computed } from '@vue/reactivity'

const currentTimeStr = ref(Date.now().toString())
const show = ref(true)

setInterval(() => {
    currentTimeStr.value = Date.now().toString()
    show.value = !show.value
}, 1000)
const title = computed(() => {
    return `buntui Demo ${currentTimeStr.value} s`
})
</script>
