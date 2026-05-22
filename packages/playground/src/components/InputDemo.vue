<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="▶ Basic Inputs" />

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

    <Text :x="1" :y="8" :colorFg="'rgba(166,227,161,1)'" value="▶ Password & maxLength" />

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

    <Text :x="1" :y="13" :colorFg="'rgba(250,179,135,1)'" value="▶ Disabled & Readonly" />

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

    <Text :x="1" :y="18" :colorFg="'rgba(203,166,245,1)'" value="▶ v-model Feedback" />

    <Box
        :x="1"
        :y="19"
        width="95%"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(203,166,245,0.3)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" :value="inputFeedback" />
        <Text :colorFg="'rgba(108,112,134,1)'" :value="passwordFeedback" />
        <Text :colorFg="'rgba(108,112,134,1)'" :value="limitedFeedback" />
    </Box>
</template>

<script setup lang="ts">
import type { InputWidget } from '@buntui/core'
import { ref, computed } from '@vue/reactivity'
import { onMounted, useTemplateRef } from 'vue'

const inputValue = ref('')
const passwordValue = ref('')
const limitedValue = ref('')

const inputFeedback = computed(() => `Username: [${inputValue.value}] (${inputValue.value.length} chars)`)
const passwordFeedback = computed(() => `Password: ${'*'.repeat(passwordValue.value.length)} (${passwordValue.value.length} chars)`)
const limitedFeedback = computed(() => `Limited: [${limitedValue.value}] (${limitedValue.value.length}/10 chars)`)

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
