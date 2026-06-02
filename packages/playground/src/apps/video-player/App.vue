<script setup>
import { resolvePublic } from '../../shared/runApp.ts'
import VideoPlayer from '@buntui/extensions/videoplayer'

const videoPath = resolvePublic('bad-apple.mp4')
</script>
<template>
    <VideoPlayer :src="videoPath" width="100%" height="100%" />
</template>
