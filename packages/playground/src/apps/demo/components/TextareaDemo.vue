<template>
  <Text :x="1" :y="1" value="▶ Basic Editor" styleModifier="bold" />

  <Textarea
    :x="1"
    :y="2"
    width="45%"
    :height="10"
    label="Notes"
    placeholder="Type multiline text here..."
    v-model="textareaValue"
  />

  <Box
    x="50%"
    :y="2"
    width="48%"
    :height="10"
    borderStyle="rounded"
    direction="vertical"
    :gap="1"
  >
    <Text value="▶ Feedback" styleModifier="bold" />
    <Text :value="lineInfo" />
    <Text :value="charInfo" />
    <Text :value="wordInfo" />
    <Text :value="preview" />
    <Text value="" />
    <Text value="Shortcuts:" />
    <Text value="  Enter=newline  Tab=4spaces" />
    <Text value="  Ctrl+A/C/V/X/Z/Y  Insert=cursor" />
  </Box>

  <Text :x="1" :y="14" value="▶ Readonly & Disabled" styleModifier="bold" />

  <Textarea
    :x="1"
    :y="15"
    width="45%"
    :height="4"
    label="Readonly"
    readonly
    :value="readonlyText"
  />

  <Textarea
    x="50%"
    :y="15"
    width="48%"
    :height="4"
    label="Disabled"
    :disabled="true"
    value="Disabled textarea content"
  />

  <Text :x="1" :y="21" value="▶ maxLength & borderStyle" styleModifier="bold" />

  <Textarea
    :x="1"
    :y="22"
    width="45%"
    :height="5"
    label="Max 20 chars"
    :maxLength="20"
    placeholder="Limited to 20 chars..."
    v-model="limitedValue"
    borderStyle="double"
  />

  <Textarea
    x="50%"
    :y="22"
    width="48%"
    :height="5"
    label="Dashed"
    placeholder="Dashed border style..."
    v-model="dashedValue"
    borderStyle="dashed"
  />

  <Text
    :x="1"
    :y="29"
    value="▶ Events: input, copy, cut, paste, undo, redo"
    styleModifier="bold"
  />
  <Text
    :x="1"
    :y="31"
    value="▶ Methods: select(), setSelectionRange(start, end), getSelection(), scrollTo(n), scrollBy(n)"
    styleModifier="bold"
  />
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const textareaValue = ref('');
const limitedValue = ref('');
const dashedValue = ref('');
const readonlyText =
  'This content cannot be edited.\nLine 2 of readonly text.\nLine 3 here.';

const lineInfo = computed(
  () => `Lines: ${textareaValue.value.split('\n').length}`,
);
const charInfo = computed(() => `Chars: ${textareaValue.value.length}`);
const wordInfo = computed(() => {
  const trimmed = textareaValue.value.trim();
  return `Words: ${trimmed.length === 0 ? 0 : trimmed.split(/\s+/v).length}`;
});
const preview = computed(() => {
  const p = textareaValue.value.slice(0, 50);
  return p.length > 0
    ? `Preview: ${p}${textareaValue.value.length > 50 ? '...' : ''}`
    : 'Preview: (empty)';
});
</script>
