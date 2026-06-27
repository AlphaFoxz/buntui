<template>
  <Text value="Textarea" styleModifier="bold" />
  <Text
    value="Multi-line text editor with scrolling, selection, clipboard support, and undo/redo."
  />

  <Text value="▸ Properties" styleModifier="bold" />
  <Text value="value           string          Content (v-model)" />
  <Text value="placeholder     string          Placeholder text" />
  <Text value="label           string          Label in top border" />
  <Text value="maxLength       number          Max characters (0=unlimited)" />
  <Text value="readonly        boolean         Read-only mode" />
  <Text value="disabled        boolean         Disabled state" />
  <Text value="borderStyle     TuiBorderStyleName" />

  <Text value="▸ Basic Editor" styleModifier="bold" />
  <Box
    width="98%"
    direction="horizontal"
    :gap="1"
    align="start"
    borderStyle="none"
    colorBg="rgba(0,0,0,0)"
  >
    <Textarea
      width="48%"
      :height="10"
      label="Notes"
      placeholder="Type multiline text here..."
      v-model="textareaValue"
    />

    <Box
      width="48%"
      :height="10"
      borderStyle="rounded"
      direction="vertical"
      :gap="1"
    >
      <Text value="▸ Feedback" styleModifier="bold" />
      <Text :value="lineInfo" />
      <Text :value="charInfo" />
      <Text :value="preview" />
      <Text value="" />
      <Text value="Keyboard shortcuts:" />
      <Text value="  Enter = newline, Tab = 4 spaces" />
      <Text value="  Ctrl+A/C/V/X/Z/Y" />
      <Text value="  Insert = cycle cursor mode" />
    </Box>
  </Box>

  <Text value="▸ Readonly" styleModifier="bold" />
  <Textarea
    width="98%"
    :height="4"
    label="Readonly"
    readonly
    :value="readonlyText"
  />

  <Text value="▸ Disabled" styleModifier="bold" />
  <Textarea
    width="98%"
    :height="3"
    label="Disabled"
    :disabled="true"
    value="Disabled textarea content"
  />

  <Text
    value="▸ Events: input, copy, cut, paste, undo, redo"
    styleModifier="bold"
  />

  <Text
    value="▸ Methods: select(), setSelectionRange(start, end), getSelection(), scrollTo(n), scrollBy(n)"
    styleModifier="bold"
  />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';

const textareaValue = ref('');
const readonlyText =
  'This content cannot be edited.\nLine 2 of readonly text.\nLine 3 here.';

const lineInfo = computed(
  () => `Lines: ${textareaValue.value.split('\n').length}`,
);
const charInfo = computed(() => `Chars: ${textareaValue.value.length}`);
const preview = computed(() => {
  const p = textareaValue.value.slice(0, 50);
  return p.length > 0
    ? `Preview: ${p}${textareaValue.value.length > 50 ? '...' : ''}`
    : 'Preview: (empty)';
});
</script>
