# USAGE

## Install

```bash
bun i buntui@latest
```

## Create a `index.vue`

```vue
<script>
import { app } from 'buntui'

const count = ref(0)

function handleKeydown() {
  if (event.key === '-') {
    count.value--
  } else if (event.key === '+') {
    count.value++
  } else if (event.key === 'q') {
    app.stop()
    process.exit(0)
  }
}
</script>

<template>
  <app>
    <scene enabled @keydown="handleKeydown">
      <text :x="0" :y="0">Count: {{ count }}</text>
      <text :x="0" :y="1">Press - / + to change count.</text>
      <text :x="0" :y="2">Press `Q` to exit.</text>
    </scene>
  </app>
</template>
```

## Run

```bash
bun run dev
```

## Build

```bash
bun run build
```
