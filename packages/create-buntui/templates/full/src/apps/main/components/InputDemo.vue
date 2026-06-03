<template>
    <Text :x="1" :y="3" value="Input widget — text field with editing support" />

    <Box
        :x="1"
        :y="4"
        :width="50"
        :height="8"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Type something and press Enter:" />
        <Input
            :width="46"
            placeholder="Enter text here..."
            @submit="handleSubmit"
        />
    </Box>

    <Text :x="1" :y="13" :value="submittedValue" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const submittedValue = ref('Submit result appears here')

function handleSubmit(event: TuiSubmitEvent) {
    submittedValue.value = `Submitted: "${event.value}"`
}
</script>
