<template>
    <Text :x="1" :y="3" value="▶ Basic Inputs" />

    <Input
        ref="firstInput"
        :x="1"
        :y="4"
        :width="30"
        :height="3"
        label="Username"
        placeholder="Type something..."
        v-model="inputValue"
        @input="handleInput"
        @submit="handleSubmit"
    />
    <Input
        :x="33"
        :y="4"
        :width="30"
        :height="3"
        label="Echo"
        placeholder="Readonly mirror"
        readonly
        :value="inputValue"
    />

    <Text :x="1" :y="8" value="▶ Password & maxLength" />

    <Input
        :x="1"
        :y="9"
        :width="30"
        :height="3"
        type="password"
        label="Password"
        placeholder="Enter password..."
        v-model="passwordValue"
    />
    <Input
        :x="33"
        :y="9"
        :width="30"
        :height="3"
        label="Max 10 chars"
        placeholder="Limited input..."
        :maxLength="10"
        v-model="limitedValue"
    />

    <Text :x="1" :y="13" value="▶ Disabled & Readonly" />

    <Input
        :x="1"
        :y="14"
        :width="30"
        :height="3"
        label="Disabled"
        placeholder="Can't type here"
        :disabled="true"
        value="Disabled input"
    />
    <Input
        :x="33"
        :y="14"
        :width="30"
        :height="3"
        label="Readonly"
        placeholder="Read only"
        readonly
        value="Readonly content here"
    />

    <Text :x="1" :y="18" value="▶ Textarea" />

    <Textarea
        :x="1"
        :y="19"
        :width="40"
        :height="8"
        label="Notes"
        placeholder="Type multiline text..."
        v-model="textareaValue"
    />
    <Box
        :x="43"
        :y="19"
        width="52%"
        :height="8"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :value="textareaFeedback" />
        <Text :value="textareaPreview" />
    </Box>

    <Text :x="1" :y="29" value="▶ v-model Feedback" />

    <Box
        :x="1"
        :y="30"
        width="95%"
        :height="5"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :value="inputFeedback" />
        <Text :value="passwordFeedback" />
        <Text :value="limitedFeedback" />
    </Box>
</template>

<script setup lang="ts">
import type { InputWidget } from '@buntui/core'
import { ref, computed } from '@vue/reactivity'
import { onMounted, useTemplateRef } from 'vue'

const inputValue = ref('')
const passwordValue = ref('')
const limitedValue = ref('')
const textareaValue = ref('')

const inputFeedback = computed(() => `Username: [${inputValue.value}] (${inputValue.value.length} chars)`)
const passwordFeedback = computed(
    () => `Password: ${'*'.repeat(passwordValue.value.length)} (${passwordValue.value.length} chars)`,
)
const limitedFeedback = computed(() => `Limited: [${limitedValue.value}] (${limitedValue.value.length}/10 chars)`)
const textareaFeedback = computed(() => `Lines: ${textareaValue.value.split('\n').length} | Chars: ${textareaValue.value.length}`)
const textareaPreview = computed(() => {
    const preview = textareaValue.value.slice(0, 60)
    return preview.length > 0 ? `Preview: ${preview}${textareaValue.value.length > 60 ? '...' : ''}` : 'Preview: (empty)'
})

function handleInput(data: TuiInputEvent) {
    void data
}

function handleSubmit(data: TuiSubmitEvent) {
    void data
}

const firstInput = useTemplateRef<InputWidget>('firstInput')
onMounted(() => {
    firstInput.value?.focus()
})
</script>
