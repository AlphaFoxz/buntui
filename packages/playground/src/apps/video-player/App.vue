<script setup>
import path from 'node:path'
import {cwd} from 'node:process'
import VideoPlayer from '@buntui/extensions/videoplayer'

const videoPath = path.join(cwd(), 'public', 'bad-apple.mp4')
</script>
<template>
    <VideoPlayer :src="videoPath" width="100%" height="100%" />
</template>
