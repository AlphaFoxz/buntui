<template>
    <Text :x="1" :y="3" value="▶ Basic Table" />

    <Table
        :x="1"
        :y="4"
        :width="60"
        :height="10"
        :columns="basicColumns"
        :rows="basicRows"
        @rowSelect="onRowSelect"
        @rowActivate="onRowActivate"
    />

    <Text :x="1" :y="16" value="▶ Large Dataset with Scroll" />

    <Table
        :x="1"
        :y="17"
        :width="60"
        :height="12"
        :columns="scrollColumns"
        :rows="scrollRows"
        @rowSelect="onScrollRowSelect"
    />

    <Box
        x="64%"
        :y="3"
        width="33%"
        :height="6"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
    >
        <Text value="▶ Selection Info" />
        <Text :value="selectionInfo" />
    </Box>
</template>

<script setup lang="ts">
import {ref, computed} from '@vue/reactivity'

const basicColumns = [
    {key: 'name', label: 'Name', width: 15},
    {key: 'role', label: 'Role', width: 15},
    {key: 'status', label: 'Status', width: 12, align: 'center' as const},
]

const basicRows = [
    {name: 'Alice', role: 'Engineer', status: 'Active'},
    {name: 'Bob', role: 'Designer', status: 'Away'},
    {name: 'Charlie', role: 'PM', status: 'Active'},
    {name: 'Diana', role: 'QA', status: 'Offline'},
    {name: 'Eve', role: 'DevOps', status: 'Active'},
]

const scrollColumns = [
    {key: 'id', label: 'ID', width: 5, align: 'right' as const},
    {key: 'process', label: 'Process', width: 20},
    {key: 'cpu', label: 'CPU%', width: 8, align: 'right' as const},
    {key: 'mem', label: 'MEM%', width: 8, align: 'right' as const},
]

const processes = [
    'node', 'chrome', 'vscode', 'bun', 'git', 'typescript', 'webpack',
    'eslint', 'docker', 'nginx', 'redis', 'postgres', 'python', 'java',
    'rust-analyzer', 'cargo', 'go', 'flutter', 'react', 'vue',
]

const scrollRows = Array.from({length: 50}, (_, i) => ({
    id: i + 1,
    process: processes[i % processes.length]!,
    cpu: (Math.random() * 100).toFixed(1),
    mem: (Math.random() * 50).toFixed(1),
}))

const selectedName = ref('')
const selectedRole = ref('')

const selectionInfo = computed(() => {
    if (selectedName.value.length === 0) return '(no selection)'
    return `${selectedName.value} — ${selectedRole.value}`
})

function onRowSelect(data: TuiTableRowSelectEvent) {
    selectedName.value = String(data.row.name ?? '')
    selectedRole.value = String(data.row.role ?? '')
}

function onRowActivate(data: TuiTableRowActivateEvent) {
    void data
}

function onScrollRowSelect(data: TuiTableRowSelectEvent) {
    void data
}
</script>
