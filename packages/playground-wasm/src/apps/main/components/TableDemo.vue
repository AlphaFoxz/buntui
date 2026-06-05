<template>
    <Text :x="2" :y="1" value="Table" styleModifier="bold" />
    <Text
        :x="2"
        :y="2"
        value="Data table with column definitions, row selection, scrolling, and keyboard navigation."
    />

    <Text :x="2" :y="4" value="▸ Properties" styleModifier="bold" />
    <Text :x="2" :y="5" value="columns         { key, label?, width?, align? }[]  Column definitions" />
    <Text :x="2" :y="6" value="rows            Record<string, unknown>[]         Row data" />
    <Text :x="2" :y="7" value="disabled        boolean          Disabled state" />
    <Text :x="2" :y="8" value="borderStyle     TuiBorderStyleName" />
    <Text :x="2" :y="9" value="width, height    TuiSizeValue    Size" />

    <Text :x="2" :y="11" value="▸ Basic Table" styleModifier="bold" />
    <Table
        :x="2"
        :y="12"
        width="60%"
        :height="8"
        :columns="basicColumns"
        :rows="basicRows"
        @rowSelect="onRowSelect"
        @rowActivate="onRowActivate"
    />

    <Box x="64%" :y="12" width="33%" :height="5" borderStyle="rounded" :direction="'vertical'" :gap="1">
        <Text value="▸ Selection" styleModifier="bold" />
        <Text :value="selectionInfo" />
    </Box>

    <Text :x="2" :y="21" value="▸ Large Dataset (scrollable)" styleModifier="bold" />
    <Table :x="2" :y="22" width="95%" :height="10" :columns="scrollColumns" :rows="scrollRows" />

    <Text :x="2" :y="33" value="▸ Column align: 'left' | 'center' | 'right'" styleModifier="bold" />
    <Text
        :x="2"
        :y="34"
        value="▸ Methods: setColumns(cols), setRows(rows), scrollTo(n), scrollBy(n)"
        styleModifier="bold"
    />
    <Text
        :x="2"
        :y="35"
        value="▸ Events: rowSelect ({ index, row }), rowActivate ({ index, row })"
        styleModifier="bold"
    />
    <Text
        :x="2"
        :y="36"
        value="▸ Keyboard: ArrowUp/Down, PageUp/Down, Home/End, Enter (rowActivate)"
        styleModifier="bold"
    />
</template>
<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const basicColumns = [
    { key: 'name', label: 'Name', width: 12 },
    { key: 'role', label: 'Role', width: 12 },
    { key: 'status', label: 'Status', width: 10, align: 'center' as const },
]

const basicRows = [
    { name: 'Alice', role: 'Engineer', status: 'Active' },
    { name: 'Bob', role: 'Designer', status: 'Away' },
    { name: 'Charlie', role: 'PM', status: 'Active' },
    { name: 'Diana', role: 'QA', status: 'Offline' },
    { name: 'Eve', role: 'DevOps', status: 'Active' },
]

const scrollColumns = [
    { key: 'id', label: 'ID', width: 5, align: 'right' as const },
    { key: 'process', label: 'Process', width: 20 },
    { key: 'cpu', label: 'CPU%', width: 8, align: 'right' as const },
    { key: 'mem', label: 'MEM%', width: 8, align: 'right' as const },
]

const processes = [
    'node',
    'chrome',
    'vscode',
    'bun',
    'git',
    'typescript',
    'webpack',
    'eslint',
    'docker',
    'nginx',
    'redis',
    'postgres',
    'python',
    'java',
    'rust-analyzer',
    'cargo',
    'go',
    'flutter',
    'react',
    'vue',
]

const scrollRows = Array.from({ length: 50 }, (_, i) => ({
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
</script>
