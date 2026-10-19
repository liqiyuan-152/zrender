# Proposal

## Why

外部 Vue 或 React 应用需要在 zrender 场景中显示已有 HTML 组件，同时保留原组件的 props、响应式状态、Input 输入行为和业务回调。现有图形系统没有此承载能力，自行重建 CSS 排版和模拟组件事件成本高，也难以保留浏览器原生语义。

## What Changes

- 增加框架无关的 HTML 元素及稳定 DOM 挂载容器，外部通过 Portal、Teleport 或原生 DOM 挂载内容。
- Canvas 后端采用浏览器原生 HTML-in-Canvas，自动跟随可视快照更新；明确实验接口版本和能力检测。
- SVG 后端使用 foreignObject 承载同一组件，保留挂载节点身份。
- 增加与同一 zrender 实例中已有元素的自动布局绑定：内嵌 padding/fill、follow/screen 变换模式和自定义计算；跟随目标及祖先更新，并处理移除、释放和循环依赖。
- 保留组件的值、事件和生命周期归属；zrender 只负责场景几何、绘制调度和承载资源。
- 明确不支持环境、离屏/服务端、导出、层级、裁剪和弹层的边界，提供从 zrender 初始化开始的 React/Vue 示例。
- 本次不实现 UI 组件库、HTML/CSS 解析器、截图重建、DOM overlay 自动降级或自定义 React/Vue renderer。

## Capabilities

### New Capabilities

- `html-element-host`: 框架无关的挂载、状态与交互归属、尺寸、目标元素布局绑定和生命周期契约。
- `native-html-canvas`: 原生 Canvas HTML 绘制、自动更新、命中几何和能力限制。
- `svg-html-content`: SVG foreignObject 承载、稳定子树、场景同步和导出边界。

### Modified Capabilities

无；当前项目尚无已建立的 OpenSpec 能力规范。

## Impact

- 预计涉及 src/graphic/、src/dom/、src/canvas/、src/svg/ 和 src/export.ts；接口名和文件布局见 design.md。
- 核心运行时不增加 React、Vue、AntD、Element Plus 依赖。框架与 UI 库仅可用于隔离的演示/验证工程。
- Canvas 需要支持经过实测的原生实验 API；不承诺普通浏览器默认可用，也不静默切换 SVG 或 overlay。
- 不改变现有普通图元 API；新增能力必须验证普通 Canvas/SVG 场景无回归。
- 本变更是待实施的需求与任务，前述对话示例未运行验证，不构成已实现能力。
