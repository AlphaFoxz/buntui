<template>
    <Text :x="1" :y="3" value="Box widget — layout container with borders, padding, alignment" />

    <Box
        :x="1"
        :y="4"
        :width="30"
        :height="6"
        colorBorder="rgba(137,180,250,1)"
        borderStyle="rounded"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Rounded border" />
        <Text value="With padding and gap" />
    </Box>

    <Box
        :x="33"
        :y="4"
        :width="30"
        :height="6"
        colorBorder="rgba(166,227,161,1)"
        borderStyle="double"
        direction="vertical"
        :gap="1"
        :paddingTop="1"
        :paddingLeft="1"
    >
        <Text value="Double border" />
        <Text value="Vertical layout" />
    </Box>

    <Box
        :x="1"
        :y="11"
        :width="30"
        :height="3"
        colorBorder="rgba(250,179,135,1)"
        borderStyle="solid"
        direction="horizontal"
        :gap="2"
        align="center"
    >
        <Text value="Horizontal" />
        <Text value="center aligned" />
    </Box>

    <Box
        :x="33"
        :y="11"
        :width="30"
        :height="3"
        colorBorder="rgba(243,139,168,1)"
        borderStyle="dashed"
        direction="horizontal"
        :gap="2"
        align="center"
    >
        <Text value="Dashed border" />
        <Text value="gap=2" />
    </Box>

    <Box
        :draggable="true"
        :x="1"
        :y="15"
        :width="20"
        :height="3"
        colorBorder="rgba(203,166,245,1)"
        borderStyle="rounded"
    >
        <Text value="Drag me!" />
    </Box>
</template>

<script setup lang="ts">
</script>
