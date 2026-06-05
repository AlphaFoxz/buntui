<template>
    <Text :x="2" :y="1" value="Textarea" styleModifier="bold" />
    <Text :x="2" :y="2" value="Multi-line text editor with scrolling, selection, clipboard support, and undo/redo." />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="value           string          Content (v-model)" />
    <Text :x="2" :y="6" value="placeholder     string          Placeholder text" />
    <Text :x="2" :y="7" value="label           string          Label in top border" />
    <Text :x="2" :y="8" value="maxLength       number          Max characters (0=unlimited)" />
    <Text :x="2" :y="9" value="readonly        boolean         Read-only mode" />
    <Text :x="2" :y="10" value="disabled        boolean         Disabled state" />
    <Text :x="2" :y="11" value="borderStyle     TuiBorderStyleName" />

    <Text :x="2" :y="13" value="▸ Basic Editor" styleModifier="bold" />
    <Textarea
        :x="2"
        :y="14"
        width="45%"
        :height="10"
        label="Notes"
        placeholder="Type multiline text here..."
        v-model="textareaValue"
    />

    <Box x="50%" :y="14" width="45%" :height="10" borderStyle="rounded" :direction="'vertical'" :gap="1">
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

    <Text :x="2" :y="25" value="▸ Readonly" styleModifier="bold" />
    <Textarea
        :x="2"
        :y="26"
        width="45%"
        :height="4"
        label="Readonly"
        readonly
        :value="readonlyText"
    />

    <Text :x="2" :y="31" value="▸ Disabled" styleModifier="bold" />
    <Textarea
        :x="2"
        :y="32"
        width="45%"
        :height="3"
        label="Disabled"
        :disabled="true"
        value="Disabled textarea content"
    />

    <Text :x="2" :y="36" value="▸ Events: input, copy, cut, paste, undo, redo" styleModifier="bold" />

    <Text
        :x="2"
        :y="38"
        value="▸ Methods: select(), setSelectionRange(start, end), getSelection(), scrollTo(n), scrollBy(n)"
        styleModifier="bold"
    />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const textareaValue = ref('')
const readonlyText = 'This content cannot be edited.\nLine 2 of readonly text.\nLine 3 here.'

const lineInfo = computed(() => `Lines: ${textareaValue.value.split('\n').length}`)
const charInfo = computed(() => `Chars: ${textareaValue.value.length}`)
const preview = computed(() => {
    const p = textareaValue.value.slice(0, 50)
    return p.length > 0 ? `Preview: ${p}${textareaValue.value.length > 50 ? '...' : ''}` : 'Preview: (empty)'
})
</script>
