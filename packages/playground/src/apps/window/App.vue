<template>
  <Box draggable :height="20" :width="20">
    <SelectButton
      position="absolute"
      :x="7"
      width="100%"
      :tabs="['↓', '↑', 'X']"
    />
    <ScrollBox
      position="absolute"
      :y="1"
      :height="17"
      width="100%"
      borderStyle="none"
    ></ScrollBox>
  </Box>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const options = ref(['Option 1', 'Option 2', 'Option 3']);
</script>
