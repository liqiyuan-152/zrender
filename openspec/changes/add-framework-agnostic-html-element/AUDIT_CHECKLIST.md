# OpenSpec 审核检查清单

本文档提供 OpenSpec 文档的系统性审核检查清单，用于后续评审和质量保证。

---

## 1. 结构完整性检查

- [x] **proposal.md** 包含 Why / What Changes / Capabilities / Impact
- [x] **design.md** 包含 Context / Goals / Decisions / Risks / Migration Plan
- [x] **tasks.md** 包含按里程碑组织的任务列表
- [x] **specs/** 目录包含所有 capability 的 spec.md
  - [x] html-element-host/spec.md
  - [x] native-html-canvas/spec.md
  - [x] svg-html-content/spec.md

---

## 2. 术语一致性检查

### 核心术语
- [x] "宿主容器 (host container)" 统一使用，无"挂载容器""承载容器"混用
- [x] "场景坐标系 (scene coordinates)" 统一使用
- [x] "目标元素 (target element)" 统一使用
- [x] "绑定 (binding)" 统一使用
- [x] "跨层迁移 (layer migration)" 已定义

### API 参数
- [x] 布局模式使用 `mode: 'follow' | 'screen'`（不是 `transform`）
- [x] 错误码使用 `HTMLHostErrorCode` 枚举
- [x] 错误类型使用 `HTMLHostError`

### 特殊术语说明
- [x] `screen` 模式明确说明不是"物理屏幕坐标"
- [x] "场景坐标系"与"画布逻辑坐标"的区别已说明

---

## 3. 设计决策一致性检查

### 能力检测
- [x] design.md 说明版本管理策略
- [x] tasks.md 1.2 要求建立版本-特征映射表
- [x] docs-draft 包含能力检测示例

### 错误处理
- [x] design.md 定义错误码和诊断格式
- [x] tasks.md 2.1b 创建 diagnostics.ts
- [x] docs-draft 包含错误处理示例

### 导出策略
- [x] design.md 明确 Canvas 导出入口：src/canvas/Painter.ts getRenderedCanvas
- [x] design.md 明确 SVG 导出入口：src/svg/Painter.ts renderToString
- [x] design.md 说明 src/export.ts 不是导出执行入口
- [x] tasks.md 3.7 与 design.md 一致
- [x] tasks.md 4.4 与 design.md 一致

### 交互暂停
- [x] design.md 明确首版仅使用经验证的原生 inert，缺失能力拒绝创建
- [x] tasks.md 2.13 要求原生 inert 验证及缺失时拒绝，不修改框架子节点
- [x] Canvas 和 SVG 共享聚焦阻断实现

### 布局绑定
- [x] design.md 提供 follow 模式 5 步计算流程
- [x] design.md 提供 screen 模式 5 步计算流程
- [x] tasks.md 2.6 包含具体测试用例（父组缩放 2× 旋转 45°）
- [x] docs-draft 包含两种模式的对比表和示例

---

## 4. 任务完整性检查

### 任务与文件映射
- [x] tasks.md 包含"任务与文件映射总览"表格
- [x] 每个任务标注 **[创建: xxx]** 或 **[修改: xxx]**
- [x] 文件规划表与任务映射表一致

### 里程碑划分
- [x] tasks.md 定义 M1-M6 六个里程碑
- [x] 每个里程碑包含任务范围
- [x] 每个里程碑包含交付物
- [x] 每个里程碑包含验收标准

### 特殊要求
- [x] 每个新建文件不超过 500 行限制已说明
- [x] 浏览器验证优先于 mock 测试已强调
- [x] 框架示例隔离依赖已说明（test/html-frameworks/ 结构）

---

## 5. 规范一致性检查

### Requirement 一致性
逐个检查 spec.md 中的 Requirement 是否在 design.md 和 tasks.md 中有对应实现计划：

#### html-element-host/spec.md
- [x] Framework-independent mounting → design.md 决策 1, tasks 2.1
- [x] Preserve component state → design.md 决策 4, tasks 2.2-2.3
- [x] Scene geometry contract → design.md 决策 6, tasks 2.5-2.7
- [x] Lifecycle ownership → design.md 决策 1+4, tasks 2.3-2.4
- [x] Target element layout binding → design.md 决策 6, tasks 2.5-2.10
- [x] Binding coordinate modes → design.md 决策 6, tasks 2.6
- [x] Custom binding computation → design.md 决策 6, tasks 2.7
- [x] Automatic binding invalidation → design.md 决策 6, tasks 2.8
- [x] Geometry of hidden binding targets → design.md 决策 6, tasks 2.12
- [x] Focus during suspension → design.md 决策 4, tasks 2.13
- [x] Binding lifecycle → design.md 决策 6, tasks 2.9
- [x] Reject cyclic dependencies → design.md 决策 6, tasks 2.10

#### native-html-canvas/spec.md
- [x] Explicit capability detection → design.md 决策 2, tasks 1.2, 3.1
- [x] Native DOM rendering → design.md 决策 2, tasks 3.2-3.3
- [x] Automatic visual synchronization → design.md 决策 2, tasks 3.4
- [x] Native hit geometry → design.md 决策 2, tasks 3.3, 3.6
- [x] Unsupported scene and export → design.md 决策 2+5, tasks 3.7

#### svg-html-content/spec.md
- [x] SVG HTML container → design.md 决策 3, tasks 4.1
- [x] Stable framework-owned subtree → design.md 决策 3, tasks 4.2
- [x] Automatic content and geometry → design.md 决策 3, tasks 4.3
- [x] SSR and serialization boundary → design.md 决策 5, tasks 4.4

---

## 6. 文档质量检查

### 示例代码
- [x] design.md 的 API 示例使用统一参数名
- [x] docs-draft 的示例代码与 design.md 一致
- [x] 示例代码语法正确（TypeScript）
- [x] 示例代码包含必要注释

### 清晰度
- [x] 每个决策有明确的理由
- [x] 不支持的能力有明确说明
- [x] 风险有对应的缓解措施
- [x] 术语定义无歧义

### 可执行性
- [x] 任务描述足够具体
- [x] 验收标准可测量（大部分；部分待 M1 前明确）
- [x] 文件路径明确
- [x] 依赖关系清晰

---

## 7. 跨文档引用检查

### design.md → tasks.md
- [x] 决策 1 → 任务 2.1-2.4
- [x] 决策 2 → 任务 3.1-3.10
- [x] 决策 3 → 任务 4.1-4.6
- [x] 决策 4 → 任务 2.13, 5.7
- [x] 决策 5 → 任务 3.7, 4.4
- [x] 决策 6 → 任务 2.5-2.12

### design.md → specs/
- [x] 文件规划表中的文件与 spec 要求一致
- [x] 导出策略与 spec 的 export boundary 一致
- [x] 能力检测策略与 spec 的 capability detection 一致

### tasks.md → design.md
- [x] 每个任务可追溯到设计决策或风险
- [x] 文件创建/修改与文件规划表一致
- [x] 里程碑交付物与设计目标一致

---

## 8. 遗漏检查

### 常见遗漏项
- [x] 是否说明了 DPR 的处理方式（design.md 决策 2, tasks 3.3）
- [x] 是否说明了多层 Canvas 的处理（design.md 决策 2）
- [x] 是否说明了事件冲突的处理（design.md 决策 4, tasks 5.4）
- [x] 是否说明了弹层的限制（design.md 决策 5）
- [x] 是否说明了字体和 CSS 变量继承（design.md 决策 5, tasks 5.5）
- [x] 是否说明了组件卸载顺序（design.md 决策 4, tasks 2.4）
- [x] 是否说明了内存泄漏检查（tasks 6.5）
- [x] 是否说明了性能基准（tasks 3.11）
- [x] 是否说明了无障碍性（tasks 5.3）

### 边界条件
- [x] 零宽高元素的处理（design.md 决策 6, tasks 2.5）
- [x] 循环依赖的检测（design.md 决策 6, tasks 2.10）
- [x] 跨实例目标的拒绝（design.md 决策 6）
- [x] 首次快照等待（design.md 决策 2, tasks 3.2）
- [x] 旧快照覆盖新提交的防范（design.md 决策 2, tasks 3.10）

---

## 9. 待 M1 前明确的事项

### 可测量的验收标准
- [ ] 任务 2.4: "通过用例"的具体标准
- [ ] 任务 3.8: "运行正常"的定义
- [ ] 任务 4.5: "记录浏览器结果"的格式

### 术语精确化
- [ ] "世界空间"是否需要正式定义
- [ ] "累计变换矩阵"与 Transformable API 的对应关系

### 实施细节
- [ ] CodeGraph 查询的具体命令（任务 1.1）
- [ ] 浏览器版本映射表的格式（任务 1.2）

---

## 10. 最终审核签署

### 第一轮审核（基础问题修复）
- **审核日期：** 2026-01-XX
- **审核范围：** P0 和 P1 优先级问题
- **修复数量：** 15 项
- **状态：** ✅ 已完成

### 第二轮审核（深度一致性检查）
- **审核日期：** 2026-01-XX
- **审核范围：** API 一致性、术语统一、跨文档引用
- **修复数量：** 8 项
- **状态：** ✅ 已完成

### 团队评审（待进行）
- **计划日期：** TBD
- **评审人员：** TBD
- **评审重点：** 实验 API 策略、性能基准阈值、M1 验收标准
- **状态：** ⬜ 待进行

---

## 审核结论

**OpenSpec 文档质量评级：✅ 可以开始实施**

- 结构完整性：✅ 100%
- 术语一致性：✅ 100%
- 设计决策一致性：✅ 100%
- 任务完整性：✅ 100%
- 规范一致性：✅ 100%
- 文档质量：✅ 95%（部分验收标准待明确）
- 跨文档引用：✅ 100%
- 遗漏检查：✅ 100%

**建议行动：**
1. 进行团队评审，重点确认实验 API 策略和性能阈值
2. 在 M1 开始前明确"待明确事项"列表中的 3-5 个关键验收标准
3. 开始任务 1.1（CodeGraph 核查）

---

**本检查清单版本：** v2.0（第二轮审核后）  
**最后更新：** 2026-01-XX  
**维护者：** OpenSpec 审核团队

