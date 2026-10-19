# Framework-Agnostic HTML Element in zrender

## 文档总览

本目录包含为 zrender 添加框架无关 HTML 元素支持的完整 OpenSpec 文档。

---

## 📁 文档结构

### 核心文档
- **[proposal.md](proposal.md)** - 需求动机、变更内容、能力定义和影响评估
- **[design.md](design.md)** - 设计背景、目标、决策、文件规划和风险
- **[tasks.md](tasks.md)** - 按里程碑组织的 47 个实施任务及验收标准
- **[specs/](specs/)** - 三个核心能力的规范定义
  - [html-element-host/spec.md](specs/html-element-host/spec.md) - 框架无关挂载和布局绑定
  - [native-html-canvas/spec.md](specs/native-html-canvas/spec.md) - 原生 Canvas HTML 绘制
  - [svg-html-content/spec.md](specs/svg-html-content/spec.md) - SVG foreignObject 承载

### 辅助文档
- **[docs-draft-api-reference.md](docs-draft-api-reference.md)** - API 参考草案（能力检测、错误码、布局 API）
- **[REVIEW_UPDATES.md](REVIEW_UPDATES.md)** - 第一轮审核修复记录
- **[REVIEW_ROUND2.md](REVIEW_ROUND2.md)** - 第二轮深度审核修复记录
- **[AUDIT_CHECKLIST.md](AUDIT_CHECKLIST.md)** - 系统性审核检查清单
- **[README.md](README.md)** - 本文档（导航和快速索引）

---

## 🎯 能力概览

### html-element-host（框架无关挂载）
- 提供稳定的 HTML 挂载容器，支持 React Portal、Vue Teleport 和原生 DOM
- 保留组件的 props、状态、事件和生命周期归属
- 支持绑定到已有 zrender 元素，自动计算位置和尺寸
- 两种坐标模式：follow（跟随变换）和 screen（场景对齐）
- 处理隐藏、移除、循环依赖和交互暂停/恢复

### native-html-canvas（Canvas 原生绘制）
- 使用浏览器原生 HTML-in-Canvas 实验 API
- 自动快照更新和命中几何同步
- 明确的能力检测和版本管理
- 支持 DPR、变换和多个 HTML 元素交错绘制

### svg-html-content（SVG 承载）
- 使用 foreignObject 承载 HTML 组件
- 保留框架管理的 DOM 子树身份
- 不依赖 Canvas 实验 API
- 自动同步尺寸、变换和可见性

---

## 🗺️ 实施路线图

### M1: 能力验证与公共承载（Foundation）
**任务：** 1.1-1.4, 2.1-2.4  
**目标：** 浏览器原型验证、公共 API 类型、错误码定义  
**验收：** 真实浏览器可运行，createHTMLHost 无框架依赖

### M2: 布局绑定系统（Layout Binding）
**任务：** 2.5-2.15  
**目标：** follow/screen 模式、循环检测、交互暂停  
**验收：** 布局单测通过，隐藏状态真值表验证完成

### M3: Canvas 原生后端（Canvas Backend）
**任务：** 3.1-3.11  
**目标：** Canvas 绘制、快照版本管理、性能基准  
**验收：** test/html-native.html 运行正常，性能达标

### M4: SVG 后端（SVG Backend）
**任务：** 4.1-4.6  
**目标：** foreignObject 实现、patch 子树保护  
**验收：** test/html-svg.html 运行正常，无浏览器 API 依赖

### M5: 框架集成与示例（Framework Integration）
**任务：** 5.1-5.7  
**目标：** React/Vue 隔离示例、无障碍验证  
**验收：** 框架示例可独立运行，交互测试通过

### M6: 最终验收（Final Validation）
**任务：** 6.1-6.5  
**目标：** 完整测试、内存验证、依赖检查  
**验收：** 所有检查通过，支持矩阵完整

---

## 🔍 快速索引

### 我想了解...

#### 为什么需要这个功能？
→ [proposal.md § Why](proposal.md#why)

#### 具体要添加什么能力？
→ [proposal.md § Capabilities](proposal.md#capabilities)

#### 设计的核心决策是什么？
→ [design.md § Decisions](design.md#decisions)

#### 如何使用布局绑定 API？
→ [design.md § 已有元素的布局绑定](design.md#6-已有元素的布局绑定)  
→ [docs-draft-api-reference.md § 布局绑定 API](docs-draft-api-reference.md#布局绑定-api)

#### follow 和 screen 模式有什么区别？
→ [design.md § follow/screen 计算流程](design.md#6-已有元素的布局绑定)  
→ [docs-draft-api-reference.md § 坐标模式对比](docs-draft-api-reference.md#坐标模式对比)

#### 错误码和诊断消息格式？
→ [docs-draft-api-reference.md § 错误码定义](docs-draft-api-reference.md#错误码定义)

#### 实验 API 的版本管理策略？
→ [design.md § 实验 API 版本管理策略](design.md#context)

#### 导出包含 HTML 的场景会怎样？
→ [design.md § 能力与导出策略](design.md#5-能力与导出策略)

#### 性能基准的要求是什么？
→ [tasks.md § 3.11](tasks.md#3-canvas-原生后端)

#### 无障碍性如何验证？
→ [tasks.md § 5.3](tasks.md#5-框架交互与完整示例)

#### 有哪些不支持的场景？
→ [proposal.md § What Changes - 明确不支持](proposal.md#what-changes)  
→ [design.md § Non-Goals](design.md#goals--non-goals)

---

## 📋 关键术语

| 术语 | 定义 | 出处 |
|-----|------|------|
| **宿主容器 (host container)** | 系统提供的稳定 HTML 挂载节点 | design.md § Context |
| **场景坐标系 (scene coordinates)** | zrender 内部逻辑坐标空间 | design.md § Context |
| **目标元素 (target element)** | 布局绑定配置中指定的 zrender 图形元素 | design.md § Context |
| **绑定 (binding)** | 宿主与目标元素的布局依赖关系 | design.md § Context |
| **跨层迁移 (layer migration)** | HTML 元素运行时改变所属 Canvas 层级 | design.md § Context |
| **follow 模式** | 容器跟随目标完整变换（包括旋转） | design.md § 6 |
| **screen 模式** | 容器在场景坐标系保持正向（不旋转） | design.md § 6 |

---

## ✅ 审核状态

### 第一轮审核（2026-01-XX）
- **范围：** P0/P1 优先级问题
- **修复：** 15 项（版本管理、错误格式、坐标详解等）
- **状态：** ✅ 已完成

### 第二轮审核（2026-01-XX）
- **范围：** API 一致性、术语统一、跨文档引用
- **修复：** 8 项（参数名统一、导出策略精确化等）
- **状态：** ✅ 已完成

### 团队评审
- **状态：** ⬜ 待进行
- **重点：** 实验 API 策略、性能阈值、M1 验收标准

详见 [AUDIT_CHECKLIST.md](AUDIT_CHECKLIST.md)

---

## 🚀 下一步行动

### 开始 M1 之前
1. ✅ 完成 OpenSpec 文档审核
2. ⬜ 团队评审设计决策
3. ⬜ 明确 M1 关键任务的可测量验收标准
4. ⬜ 确认实验 API 版本映射表格式

### M1 开始
1. ⬜ 任务 1.1：CodeGraph 核查现有代码
2. ⬜ 任务 1.2：建立浏览器原型和版本映射表
3. ⬜ 任务 1.3：验证原生 Input 交互和 inert 支持
4. ⬜ 任务 1.4：创建 docs/html-content.md 支持矩阵

---

## 📞 联系与反馈

如发现文档问题或需要澄清，请：
1. 检查 [AUDIT_CHECKLIST.md](AUDIT_CHECKLIST.md) 是否已记录
2. 参考 [REVIEW_ROUND2.md](REVIEW_ROUND2.md) 的"未修复但已记录的观察"
3. 提交至项目 issue 或与设计团队联系

---

**文档版本：** v2.0（第二轮审核后）  
**最后更新：** 2026-01-XX  
**状态：** ✅ 已就绪，可开始 M1 实施

