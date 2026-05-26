<template>
    <Text :x="1" :y="3" value="▶ Plain Selects" />
    <Select
        :x="1"
        :y="4"
        :width="22"
        :height="1"
        :options="languageOptions"
        :value="selectedLanguage"
        placeholder="Choose..."
        @change="handleLanguageChange"
    />
    <Select
        :x="26"
        :y="4"
        :width="22"
        :height="1"
        :options="themeOptions"
        :value="selectedTheme"
        placeholder="Pick a theme"
        @change="handleThemeChange"
    />
    <Select
        :x="51"
        :y="4"
        :width="22"
        :height="1"
        :options="languageOptions"
        :value="'ts'"
        :disabled="true"
    />

    <Text :x="1" :y="7" value="▶ With Label & Border" />
    <Select
        :x="1"
        :y="8"
        :width="22"
        :height="3"
        label="Language"
        borderStyle="rounded"
        :options="languageOptions"
        :value="selectedLanguage"
        @change="handleLanguageChange"
    />
    <Select
        :x="26"
        :y="8"
        :width="22"
        :height="3"
        label="Theme"
        borderStyle="rounded"
        :options="themeOptions"
        :value="selectedTheme"
        placeholder="Pick a theme"
        @change="handleThemeChange"
    />
    <Select
        :x="51"
        :y="8"
        :width="22"
        :height="3"
        label="Font Size"
        borderStyle="rounded"
        :options="fontSizeOptions"
        :value="selectedFontSize"
        @change="handleFontSizeChange"
    />

    <Text :x="1" :y="13" value="▶ Summary" />
    <Box
        :x="1"
        :y="14"
        width="95%"
        :height="3"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :value="`Language: ${languageLabel} | Theme: ${themeLabel} | Font: ${fontSizeLabel}`" />
        <Text value="Click or press Enter/Space to open. Arrow keys to navigate. Escape to close. Insert to cycle cursor." />
    </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const languageOptions = [
    {value: 'ts', label: 'TypeScript'},
    {value: 'js', label: 'JavaScript'},
    {value: 'py', label: 'Python'},
    {value: 'rs', label: 'Rust'},
    {value: 'go', label: 'Go'},
]
const selectedLanguage = ref('ts')
const languageLabel = computed(() => languageOptions.find(o => o.value === selectedLanguage.value)?.label ?? 'None')
function handleLanguageChange(data: TuiSelectChangeEvent) {
    selectedLanguage.value = data.value
}

const themeOptions = [
    {value: 'dark', label: 'Dark'},
    {value: 'light', label: 'Light'},
    {value: 'nord', label: 'Nord'},
    {value: 'solarized', label: 'Solarized'},
]
const selectedTheme = ref('')
const themeLabel = computed(() => themeOptions.find(o => o.value === selectedTheme.value)?.label ?? 'None')
function handleThemeChange(data: TuiSelectChangeEvent) {
    selectedTheme.value = data.value
}

const fontSizeOptions = [
    {value: '12', label: '12px'},
    {value: '14', label: '14px'},
    {value: '16', label: '16px'},
    {value: '18', label: '18px'},
    {value: '20', label: '20px'},
    {value: '24', label: '24px'},
]
const selectedFontSize = ref('14')
const fontSizeLabel = computed(() => fontSizeOptions.find(o => o.value === selectedFontSize.value)?.label ?? 'None')
function handleFontSizeChange(data: TuiSelectChangeEvent) {
    selectedFontSize.value = data.value
}
</script>
