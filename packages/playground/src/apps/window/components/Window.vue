<template>
  <Box draggable :height="20" :width="20">
    <SelectButton
      position="absolute"
      :x="7"
      width="100%"
      :tabs="windowOprations"
    />
    <ScrollBox
      position="absolute"
      :y="1"
      :height="17"
      width="100%"
      borderStyle="none"
    >
      <Text :value="props.title" />
      <Box :height="3" :width="1" />
    </ScrollBox>
  </Box>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
const currentStats = ref('○');
const windowOprations = computed(() => {
  const options = ['-', '○', '□', 'X'];
  return options.filter((o) => o !== currentStats.value);
});

const props = defineProps({
  title: {
    type: String,
    required: true,
    default: '标题',
  },
});
</script>
