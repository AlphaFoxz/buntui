<template>
  <Text value="Select" styleModifier="bold" />
  <Text
    value="Dropdown select with scrollable options list. Opens on focus + Enter/Space."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text
    value="options         { value: string, label: string }[]  Dropdown options"
  />
  <Text value="value           string          Selected value" />
  <Text value="placeholder     string          Placeholder text" />
  <Text value="label           string          Label in top border" />
  <Text value="disabled        boolean          Disabled state" />
  <Text value="borderStyle     TuiBorderStyleName" />

  <Text value="▸ Plain Selects" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Select
      :flexGrow="1"
      :options="languageOptions"
      :value="selectedLanguage"
      placeholder="Choose..."
      @change="handleLanguage"
    />
    <Select
      :flexGrow="1"
      :options="themeOptions"
      :value="selectedTheme"
      placeholder="Pick theme..."
      @change="handleTheme"
    />
    <Select
      :flexGrow="1"
      :options="languageOptions"
      value="ts"
      :disabled="true"
    />
  </Box>

  <Text value="▸ With Label & Border" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Select
      :flexGrow="1"
      label="Language"
      borderStyle="rounded"
      :options="languageOptions"
      :value="selectedLanguage"
      @change="handleLanguage"
    />
    <Select
      :flexGrow="1"
      label="Theme"
      borderStyle="rounded"
      :options="themeOptions"
      :value="selectedTheme"
      placeholder="Pick theme..."
      @change="handleTheme"
    />
  </Box>

  <Text value="▸ Long List (scrollable dropdown)" styleModifier="bold" />
  <Select
    width="98%"
    label="Country"
    borderStyle="rounded"
    :options="countryOptions"
    :value="selectedCountry"
    @change="handleCountry"
  />

  <Text value="▸ Border Styles" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Select
      :flexGrow="1"
      label="Solid"
      borderStyle="solid"
      :options="languageOptions"
      v-model="borderDemoValue"
    />
    <Select
      :flexGrow="1"
      label="Dashed"
      borderStyle="dashed"
      :options="languageOptions"
      v-model="borderDemoValue"
    />
    <Select
      :flexGrow="1"
      label="Double"
      borderStyle="double"
      :options="languageOptions"
      v-model="borderDemoValue"
    />
  </Box>

  <Text value="▸ Summary" styleModifier="bold" />
  <Box width="98%" borderStyle="rounded" direction="vertical" :gap="1">
    <Text
      :value="`Language: ${languageLabel} | Theme: ${themeLabel} | Country: ${countryLabel}`"
    />
  </Box>

  <Text
    value="▸ Events: change ({ value, label }), open, close"
    styleModifier="bold"
  />
  <Text :value="eventLog" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const languageOptions = [
  { value: 'ts', label: 'TypeScript' },
  { value: 'js', label: 'JavaScript' },
  { value: 'py', label: 'Python' },
  { value: 'rs', label: 'Rust' },
  { value: 'go', label: 'Go' },
];
const selectedLanguage = ref('ts');
const languageLabel = computed(
  () =>
    languageOptions.find((o) => o.value === selectedLanguage.value)?.label ??
    'None',
);
function handleLanguage(data: TuiSelectChangeEvent) {
  selectedLanguage.value = data.value;
  logEvent(`language → ${data.label}`);
}

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'nord', label: 'Nord' },
];
const selectedTheme = ref('');
const themeLabel = computed(
  () =>
    themeOptions.find((o) => o.value === selectedTheme.value)?.label ?? 'None',
);
function handleTheme(data: TuiSelectChangeEvent) {
  selectedTheme.value = data.value;
  logEvent(`theme → ${data.label}`);
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
];
const selectedCountry = ref('cn');
const countryLabel = computed(
  () =>
    countryOptions.find((o) => o.value === selectedCountry.value)?.label ??
    'None',
);
function handleCountry(data: TuiSelectChangeEvent) {
  selectedCountry.value = data.value;
}

const borderDemoValue = ref('ts');

const eventLog = ref('(change a select to see events)');
function logEvent(message: string) {
  const now = new Date();
  const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  eventLog.value = `[${ts}] ${message}`;
}
</script>
