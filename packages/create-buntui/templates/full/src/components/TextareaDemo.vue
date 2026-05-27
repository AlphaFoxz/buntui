<template>
    <Text :x="1" :y="3" value="Textarea widget — multi-line text editor" />

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
        <Text :value="label" />
        <Textarea
            :width="46"
            :height="3"
            placeholder="Enter multi-line text..."
            v-model="text"
        />
    </Box>

    <Text :x="1" :y="13" :value="preview" />
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const text = ref('')

const label = computed(() => text.value.length > 0 ? `Characters: ${text.value.length}` : 'Type something below:')

const preview = computed(() => {
    const lines = text.value.split('\n')
    return text.value.length > 0 ? `${lines.length} lines, ${text.value.length} chars` : 'Preview appears here'
})
</script>
