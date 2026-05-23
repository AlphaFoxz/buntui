<template>
    <Text :x="1" :y="3" :colorFg="'rgba(137,180,250,1)'" value="Box widget — layout container with borders, padding, alignment" />

    <Box
        :x="1"
        :y="4"
        :width="30"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(137,180,250,1)'"
        borderStyle="rounded"
        :direction="'vertical'"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text :colorFg="'rgba(205,214,244,1)'" value="Rounded border" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="With padding and gap" />
    </Box>

    <Box
        :x="33"
        :y="4"
        :width="30"
        :height="5"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(166,227,161,1)'"
        borderStyle="double"
        :direction="'vertical'"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text :colorFg="'rgba(166,227,161,1)'" value="Double border" />
        <Text :colorFg="'rgba(108,112,134,1)'" value="Vertical layout" />
    </Box>

    <Box
        :x="1"
        :y="10"
        :width="30"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(250,179,135,1)'"
        borderStyle="solid"
        :direction="'horizontal'"
        :gap="2"
        :align="'center'"
    >
        <Text :colorFg="'rgba(250,179,135,1)'" value="Horizontal" />
        <Text :colorFg="'rgba(205,214,244,1)'" value="center aligned" />
    </Box>

    <Box
        :x="33"
        :y="10"
        :width="30"
        :height="3"
        :colorBg="'rgba(30,30,46,1)'"
        :borderColor="'rgba(243,139,168,1)'"
        borderStyle="dashed"
        :direction="'horizontal'"
        :gap="2"
        :align="'center'"
    >
        <Text :colorFg="'rgba(243,139,168,1)'" value="Dashed border" />
        <Text :colorFg="'rgba(205,214,244,1)'" value="gap=2" />
    </Box>

    <Box
        :draggable="true"
        :x="1"
        :y="14"
        :width="20"
        :height="3"
        :colorBg="'rgba(203,166,245,0.2)'"
        :borderColor="'rgba(203,166,245,1)'"
        borderStyle="rounded"
    >
        <Text :colorFg="'rgba(203,166,245,1)'" value="Drag me!" />
    </Box>
</template>

<script setup lang="ts">
</script>
