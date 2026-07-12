<template>
  <Matrix width="100%" height="100%" />

  <Box
    width="100%"
    :height="1"
    align="center"
    borderStyle="none"
    colorBg="none"
  >
    <Text
      :x="0"
      :y="0"
      :colorFg="colorThemed({ hueOffset: 300 })"
      value="Buntui Documentation"
      styleModifier="bold"
    />
  </Box>

  <Button
    borderStyle="none"
    :disabled="router.currentRoute.path === '/home'"
    :x="0"
    :y="0"
    :colorFgNormal="colorThemed({ hueOffset: 300 })"
    value="← Home"
    @click="handleGoHome"
  ></Button>

  <Select
    x="50%"
    :y="1"
    width="50%"
    label="Color Theme"
    :options="themeOptions"
    v-model="currentTheme"
  />

  <Home v-if="currentPage === '/home'" />
  <Api v-else-if="currentPage === '/api'" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  setTheme,
  tokyoNightMoon,
  tokyoNightStorm,
  rosePineMoon,
  rosePineDawn,
  highContrast,
  colorThemed,
} from '@buntui/core';
import { useRouter } from './domain/router.ts';
import Api from './Api.vue';
import Home from './Home.vue';
import Matrix from '@buntui/extensions/matrix';

const router = useRouter();
watch(router.currentRoute, (data) => {
  currentPage.value = data.path;
});
const pageOptions = ref([
  { value: '/home', label: 'Home' },
  { value: '/api', label: 'Api' },
]);
const currentPage = ref(pageOptions.value[0]!.value);

function handleGoHome() {
  router.push({ path: '/home' });
  console.log('Go Home');
}

const themes = [
  highContrast,
  tokyoNightMoon,
  tokyoNightStorm,
  rosePineMoon,
  rosePineDawn,
] as const;
const themeOptions = ref(themes.map((t) => ({ value: t.name, label: t.name })));
const currentTheme = ref(highContrast.name);

watch(
  currentTheme,
  (data) => {
    const t = themes.find((t) => t.name === data);
    if (t) setTheme(t);
  },
  { immediate: true },
);
</script>
