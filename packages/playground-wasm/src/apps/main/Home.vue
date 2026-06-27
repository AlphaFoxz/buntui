<template>
  <ScrollBox
    :x="0"
    :y="5"
    width="100%"
    :height="15"
    :color-bg="colorThemed({ alpha: 0.6, lightnessOffset: -0.2 })"
    border-style="none"
    align="center"
  >
    <Logo />
    <Button value="API" @click="handleLogoClick"></Button>
  </ScrollBox>
</template>

<script lang="ts" setup>
import { colorThemed } from '@buntui/core';
import { useRouter } from './domain/router.ts';
import Logo from './components/Logo.vue';

const router = useRouter();
const handleLogoClick = () => {
  router.push({ path: '/api' });
};
</script>
