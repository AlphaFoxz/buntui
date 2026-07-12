<template>
  <Window :title="compTitle"></Window>
  <Bar />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Window from './components/Window.vue';
import Bar from './components/Bar.vue';

const title = ref('Hello');
const time = ref(0);
setInterval(() => {
  time.value += 1;
}, 1000);
const compTitle = computed(() => {
  return title.value + ' ' + time.value;
});
const options = ref(['Option 1', 'Option 2', 'Option 3']);
</script>
