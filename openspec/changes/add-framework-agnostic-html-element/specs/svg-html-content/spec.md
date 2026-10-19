# Spec Delta

## Purpose

在浏览器 SVG 渲染模式中以 foreignObject 承载真实 HTML 组件，复用框架无关的挂载和业务事件契约，确保 SVG 场景更新不破坏组件实例，并对无 DOM 环境和静态导出的行为作出清晰约束。

## ADDED Requirements

### Requirement: SVG HTML container
系统 SHALL 在 SVG 模式下提供位于 foreignObject 内的 HTML 命名空间挂载容器，支持与 Canvas 模式一致的外部挂载契约，且不依赖原生 Canvas 实验能力。

#### Scenario: SVG initialization without native canvas API
- **WHEN** 调用方在支持 foreignObject 且满足公共宿主级聚焦阻断要求的浏览器中选择 SVG 渲染器并挂载 HTML 组件
- **THEN** 组件可以显示并原生交互，即使浏览器没有原生 HTML-in-Canvas 接口

### Requirement: Stable framework-owned subtree
系统 MUST 在 SVG 差异更新中保留 HTML 挂载容器和外部框架管理的后代子树，只更新自身负责的 foreignObject 几何与场景属性。

#### Scenario: Sibling graphics update while editing
- **WHEN** 用户正在输入框中进行组合输入，同时相邻 SVG 图形刷新
- **THEN** 输入 DOM 身份、焦点、选区和组件状态保持不变，不重新挂载组件

### Requirement: Automatic content and geometry updates
系统 SHALL 让组件 DOM 更新直接由浏览器显示，无需手动刷新；内容尺寸变化时同步承载尺寸，并按场景排序、二维变换、可见性和支持的裁剪更新 foreignObject。

#### Scenario: External props and content height change
- **WHEN** 外部组件更新值、禁用状态或内容高度
- **THEN** SVG 中的显示和交互自动更新，必要时调整承载边界

#### Scenario: SVG ordering and transform
- **WHEN** HTML 元素位于两个普通 SVG 图元之间并随父组变换
- **THEN** foreignObject 遵循显示顺序，HTML 位置和浏览器命中区域跟随变换

### Requirement: SSR and serialization boundary
系统 MUST 明确区分交互 DOM 与静态 SVG。首版在无 DOM 环境创建交互 HTML 承载，或调用静态导出接口处理含 HTML 的场景时 SHALL 返回明确的不支持错误，不得声称可序列化组件实例、回调或完整样式。普通 SVG 的 renderToString 行为 SHALL 保持不变。

#### Scenario: Server-side rendering or static export
- **WHEN** 在无 DOM 环境创建 HTML 承载，或对含 HTML 的 SVG 场景调用 renderToString 等静态导出接口
- **THEN** 系统返回明确限制诊断，不静默丢失组件，不伪造可恢复的事件回调
