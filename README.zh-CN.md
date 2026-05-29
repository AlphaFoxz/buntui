[English](./README.md) | **中文**

<h1 align="center">buntui</h1>

<p align="center">
  <strong>高性能终端 UI 框架 — Zig 渲染 + Vue SFC 开发体验 + Bun 运行时</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Zig-0.16-f7a41d?logo=zig" alt="Zig 0.16" />
  <img src="https://img.shields.io/badge/Bun-runtime-000?logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/Vue-SFC-42b883?logo=vue.js" alt="Vue SFC" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
</p>

---

## 快速开始

```bash
bunx create-buntui@alpha
cd my-app-name
bun dev
```

## 为什么选择 buntui？

|                      |                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **终端里的 Vue SFC** | 编写 `.vue` 文件，使用 `<template>`、`<script setup>` 和响应式绑定，就像写 Web 应用一样   |
| **Zig 驱动渲染**     | 通过 FFI 调用原生光栅化器 — 零 GC 停顿，极低帧耗时                                        |
| **Bun 运行时**       | `<script>` 中拥有完整 OS 访问能力 — 启动进程、读写文件、调用任意 npm 包                   |
| **热重载**           | 编辑 `.vue` 文件即刻生效，无需重启                                                        |
| **丰富的组件库**     | Box、Text、Input、Button、Checkbox、Switch、RadioGroup、SelectButton、Progress、ScrollBox |

## 架构

```text
┌─────────────── TypeScript (Bun) ─────────────────┐
│                                                  │
│  .vue SFC ──→ Widget Tree ──→ emitDrawCommands() │
│       (compiler)   (Vue reactivity)       │      │
│                                           ▼      │
│                                   DrawListBuffer │
│                                  (shared memory) │
└──────────────────────┬───────────────────────────┘
                       │ FFI: renderDrawList(ctx, buf, len)
                       ▼
┌─────────────── Zig (Native) ─────────────────────┐
│                                                  │
│  Parse Commands ──→ Rasterize ──→ Cell Grid      │
│  (draw_list/)      (per-cmd)    (TuiFrame)       │
│                                      │           │
│                                      ▼           │
│                                 Diff + ANSI ───────────► Terminal
└──────────────────────────────────────────────────┘
```

每帧流程：重置缓冲区 → 组件树生成绘制命令 → FFI 传给 Zig → 光栅化到单元格网格 → 差分脏区 → 输出 ANSI。

## 示例

```vue
<template>
  <Box :x="1" :y="1" :width="40" :height="5" borderStyle="rounded" :borderColor="'rgba(137,180,250,1)'">
    <Text :colorFg="'rgba(205,214,244,1)'" :value="greeting" />
    <Button :width="16" :height="3" value="Click me" @click="onClick" />
  </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const name = ref('world')
const greeting = computed(() => `Hello, ${name.value}!`)

function onClick() {
  name.value = 'buntui'
}
</script>
```

## 内置组件

| 组件             | 说明                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| `<Box>`          | 容器：边框、内边距、弹性布局（direction / gap / align）、阴影、可拖拽     |
| `<Text>`         | 文本：字体修饰（bold / italic / underline …）、跑马灯溢出                 |
| `<Input>`        | 输入框：光标、选区、撤销/重做、剪贴板、密码模式、浮动标签                 |
| `<Button>`       | 五态按钮（normal / hovered / focused / pressed / disabled），可自定义配色 |
| `<Checkbox>`     | 三态复选框（未选 / 已选 / 不确定）                                        |
| `<Switch>`       | 开关：带颜色指示器的 on/off 切换                                          |
| `<RadioGroup>`   | 纵向单选按钮组，支持键盘导航                                              |
| `<SelectButton>` | 水平分段控制器（标签栏）                                                  |
| `<Progress>`     | 进度条：确定/不确定模式，带动画                                           |
| `<ScrollBox>`    | 可滚动容器：滚动条、鼠标拖拽、键盘翻页                                    |

## 扩展组件

```bash
import Matrix      from '@buntui/extensions/matrix'
import Snake       from '@buntui/extensions/snake'
import VideoPlayer from '@buntui/extensions/videoplayer'
import Logger      from '@buntui/extensions/logger'
import FrameRate   from '@buntui/extensions/framerate'
```

| 组件        | 说明                              |
| ----------- | --------------------------------- |
| Matrix      | 黑客帝国数字雨动画背景            |
| Snake       | 可玩的贪吃蛇游戏（方向键 + 空格） |
| VideoPlayer | 在终端中以 braille art 播放视频   |
| Logger      | 浮动可拖拽的日志面板，带时间戳    |
| FrameRate   | 实时帧率计数器覆盖层              |

## Monorepo 结构

```text
packages/
├── native/              Zig 渲染引擎 → 共享库（.dll / .dylib / .so）
├── native-platforms/    预编译二进制（win32-x64、linux-x64、darwin-x64、darwin-arm64）
├── core/                TS 运行时：组件系统、FFI、事件总线、绘制列表
├── extensions/          扩展组件，支持 sub-path 导出
├── compiler/            SFC 编译器（.vue → TS），基于 Vue compiler-core
├── playground/          演示应用
├── buntui/              聚合包（core + extensions）
└── create-buntui/       CLI 脚手架工具
```

## 开源协议

[Apache-2.0](./LICENSE)
