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
import { ref, watch } from 'vue';
const currentStats = ref('○');
const windowOprations = ['-', '○', '□', 'X'];

watch(currentStats, (v) => {
  if (v === '-') {
    emit('update:visible', false);
  } else {
    emit('update:visible', true);
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
const emit = defineEmits(['update:title', 'update:visible']);
</script>
