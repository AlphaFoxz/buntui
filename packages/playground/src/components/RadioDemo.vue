<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="▶ Colors" />
    <RadioGroup
        :x="1"
        :y="4"
        :width="28"
        :height="3"
        :options="['Red', 'Green', 'Blue', 'Yellow']"
        :value="selectedColor"
        @change="handleColorChange"
    />
    <Box
        :x="1"
        :y="8"
        :width="28"
        :height="1"
        :colorBg="selectedColorBg"
    />

    <Text :x="31" :y="3" :colorFg="'rgba(166,227,161,1)'" value="▶ Sizes" />
    <RadioGroup
        :x="31"
        :y="4"
        :width="28"
        :height="3"
        :options="['Small', 'Medium', 'Large', 'X-Large']"
        :value="selectedSize"
        @change="handleSizeChange"
    />
    <Text :x="31" :y="8" :colorFg="'rgba(205,214,244,1)'" :value="`Selected: ${selectedLabel}`" />

    <Text :x="1" :y="10" :colorFg="'rgba(250,179,135,1)'" value="▶ Disabled Group" />
    <RadioGroup
        :x="1"
        :y="11"
        :width="28"
        :height="3"
        :options="['Option A', 'Option B', 'Option C']"
        :value="1"
        :disabled="true"
    />

    <Text :x="31" :y="10" :colorFg="'rgba(203,166,245,1)'" value="▶ Framework" />
    <RadioGroup
        :x="31"
        :y="11"
        :width="28"
        :height="4"
        :options="['Vue', 'React', 'Svelte', 'Solid']"
        :value="selectedFramework"
        @change="handleFrameworkChange"
    />

    <Text :x="1" :y="16" :colorFg="'rgba(148,226,213,1)'" value="▶ Summary" />
    <Box
        :x="1"
        :y="17"
        width="95%"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(148,226,213,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :colorFg="'rgba(205,214,244,1)'" :value="`Color: ${colorName} | Size: ${sizeName} | Framework: ${frameworkName}`" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="Use arrow keys to navigate, Enter/Space to select. Mouse click also works." />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const selectedColor = ref(-1)
const colorName = computed(() => ['Red', 'Green', 'Blue', 'Yellow'][selectedColor.value] ?? 'None')
const selectedColorBg = computed(() => {
    const colors: Record<number, string> = {
        0: 'rgba(243,139,168,1)',
        1: 'rgba(166,227,161,1)',
        2: 'rgba(137,180,250,1)',
        3: 'rgba(249,226,175,1)',
    }
    return colors[selectedColor.value] ?? 'rgba(49,50,68,1)'
})
function handleColorChange(data: TuiRadioGroupChangeEvent) {
    selectedColor.value = data.value
}

const selectedSize = ref(1)
const sizeName = computed(() => ['Small', 'Medium', 'Large', 'X-Large'][selectedSize.value] ?? 'None')
const selectedLabel = computed(() => sizeName.value)
function handleSizeChange(data: TuiRadioGroupChangeEvent) {
    selectedSize.value = data.value
}

const selectedFramework = ref(-1)
const frameworkName = computed(() => ['Vue', 'React', 'Svelte', 'Solid'][selectedFramework.value] ?? 'None')
function handleFrameworkChange(data: TuiRadioGroupChangeEvent) {
    selectedFramework.value = data.value
}
</script>
