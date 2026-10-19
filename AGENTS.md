# Repository Guidelines

## 项目定位与当前状态

- npm 包名为 `zrender`，当前版本为 `6.1.0`，是供 Apache ECharts 使用的 TypeScript 二维图形库，采用 BSD-3-Clause 许可证。
- 已有能力包括 Canvas/SVG 绘制、图形分组与变换、裁剪、文本与图片、动画、命中检测和交互事件。SVG 后端提供 `renderToString()`，支持服务端输出。
- 虽然目录名为 `zrender-html-in-canvas`，本次检查未发现独立的 HTML 解析、DOM/CSS 布局或 HTML 转 Canvas 实现。不要将目录名视为已有能力；相关需求应先明确支持范围与接入方式。
- 截至 2026-10-19，CodeGraph 已初始化；本地尚无 `node_modules/` 和生成的 `lib/`。本次仅分析源码与配置，未验证构建或测试通过情况。

## 目录与核心架构

- `src/zrender.ts`：实例管理、渲染器选择、刷新调度与生命周期。
- `src/Storage.ts`：维护图形树，生成按 `zlevel/z/z2` 排序的显示列表。
- `src/Element.ts`、`src/graphic/`：元素、分组、路径、形状、文本和图片；`src/core/`、`src/contain/`：基础工具、几何计算与命中检测。
- `src/canvas/`：Canvas 分层、脏矩形与渐进绘制；`src/svg/`：SVG 虚拟节点生成、差异更新与字符串输出。另有 `src/svg-legacy/` 旧实现，修改时注意区分。
- `src/Handler.ts`、`src/dom/`：命中判断与 DOM 事件代理；`src/animation/`：动画调度。
- `index.ts` 指向 `src/all`，`index.js` 指向生成的 `lib/all.js`；公共导出还涉及 `src/export.ts` 与根目录类型入口。
- `test/ut/spec/` 为单测；`test/*.html` 为浏览器用例；`test/asset/`、`test/data/` 为素材与数据；`benchmark/` 为性能示例；`build/` 为构建脚本，`lib/`、`dist/` 为生成产物。

典型流程：实例接收元素 → Storage 更新显示列表 → Painter 绘制；交互由 DOM 代理传入 Handler，再完成命中判断与事件分发。修改共享元素行为时，同时检查 Canvas 与 SVG。

## 安装、开发与验证命令

CI 使用 Node.js 18，建议本地保持一致。运行 `npm ci` 安装锁定依赖；其 `prepare` 钩子会自动构建 `lib/`。

- `npm run build`：生成浏览器 bundle 与 ES 模块库。
- `npm run watch:bundle` / `npm run watch:lib`：分别监听并重建 bundle / 模块库。
- `npm test`：运行 Jest + ts-jest 单元测试。
- `npm test -- --runInBand core/matrix`：运行指定测试。
- `npm run lint`：使用 `src/.eslintrc.yaml` 检查 TypeScript。
- `npm run checktype`：仅检查类型，不生成文件。
- `npm run release`：生成压缩 bundle 与模块库，也是 CI 的构建检查。

项目没有应用开发服务器脚本。验证视觉效果时，先构建 bundle，再用本地静态 HTTP 服务打开对应 `test/*.html`。

## 编码与测试规范

新增代码文件不得超过 500 行（包含空行与注释）；超过 500 行时，必须按职责拆分为多个文件，保持模块边界清晰。此规则适用于手写源码、测试和脚本，不适用于自动生成产物或第三方库文件。现有文件暂不因行数超限而统一拆分。

使用四空格缩进、单引号和语句分号；代码行长度遵循 ESLint 的 120 字符限制，类型与类字段声明沿用周边风格。类和接口用 PascalCase，函数与变量用 camelCase，文件命名遵循所属模块。TypeScript 以 ES3 为编译目标，并启用 `noImplicitAny`、`noImplicitThis`；降级编译不会补齐运行时 API。优先修改 `src/`，通过构建更新产物。

单测放在对应子系统目录，命名为 `*.test.ts`。Jest 使用 Node 环境，目前未配置覆盖率阈值。行为修复应增加回归测试；绘制变化应补充或更新浏览器用例，必要时检查裁剪、变换、DPR、层级和渐进渲染。

## 提交与 Pull Request

历史中常见 `fix(scope): 描述`、`feat: 描述`、`test: 描述`、`chore: 描述`。提交前检查未提交改动与未推送提交，按当前会话要求纳入处理；跨功能模块的改动分次提交和推送。PR 说明问题、修改后的行为、关联 issue 和验证结果；视觉变化附截图或复现页面。运行适用的 lint、单测、类型检查和构建，并如实说明未执行的检查。

## Agent 与 CodeGraph 使用规则

根目录存在 `.codegraph/` 时，理解或定位代码必须先使用 `codegraph_explore`（传入当前仓库的 `projectPath`），或运行 `codegraph explore "符号或问题"`，然后按需使用文本搜索。索引返回的源码可直接作为阅读依据。若不存在 `.codegraph/`，跳过 CodeGraph，不擅自创建索引。

维护本文件时使用中文解释，保留命令、路径和 API 原名；区分源码已实现能力、计划需求与尚未验证的运行状态。
