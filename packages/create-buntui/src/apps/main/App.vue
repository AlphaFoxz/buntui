<template>
    <Box
        x="25%"
        :y="1"
        width="50%"
        :height="24"
        colorBorder="rgb(122, 162, 247)"
        borderStyle="rounded"
        :paddingTop="1"
        :paddingBottom="1"
        :paddingLeft="2"
        :paddingRight="2"
        :shadowOffsetX="2"
        :shadowOffsetY="1"
        colorShadow="rgb(10, 10, 18)"
    >
        <Text width="100%" :height="1" value="Create Buntui App" colorFg="rgb(122, 162, 247)" styleModifier="bold" />

        <SelectButton width="100%" :height="1" :options="['Template', 'Features']" v-model="currentTab" />

        <Text width="100%" :height="1" :value="'─'.repeat(40)" overflow="clip" />

        <Box v-if="currentTab === 'Template'" width="100%" :border="false" direction="vertical" :gap="1">
            <Input
                width="100%"
                v-model="projectName"
                placeholder="my-buntui-app"
                label="Project name"
                @submit="handleNext"
            />

            <Text width="100%" :height="1" value="Template:" />

            <RadioGroup width="100%" :height="3" :options="['Basic', 'SFC', 'Full']" v-model="templateIndex" />

            <Text width="100%" :height="1" :value="templateDescription" overflow="clip" />

            <Box width="100%" :height="3" :border="false" direction="horizontal" :gap="2" align="center">
                <Button
                    :width="12"
                    :height="3"
                    value="Next →"
                    colorFgNormal="rgb(26, 27, 38)"
                    colorBgNormal="rgb(122, 162, 247)"
                    colorBorderNormal="rgb(122, 162, 247)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(26, 27, 38)"
                    colorBgFocused="rgb(157, 122, 247)"
                    colorBorderFocused="rgb(157, 122, 247)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(26, 27, 38)"
                    colorBgPressed="rgb(91, 110, 181)"
                    colorBorderPressed="rgb(91, 110, 181)"
                    borderStylePressed="rounded"
                    @click="handleNext"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Cancel"
                    borderStyleNormal="rounded"
                    borderStyleFocused="rounded"
                    borderStylePressed="rounded"
                    @click="handleCancel"
                />
            </Box>

            <Text width="100%" :height="1" value="Tab/↑↓ navigate · Enter next · Esc cancel" />
        </Box>

        <Box
            v-if="currentTab === 'Features'"
            width="100%"
            :border="false"
            direction="vertical"
            :gap="1"
            :paddingTop="1"
        >
            <Checkbox width="100%" :height="1" label="Initialize git repository" v-model="featureGit" />

            <Box width="100%" :height="3" :border="false" direction="horizontal" :gap="2" align="center">
                <Button
                    :width="12"
                    :height="3"
                    value="← Back"
                    borderStyleNormal="rounded"
                    borderStyleFocused="rounded"
                    borderStylePressed="rounded"
                    @click="handleBack"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Create"
                    colorFgNormal="rgb(26, 27, 38)"
                    colorBgNormal="rgb(122, 162, 247)"
                    colorBorderNormal="rgb(122, 162, 247)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(26, 27, 38)"
                    colorBgFocused="rgb(157, 122, 247)"
                    colorBorderFocused="rgb(157, 122, 247)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(26, 27, 38)"
                    colorBgPressed="rgb(91, 110, 181)"
                    colorBorderPressed="rgb(91, 110, 181)"
                    borderStylePressed="rounded"
                    @click="handleCreate"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Cancel"
                    borderStyleNormal="rounded"
                    borderStyleFocused="rounded"
                    borderStylePressed="rounded"
                    @click="handleCancel"
                />
            </Box>

            <Text width="100%" :height="1" value="Tab navigate · Space toggle · Esc back" />
        </Box>
    </Box>
</template>

<script setup lang="ts">
import process from 'node:process'
import { ref, computed } from '@vue/reactivity'
import { getApp, getDefaultProjectName } from '../../shared/app-context'
import { scaffoldCopy, scaffoldCleanup, type TemplateName } from '../../shared/scaffold'
import { validateProjectName } from '../../shared/validate'
import { LOGGER } from '@buntui/core'

const TEMPLATE_NAMES: TemplateName[] = ['basic', 'sfc', 'full']
const TEMPLATE_DESCRIPTIONS = [
    'A minimal starting point with Box, Text, Button, and a clock demo.',
    'SFC compiler + HMR hot reload + dev server setup.',
    'All core widgets showcase with tabbed navigation and theme support.',
]

const currentTab = ref('Template')
const projectName = ref(getDefaultProjectName() ?? 'my-buntui-app')
const templateIndex = ref(0)
const featureGit = ref(true)
const busy = ref(false)

const templateDescription = computed(() => TEMPLATE_DESCRIPTIONS[templateIndex.value] ?? '')

function handleNext() {
    const name = projectName.value.trim()
    const validationError = validateProjectName(name, process.cwd())
    if (validationError) {
        LOGGER.logError(validationError)
        return
    }

    currentTab.value = 'Features'
}

function handleBack() {
    currentTab.value = 'Template'
}

async function handleCreate() {
    if (busy.value) {
        return
    }

    const name = projectName.value.trim()
    const validationError = validateProjectName(name, process.cwd())
    if (validationError) {
        currentTab.value = 'Template'
        return
    }

    const template = TEMPLATE_NAMES[templateIndex.value] ?? 'basic'

    busy.value = true

    let projectDir = ''
    try {
        projectDir = scaffoldCopy(name, process.cwd(), template)

        if (featureGit.value) {
            const gitProc = Bun.spawn(['git', 'init'], {
                cwd: projectDir,
                stdout: 'ignore',
                stderr: 'ignore',
            })
            await gitProc.exited
        }

        const proc = Bun.spawn(['bun', 'install'], {
            cwd: projectDir,
            stdout: 'inherit',
            stderr: 'inherit',
        })
        const exitCode = await proc.exited
        if (exitCode !== 0) {
            scaffoldCleanup(projectDir)
            LOGGER.logError(`bun install failed (exit code ${exitCode})`)
            busy.value = false
            return
        }

        setTimeout(() => {
            getApp().dispose()
            process.exit(0)
        }, 800)
    } catch (error) {
        if (projectDir) {
            scaffoldCleanup(projectDir)
        }

        const message = error instanceof Error ? error.message : String(error)
        LOGGER.logError(message)
        busy.value = false
    }
}

function handleCancel() {
    getApp().dispose()
    process.exit(0)
}
</script>
