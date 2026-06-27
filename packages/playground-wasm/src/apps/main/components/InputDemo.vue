<template>
  <Text value="Input" styleModifier="bold" />
  <Text
    value="Single-line text input. Supports text/password/number types, labels, placeholders, and selection."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="value           string          Current value (v-model)" />
  <Text value="type            'text'|'password'|'number'  Input type" />
  <Text value="placeholder     string         Placeholder text" />
  <Text value="label           string         Label shown in top border" />
  <Text
    value="maxLength       number         Max character count (0=unlimited)"
  />
  <Text value="readonly        boolean        Read-only mode" />
  <Text value="disabled        boolean        Disabled state" />
  <Text value="min / max / step number       Range for type='number'" />
  <Text value="borderStyle     TuiBorderStyleName" />

  <Text value="▸ Basic Inputs" styleModifier="bold" />
  <Input
    width="98%"
    :height="3"
    label="Username"
    placeholder="Type something..."
    v-model="inputValue"
    @submit="handleSubmit"
  />
  <Input
    width="98%"
    :height="3"
    label="Echo"
    placeholder="Readonly mirror"
    readonly
    :value="inputValue"
  />

  <Text value="▸ Password & maxLength" styleModifier="bold" />
  <Input
    width="98%"
    :height="3"
    type="password"
    label="Password"
    placeholder="Enter password..."
    v-model="passwordValue"
  />
  <Input
    width="98%"
    :height="3"
    label="Max 10 chars"
    placeholder="Limited..."
    :maxLength="10"
    v-model="limitedValue"
  />

  <Text value="▸ Number Type" styleModifier="bold" />
  <Input
    width="98%"
    :height="3"
    type="number"
    label="Age"
    :min="0"
    :max="120"
    :step="1"
    v-model="numberValue"
  />

  <Text value="▸ Disabled" styleModifier="bold" />
  <Input
    width="98%"
    :height="3"
    label="Disabled"
    :disabled="true"
    value="Can't type here"
  />

  <Text value="▸ v-model Feedback" styleModifier="bold" />
  <Box
    width="98%"
    :height="5"
    borderStyle="rounded"
    direction="vertical"
    :gap="1"
  >
    <Text :value="`Username: [${inputValue}] (${inputValue.length} chars)`" />
    <Text
      :value="`Password: ${'*'.repeat(passwordValue.length)} (${passwordValue.length} chars)`"
    />
    <Text
      :value="`Limited: [${limitedValue}] (${limitedValue.length}/10 chars)`"
    />
    <Text :value="`Number: ${numberValue}`" />
  </Box>

  <Text
    value="▸ Events: input, submit, change (number), copy, cut, paste, undo, redo"
    styleModifier="bold"
  />
  <Text :value="eventLog" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const inputValue = ref('');
const passwordValue = ref('');
const limitedValue = ref('');
const numberValue = ref('25');
const lastSubmit = ref('');

const eventLog = computed(() => {
  if (lastSubmit.value.length === 0) return 'Press Enter to submit';
  return `Last submit: "${lastSubmit.value}"`;
});

function handleSubmit(data: TuiSubmitEvent) {
  lastSubmit.value = data.value;
}
</script>
