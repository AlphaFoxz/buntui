<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="Table widget — structured data display with selection" />

    <Table
        :x="1"
        :y="4"
        :width="60"
        :height="8"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,0.5)'"
        borderStyle="rounded"
        :columns="columns"
        :rows="rows"
    />

    <Text :x="1" :y="13" :colorFg="'rgba(108,112,134,1)'" value="Use arrow keys to navigate rows" />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const columns = ref([
    {key: 'name', label: 'Name', width: 20},
    {key: 'role', label: 'Role', width: 16},
    {key: 'status', label: 'Status', width: 10},
])

const rows = ref([
    {name: 'Alice', role: 'Engineer', status: 'Active'},
    {name: 'Bob', role: 'Designer', status: 'Away'},
    {name: 'Charlie', role: 'Manager', status: 'Active'},
    {name: 'Diana', role: 'Engineer', status: 'Busy'},
    {name: 'Eve', role: 'Analyst', status: 'Active'},
])
</script>
