<template>
    <Text :x="2" :y="1" value="Input" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="Single-line text input. Supports text/password/number types, labels, placeholders, and selection."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="value           string          Current value (v-model)" />
    <Text :x="2" :y="6" value="type            'text'|'password'|'number'  Input type" />
    <Text :x="2" :y="7" value="placeholder     string         Placeholder text" />
    <Text :x="2" :y="8" value="label           string         Label shown in top border" />
    <Text :x="2" :y="9" value="maxLength       number         Max character count (0=unlimited)" />
    <Text :x="2" :y="10" value="readonly        boolean        Read-only mode" />
    <Text :x="2" :y="11" value="disabled        boolean        Disabled state" />
    <Text :x="2" :y="12" value="min / max / step number       Range for type='number'" />
    <Text :x="2" :y="13" value="borderStyle     TuiBorderStyleName" />

    <Text :x="2" :y="15" value="▸ Basic Inputs" styleModifier="bold" />
    <Input
        :x="2"
        :y="16"
        width="45%"
        :height="3"
        label="Username"
        placeholder="Type something..."
        v-model="inputValue"
        @submit="handleSubmit"
    />
    <Input
        x="50%"
        :y="16"
        width="45%"
        :height="3"
        label="Echo"
        placeholder="Readonly mirror"
        readonly
        :value="inputValue"
    />

    <Text :x="2" :y="20" value="▸ Password & maxLength" styleModifier="bold" />
    <Input
        :x="2"
        :y="21"
        width="45%"
        :height="3"
        type="password"
        label="Password"
        placeholder="Enter password..."
        v-model="passwordValue"
    />
    <Input
        x="50%"
        :y="21"
        width="45%"
        :height="3"
        label="Max 10 chars"
        placeholder="Limited..."
        :maxLength="10"
        v-model="limitedValue"
    />

    <Text :x="2" :y="25" value="▸ Number Type" styleModifier="bold" />
    <Input
        :x="2"
        :y="26"
        width="30%"
        :height="3"
        type="number"
        label="Age"
        :min="0"
        :max="120"
        :step="1"
        v-model="numberValue"
    />

    <Text :x="2" :y="30" value="▸ Disabled" styleModifier="bold" />
    <Input :x="2" :y="31" width="45%" :height="3" label="Disabled" :disabled="true" value="Can't type here" />

    <Text :x="2" :y="35" value="▸ v-model Feedback" styleModifier="bold" />
    <Box :x="2" :y="36" width="95%" :height="5" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text :value="`Username: [${inputValue}] (${inputValue.length} chars)`" />
        <Text :value="`Password: ${'*'.repeat(passwordValue.length)} (${passwordValue.length} chars)`" />
        <Text :value="`Limited: [${limitedValue}] (${limitedValue.length}/10 chars)`" />
        <Text :value="`Number: ${numberValue}`" />
    </Box>

    <Text
        :x="2"
        :y="42"
        value="▸ Events: input, submit, change (number), copy, cut, paste, undo, redo"
        styleModifier="bold"
    />
    <Text :x="2" :y="43" :value="eventLog" />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const inputValue = ref('')
const passwordValue = ref('')
const limitedValue = ref('')
const numberValue = ref('25')
const lastSubmit = ref('')

const eventLog = computed(() => {
    if (lastSubmit.value.length === 0) return 'Press Enter to submit'
    return `Last submit: "${lastSubmit.value}"`
})

function handleSubmit(data: TuiSubmitEvent) {
    lastSubmit.value = data.value
}
</script>
