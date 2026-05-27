<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="Textarea widget — multi-line text editor" />

    <Box
        :x="1"
        :y="4"
        :width="50"
        :height="6"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text :colorFg="'rgba(108,112,134,1)'" value="Type and press Ctrl+Enter to submit:" />
        <Textarea
            :width="46"
            :height="3"
            :placeholder="'Enter multi-line text...'"
            @submit="handleSubmit"
        />
    </Box>

    <Text :x="1" :y="11" :colorFg="'rgba(166,227,161,1)'" :value="submittedValue" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const submittedValue = ref('Submit result appears here')

function handleSubmit(event: TuiSubmitEvent) {
    submittedValue.value = `Submitted: "${event.value}"`
}
</script>
