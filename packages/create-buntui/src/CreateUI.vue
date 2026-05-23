<template>
    <Box
        x="25%"
        :y="1"
        width="50%"
        :height="24"
        colorBg="rgb(36, 40, 59)"
        borderColor="rgb(122, 162, 247)"
        borderStyle="rounded"
        :paddingTop="1"
        :paddingBottom="1"
        :paddingLeft="2"
        :paddingRight="2"
        :shadowOffsetX="2"
        :shadowOffsetY="1"
        shadowColor="rgb(10, 10, 18)"
    >
        <Text
            width="100%"
            :height="1"
            value="Create BuntUI App"
            colorFg="rgb(122, 162, 247)"
            colorBg="rgb(36, 40, 59)"
            styleModifier="bold"
        />

        <SelectButton width="100%" :height="1" :options="['Template', 'Features']" v-model="currentTab" />

        <Text
            width="100%"
            :height="1"
            :value="'─'.repeat(40)"
            colorFg="rgb(86, 95, 137)"
            colorBg="rgb(36, 40, 59)"
            overflow="clip"
        />

        <Box v-if="currentTab === 'Template'" width="100%" :border="false" direction="vertical" :gap="1" colorBg="rgb(36, 40, 59)">
            <Input
                width="100%"
                v-model="projectName"
                colorFg="rgb(192, 202, 229)"
                colorBg="rgb(26, 27, 38)"
                borderColorUnfocused="rgb(86, 95, 137)"
                borderColorFocused="rgb(122, 162, 247)"
                borderStyle="solid"
                placeholder="my-buntui-app"
                label="Project name"
                @submit="handleNext"
            />

            <Text width="100%" :height="1" value="Template:" colorFg="rgb(192, 202, 229)" colorBg="rgb(36, 40, 59)" />

            <RadioGroup
                width="100%"
                :height="3"
                :options="['Basic', 'SFC', 'Full']"
                v-model="templateIndex"
                colorFgSelected="rgb(122, 162, 247)"
                colorBgSelected="rgb(59, 66, 91)"
            />

            <Text
                width="100%"
                :height="1"
                :value="templateDescription"
                colorFg="rgb(108, 112, 134)"
                colorBg="rgb(36, 40, 59)"
                overflow="clip"
            />

            <Box width="100%" :height="3" :border="false" direction="horizontal" :gap="2" align="center" colorBg="rgb(36, 40, 59)">
                <Button
                    :width="12"
                    :height="3"
                    value="Next →"
                    colorFgNormal="rgb(26, 27, 38)"
                    colorBgNormal="rgb(122, 162, 247)"
                    borderColorNormal="rgb(122, 162, 247)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(26, 27, 38)"
                    colorBgFocused="rgb(157, 122, 247)"
                    borderColorFocused="rgb(157, 122, 247)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(26, 27, 38)"
                    colorBgPressed="rgb(91, 110, 181)"
                    borderColorPressed="rgb(91, 110, 181)"
                    borderStylePressed="rounded"
                    @click="handleNext"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Cancel"
                    colorFgNormal="rgb(86, 95, 137)"
                    colorBgNormal="rgb(36, 40, 59)"
                    borderColorNormal="rgb(86, 95, 137)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(192, 202, 229)"
                    colorBgFocused="rgb(59, 66, 91)"
                    borderColorFocused="rgb(192, 202, 229)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(86, 95, 137)"
                    colorBgPressed="rgb(42, 48, 69)"
                    borderColorPressed="rgb(42, 48, 69)"
                    borderStylePressed="rounded"
                    @click="handleCancel"
                />
            </Box>

            <Text
                width="100%"
                :height="1"
                value="Tab/↑↓ navigate · Enter next · Esc cancel"
                colorFg="rgb(86, 95, 137)"
                colorBg="rgb(36, 40, 59)"
            />
        </Box>

        <Box
            v-if="currentTab === 'Features'"
            width="100%"
            :border="false"
            direction="vertical"
            :gap="1"
            :paddingTop="1"
            colorBg="rgb(36, 40, 59)"
        >
            <Checkbox
                width="100%"
                :height="1"
                label="Initialize git repository"
                v-model="featureGit"
                colorFgNormal="rgb(192, 202, 229)"
                colorBgNormal="rgb(36, 40, 59)"
                colorFgFocused="rgb(192, 202, 229)"
                colorBgFocused="rgb(59, 66, 91)"
            />

            <Checkbox
                width="100%"
                :height="1"
                label="Include HMR dev tools"
                v-model="featureHmr"
                colorFgNormal="rgb(192, 202, 229)"
                colorBgNormal="rgb(36, 40, 59)"
                colorFgFocused="rgb(192, 202, 229)"
                colorBgFocused="rgb(59, 66, 91)"
            />

            <Checkbox
                width="100%"
                :height="1"
                label="Include example extensions"
                v-model="featureExtensions"
                colorFgNormal="rgb(192, 202, 229)"
                colorBgNormal="rgb(36, 40, 59)"
                colorFgFocused="rgb(192, 202, 229)"
                colorBgFocused="rgb(59, 66, 91)"
            />

            <Box width="100%" :height="3" :border="false" direction="horizontal" :gap="2" align="center" colorBg="rgb(36, 40, 59)">
                <Button
                    :width="12"
                    :height="3"
                    value="← Back"
                    colorFgNormal="rgb(86, 95, 137)"
                    colorBgNormal="rgb(36, 40, 59)"
                    borderColorNormal="rgb(86, 95, 137)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(192, 202, 229)"
                    colorBgFocused="rgb(59, 66, 91)"
                    borderColorFocused="rgb(192, 202, 229)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(86, 95, 137)"
                    colorBgPressed="rgb(42, 48, 69)"
                    borderColorPressed="rgb(42, 48, 69)"
                    borderStylePressed="rounded"
                    @click="handleBack"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Create"
                    colorFgNormal="rgb(26, 27, 38)"
                    colorBgNormal="rgb(122, 162, 247)"
                    borderColorNormal="rgb(122, 162, 247)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(26, 27, 38)"
                    colorBgFocused="rgb(157, 122, 247)"
                    borderColorFocused="rgb(157, 122, 247)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(26, 27, 38)"
                    colorBgPressed="rgb(91, 110, 181)"
                    borderColorPressed="rgb(91, 110, 181)"
                    borderStylePressed="rounded"
                    @click="handleCreate"
                />

                <Button
                    :width="12"
                    :height="3"
                    value="Cancel"
                    colorFgNormal="rgb(86, 95, 137)"
                    colorBgNormal="rgb(36, 40, 59)"
                    borderColorNormal="rgb(86, 95, 137)"
                    borderStyleNormal="rounded"
                    colorFgFocused="rgb(192, 202, 229)"
                    colorBgFocused="rgb(59, 66, 91)"
                    borderColorFocused="rgb(192, 202, 229)"
                    borderStyleFocused="rounded"
                    colorFgPressed="rgb(86, 95, 137)"
                    colorBgPressed="rgb(42, 48, 69)"
                    borderColorPressed="rgb(42, 48, 69)"
                    borderStylePressed="rounded"
                    @click="handleCancel"
                />
            </Box>

            <Text
                width="100%"
                :height="1"
                value="Tab navigate · Space toggle · Esc back"
                colorFg="rgb(86, 95, 137)"
                colorBg="rgb(36, 40, 59)"
            />
        </Box>
    </Box>
</template>

<script setup lang="ts">
import process from 'node:process'
import { ref, computed } from '@vue/reactivity'
import { getApp, getDefaultProjectName } from './app-context'
import { scaffoldCopy, scaffoldCleanup, type TemplateName } from './scaffold'
import { validateProjectName } from './validate'
import { LOGGER } from '@buntui/core'

const TEXT_DIM = 'rgb(86, 95, 137)'
const ERROR_COLOR = 'rgb(243, 139, 168)'
const SUCCESS_COLOR = 'rgb(166, 227, 161)'

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
const featureHmr = ref(true)
const featureExtensions = ref(false)
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

        busy.value = false
    }
}

function handleCancel() {
    getApp().dispose()
    process.exit(0)
}
</script>
