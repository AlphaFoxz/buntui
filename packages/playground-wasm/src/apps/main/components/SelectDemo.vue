<template>
    <Text :x="2" :y="1" value="Select" styleModifier="bold" />
    <Text :x="2" :y="2" value="Dropdown select with scrollable options list. Opens on focus + Enter/Space." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="options         { value: string, label: string }[]  Dropdown options" />
    <Text :x="2" :y="6" value="value           string          Selected value" />
    <Text :x="2" :y="7" value="placeholder     string          Placeholder text" />
    <Text :x="2" :y="8" value="label           string          Label in top border" />
    <Text :x="2" :y="9" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="10" value="borderStyle     TuiBorderStyleName" />

    <Text :x="2" :y="12" value="▸ Plain Selects" styleModifier="bold" />
    <Select
        :x="2"
        :y="13"
        width="22%"
        :options="languageOptions"
        :value="selectedLanguage"
        placeholder="Choose..."
        @change="handleLanguage"
    />
    <Select
        x="26%"
        :y="13"
        width="22%"
        :options="themeOptions"
        :value="selectedTheme"
        placeholder="Pick theme..."
        @change="handleTheme"
    />
    <Select x="52%" :y="13" width="22%" :options="languageOptions" value="ts" :disabled="true" />

    <Text :x="2" :y="16" value="▸ With Label & Border" styleModifier="bold" />
    <Select
        :x="2"
        :y="17"
        width="30%"
        label="Language"
        borderStyle="rounded"
        :options="languageOptions"
        :value="selectedLanguage"
        @change="handleLanguage"
    />
    <Select
        x="34%"
        :y="17"
        width="30%"
        label="Theme"
        borderStyle="rounded"
        :options="themeOptions"
        :value="selectedTheme"
        placeholder="Pick theme..."
        @change="handleTheme"
    />

    <Text :x="2" :y="21" value="▸ Long List (scrollable dropdown)" styleModifier="bold" />
    <Select
        :x="2"
        :y="22"
        width="30%"
        label="Country"
        borderStyle="rounded"
        :options="countryOptions"
        :value="selectedCountry"
        @change="handleCountry"
    />

    <Text :x="2" :y="26" value="▸ Summary" styleModifier="bold" />
    <Box :x="2" :y="27" width="95%" :height="2" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text :value="`Language: ${languageLabel} | Theme: ${themeLabel} | Country: ${countryLabel}`" />
    </Box>

    <Text :x="2" :y="30" value="▸ Events: change ({ value, label }), open, close" styleModifier="bold" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const languageOptions = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rs', label: 'Rust' },
    { value: 'go', label: 'Go' },
]
const selectedLanguage = ref('ts')
const languageLabel = computed(() => languageOptions.find((o) => o.value === selectedLanguage.value)?.label ?? 'None')
function handleLanguage(data: TuiSelectChangeEvent) {
    selectedLanguage.value = data.value
}

const themeOptions = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'nord', label: 'Nord' },
]
const selectedTheme = ref('')
const themeLabel = computed(() => themeOptions.find((o) => o.value === selectedTheme.value)?.label ?? 'None')
function handleTheme(data: TuiSelectChangeEvent) {
    selectedTheme.value = data.value
}

const countryOptions = [
    { value: 'cn', label: 'China' },
    { value: 'us', label: 'United States' },
    { value: 'jp', label: 'Japan' },
    { value: 'de', label: 'Germany' },
    { value: 'gb', label: 'United Kingdom' },
    { value: 'fr', label: 'France' },
    { value: 'in', label: 'India' },
    { value: 'br', label: 'Brazil' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'kr', label: 'South Korea' },
    { value: 'it', label: 'Italy' },
    { value: 'es', label: 'Spain' },
    { value: 'mx', label: 'Mexico' },
    { value: 'nl', label: 'Netherlands' },
    { value: 'se', label: 'Sweden' },
    { value: 'ch', label: 'Switzerland' },
    { value: 'no', label: 'Norway' },
    { value: 'sg', label: 'Singapore' },
    { value: 'nz', label: 'New Zealand' },
]
const selectedCountry = ref('cn')
const countryLabel = computed(() => countryOptions.find((o) => o.value === selectedCountry.value)?.label ?? 'None')
function handleCountry(data: TuiSelectChangeEvent) {
    selectedCountry.value = data.value
}
</script>
