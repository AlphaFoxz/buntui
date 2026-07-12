<template>
  <Box v-show="props.visible" draggable :height="20" :width="20">
    <SelectButton
      position="absolute"
      :x="7"
      width="100%"
      v-model="currentStats"
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
import { ref, computed, watch } from 'vue';
const currentStats = ref('○');
const windowOprations = computed(() => {
  const options = ['-', '○', '□', 'X'];
  return options.filter((o) => o !== currentStats.value);
});

watch(currentStats, (v) => {
  if (v === '-') {
  }
});

const props = defineProps({
  title: {
    type: String,
    default: '标题',
  },
  visible: {
    type: Boolean,
    default: true,
  },
});
// const emit = defineEmits(['update:modelValue']);
</script>
