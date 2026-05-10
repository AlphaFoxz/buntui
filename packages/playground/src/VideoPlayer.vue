<script setup>
import { resolve } from 'node:path'
import VideoPlayer from '@buntui/extensions/videoplayer'

const videoPath = resolve(import.meta.dir, '..', 'bad-apple.mp4')
</script>
<template>
    <VideoPlayer :src="videoPath" width="100%" height="100%" />
</template>
