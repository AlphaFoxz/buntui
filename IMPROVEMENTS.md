# Term-Bed 改进方向

本文档记录了项目当前存在的技术债务和改进方向，按优先级排序。

## 🔴 P0 - 严重问题（必须修复）

### 1. 事件系统内存布局不匹配

**问题描述：**
TypeScript 和 Zig 对事件头结构的定义不一致，导致数据读取错误。

**当前状态：**
- Zig 定义（[core/event_bus.zig](packages/native/src/core/event_bus.zig)）：
  ```zig
  EventHeader = extern struct {
      event_type: u32,    // offset 0, 4 bytes
      payload_len: u32,   // offset 4, 4 bytes
      sequence: u64,      // offset 8, 8 bytes
      // 总计 16 bytes
  };
  ```

- TypeScript 读取（[events/index.ts:35](packages/lib/src/events/index.ts#L35)）：
  ```typescript
  const headerBuf = toArrayBuffer(slotPtr, 0, 12);  // ❌ 只读 12 bytes
  const payloadLength = headerView.getUint32(4, true);  // ❌ 错误的偏移
  ```

- 另一处（[index-demo.ts:56](packages/lib/src/index-demo.ts#L56)）：
  ```typescript
  const payloadLength = headerView.getUint16(2, true);  // ❌ 类型不匹配
  ```

**影响：**
- 事件数据损坏
- 程序行为不可预测
- 可能导致崩溃

**解决方案：**
1. 统一事件头定义为 16 bytes
2. 使用正确的类型和偏移量
3. 添加编译时验证（如 Zig 的 `@compileError`）

**相关文件：**
- [packages/native/src/core/event_bus.zig](packages/native/src/core/event_bus.zig)
- [packages/lib/src/events/index.ts](packages/lib/src/events/index.ts)
- [packages/lib/src/index-demo.ts](packages/lib/src/index-demo.ts)

---

### 2. FFI 类型声明不匹配

**问题描述：**
Zig 导出的函数签名与 TypeScript FFI 绑定不一致。

**示例：**
```zig
// Zig
pub export fn event_bus_emit(event_type: u16, data_ptr: [*]const u8, len: usize) c_int
```

```typescript
// TypeScript
event_bus_emit: {
  args: [FFIType.u16, FFIType.ptr, FFIType.uint64_t],  // len 应该是 usize
```

**影响：**
- 64 位系统上可能工作（usize = uint64_t）
- 32 位系统会崩溃（usize = uint32_t）
- 类型不安全

**解决方案：**
1. 创建统一的 FFI 类型定义文件
2. 使用类型别名确保一致性
3. 添加平台检测逻辑

**相关文件：**
- [packages/native/src/lib.zig](packages/native/src/lib.zig)
- [packages/lib/src/extern/*.ts](packages/lib/src/extern/)

---

### 3. JSON 序列化破坏零拷贝设计

**问题描述：**
虽然事件数据传输是零拷贝的，但使用 JSON 序列化完全抵消了性能优势。

**当前实现：**
[events/index.ts:41](packages/lib/src/events/index.ts#L41)
```typescript
const jsonString = decoder.decode(payloadBuf);
const json = JSON.parse(jsonString);  // ❌ CPU 密集 + 内存分配
```

**性能损失：**
- JSON 解析：~10-50μs per event
- 内存分配：每次解析产生垃圾
- 类型检查：运行时开销
- 无类型安全：使用 `any` 类型

**解决方案：**
采用二进制协议替代 JSON：

```typescript
// 定义二进制格式
interface KeyEvent {
  keyCode: u16;
  modifiers: u8;  // bit flags
  reserved: u8;
}

// 直接从内存读取
const view = new TuiDataViewWrapper(payloadBuf);
const keyCode = view.getUint16(0, true);
const modifiers = view.getUint8(2);
```

**相关文件：**
- [packages/lib/src/events/index.ts](packages/lib/src/events/index.ts)
- [packages/native/src/core/event_bus.zig](packages/native/src/core/event_bus.zig)

---

## ⚠️ P1 - 设计缺陷（应该修复）

### 4. 缺少内存所有权管理

**问题描述：**
FFI 边界没有明确的内存管理策略。

**当前问题：**
- Zig 返回的指针由谁释放？
- 没有对应的 `free`/`destroy` 函数
- TypeScript 无法追踪原生内存生命周期

**解决方案：**
实现 RAII 模式：

```typescript
class NativeResource {
  constructor(ptr: Pointer, destroyer: (ptr: Pointer) => void) {
    this.ptr = ptr;
    this.destroyer = destroyer;
  }

  private refCount = 1;

  retain() {
    this.refCount++;
  }

  release() {
    if (--this.refCount === 0) {
      this.destroyer(this.ptr);
    }
  }
}
```

**相关文件：**
- [packages/lib/src/extern/](packages/lib/src/extern/)
- [packages/native/src/lib.zig](packages/native/src/lib.zig)

---

### 5. 双缓冲渲染未完成

**问题描述：**
双缓冲的交换逻辑被注释掉，导致渲染不完整。

**当前状态：**
[render/frame.zig:93](packages/native/src/render/frame.zig#L93)
```zig
pub fn swap(self: *Frame) void {
    // TODO: 实现真正的缓冲区交换
    // mem.swap(u8, self.current.buffer, self.next.buffer);
}
```

**影响：**
- 可能出现闪烁
- 帧渲染不完整
- 性能浪费

**解决方案：**
1. 完成真正的缓冲区交换
2. 添加脏区合并逻辑
3. 实现 vsync 机制

**相关文件：**
- [packages/native/src/render/frame.zig](packages/native/src/render/frame.zig)
- [packages/native/src/render.zig](packages/native/src/render.zig)

---

### 6. 全局状态管理问题

**问题描述：**
事件总线使用全局变量，不支持多实例。

**当前实现：**
```zig
var global_bus: EventBus = undefined;
var initialized: bool = false;
```

**问题：**
- 不支持多实例
- 难以测试
- 不是线程安全的

**解决方案：**
使用依赖注入模式：

```zig
pub fn createEventBus(allocator: Allocator) !*EventBus {
    const bus = try allocator.create(EventBus);
    bus.* = EventBus.init(allocator);
    return bus;
}

pub fn destroyEventBus(allocator: Allocator, bus: *EventBus) void {
    bus.deinit();
    allocator.destroy(bus);
}
```

**相关文件：**
- [packages/native/src/core/event_bus.zig](packages/native/src/core/event_bus.zig)
- [packages/lib/src/events/index.ts](packages/lib/src/events/index.ts)

---

## 💡 P2 - 性能优化（可以改进）

### 7. 事件队列效率优化

**当前问题：**
- 固定 256 bytes 槽位浪费空间
- 小事件也占用完整槽位
- 没有批量消费机制

**优化方向：**
1. 使用变长槽位或分级队列
2. 实现批量消费 API
3. 添加事件聚合机制

**预期收益：**
- 减少 50%+ 内存占用
- 提升批量处理性能

---

### 8. 脏区追踪完善

**当前问题：**
- 有脏区数据结构但未充分利用
- 可能每次都在重绘整个屏幕

**优化方向：**
1. 实现脏区标记 API
2. 只渲染变化区域
3. 添加脏区合并逻辑

**预期收益：**
- 减少 80%+ 渲染工作量
- 显著提升复杂 UI 性能

---

### 9. TypeScript 类型安全增强

**当前问题：**
大量使用 `any` 类型，失去类型检查

**解决方案：**
1. 定义严格的事件类型
2. 使用类型推导
3. 添加运行时验证

```typescript
// 之前
const json = JSON.parse(jsonString) as Record<string, any>;

// 之后
interface KeyEvent {
  type: 'keydown';
  key: string;
  ctrl: boolean;
}

function parseKeyEvent(buf: Uint8Array): KeyEvent {
  // 严格的解析逻辑
}
```

---

## 🔧 P3 - 工程改进

### 10. 添加测试覆盖

**当前状态：**
- 缺少集成测试
- 没有 FFI 边界测试
- 缺少性能基准测试

**改进计划：**
1. 添加单元测试（目标 80% 覆盖率）
2. 添加 FFI 集成测试
3. 添加性能基准测试
4. 添加内存泄漏检测

---

### 11. 文档完善

**缺失内容：**
- FFI 边界协议文档
- 事件类型定义
- 内存布局规范
- 贡献指南

---

### 12. 构建系统改进

**当前问题：**
- 没有增量构建
- 缺少 CI/CD
- 没有自动发布流程

---

## 实施建议

### 短期（1-2 周）
1. ✅ 修复事件系统内存布局问题
2. ✅ 修复 FFI 类型不匹配
3. ✅ 添加基础测试

### 中期（1-2 月）
4. ⏳ 实现二进制事件协议
5. ⏳ 完成内存管理 RAII
6. ⏳ 完善双缓冲渲染

### 长期（3-6 月）
7. 📅 性能优化
8. 📅 类型安全增强
9. 📅 文档和测试完善

---

## 贡献指南

如果你打算修复这些问题：

1. 先创建 issue 讨论方案
2. 创建分支：`fix/issue-number-description`
3. 添加测试覆盖新代码
4. 更新相关文档
5. 提交 PR 前运行 `bun run lint` 和 `bun run test`

---

## 相关文档

- [CLAUDE.md](./CLAUDE.md) - 项目架构和开发指南
- [README.md](./README.md) - 项目概述
- [packages/native/README.md](./packages/native/README.md) - Zig 层文档
- [packages/lib/README.md](./packages/lib/README.md) - TypeScript 层文档
