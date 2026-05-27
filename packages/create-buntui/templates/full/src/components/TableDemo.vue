<template>
    <Text :x="1" :y="3" value="Table widget — structured data display with selection" />

    <Table
        :x="1"
        :y="4"
        :width="60"
        :height="8"
        borderStyle="rounded"
        :columns="columns"
        :rows="rows"
    />

    <Text :x="1" :y="13" value="Use arrow keys to navigate rows" />
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
