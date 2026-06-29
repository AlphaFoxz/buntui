<template>
  <Text :x="1" :y="3" value="▶ View Mode" />
  <SelectButton
    :x="1"
    :y="4"
    :height="1"
    :tabs="['List', 'Grid', 'Card', 'Gallery']"
    :value="selectedView"
    @change="handleViewChange"
  />
  <Text :x="1" :y="6" :value="`Active: ${selectedView}`" />

  <Text :x="41" :y="3" value="▶ Sort Order" />
  <SelectButton
    :x="41"
    :y="4"
    :height="1"
    :tabs="['Newest', 'Oldest', 'A-Z', 'Z-A']"
    :value="selectedSort"
    @change="handleSortChange"
  />
  <Text :x="41" :y="6" :value="`Active: ${selectedSort}`" />

  <Text :x="1" :y="9" value="▶ Alignment" />
  <SelectButton
    :x="1"
    :y="10"
    :height="1"
    :tabs="['Left', 'Center', 'Right']"
    :value="selectedAlign"
    @change="handleAlignChange"
  />
  <Text :x="1" :y="12" :value="`Active: ${selectedAlign}`" />

  <Text :x="41" :y="9" value="▶ Disabled State" />
  <SelectButton
    :x="41"
    :y="10"
    :height="1"
    :tabs="['Tab1', 'Tab2', 'Tab3']"
    value="Tab2"
    :disabled="true"
  />

  <Text :x="1" :y="15" value="▶ Summary" />
  <Box
    :x="1"
    :y="16"
    width="95%"
    :height="3"
    borderStyle="rounded"
    direction="vertical"
    :gap="1"
  >
    <Text
      :value="`View: ${selectedView} | Sort: ${selectedSort} | Align: ${selectedAlign}`"
    />
    <Text
      value="ArrowLeft/Right or Home/End to switch. Mouse click selects, hover highlights."
    />
  </Box>
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity';

const selectedView = ref('List');
function handleViewChange(data: TuiSelectButtonChangeEvent) {
  selectedView.value = data.value as string;
}

const selectedSort = ref('Newest');
function handleSortChange(data: TuiSelectButtonChangeEvent) {
  selectedSort.value = data.value as string;
}

const selectedAlign = ref('Left');
function handleAlignChange(data: TuiSelectButtonChangeEvent) {
  selectedAlign.value = data.value as string;
}
</script>
