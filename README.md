# Readme

## About rasterization

场景假设：80x24 终端，10 个窗口组件

### 方案 A：Bun 端栅格化

// 每帧传输：所有 cell 数据
传输量 = 80 \* 24 \* 24 字节 ≈ 46KB/帧
60fps = 2.7MB/s

### 方案 B：Zig 端栅格化

// 每帧传输：组件状态
Component = {
x, y, width, height: u16 = 8 字节
zIndex: u32 = 4 字节
visible: u8 = 1 字节
textOffset: u32 = 4 字节 (StringArena 中的位置)
fgColor, bgColor: u32 = 8 字节
flags: u8 = 1 字节
} = 26 字节

传输量 = 10 \* 26 字节 = 260 字节/帧
60fps = 15KB/s
结论：Zig 端栅格化传输量少约 180 倍

## zig naming rules

### functions

- Use camelCase
- **A APPLYING FUNCTION MUST BE PAIRED TO A RELEASING FUNCTION**. Such as:
  - `create`Object() and `destroy`Object()
  - `init`Source() and `deinit`Source()
  - `open`Streaming() and `close`Streaming()
  - `connect`() and `disconnect`()
  - `lock`() and `unlock`()
  - `alloc`One() and `free`Arr() / `destroy`One()
  - `register`() and `unregister`()
  - `load`() and `unload`()
  - `start`() and `stop`()
  - `enter`() and `exit`()

### variables

- Naming local variables using snake_case
- Naming global variables using SCREAMING_SNAKE_CASE
- Naming function using camelCase
- Naming struct using PascalCase

## zig atomic

### .unordered

### .monotonic

### .acquire

### .release

### .acq_rel

### .seq_cst
