<template>
    <Box
        :x="x"
        :y="y"
        :width="30"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="focused ? 'rgba(137,180,250,1)' : 'rgba(108,112,134,1)'"
        borderStyle="rounded"
        :draggable="true"
        :direction="'vertical'"
        :gap="1"
        :align="'center'"
    >
        <Text :colorFg="'rgba(166,227,161,1)'" :value="message" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="Drag me!" />
    </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

defineProps<{
  x: number | `${number}%`
  y: number | `${number}%`
}>()

const focused = ref(false)
const message = ref('Hello from component!')
</script>
