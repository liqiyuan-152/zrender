# M1 验证记录（2026-10-19）

## 验收结论

**M1 能力验证与公共承载完成。** tasks.md 中 1.1–1.4、2.1–2.4（含 2.1b）已勾选。公共 createHTMLHost 和 HTML 场景元素已接入正常 Canvas 显示列表，不是 rendered 回调追加的覆盖层。M2–M6 继续保留未完成项；提前实现的状态、诊断、Canvas 基础不代表完整后端验收。

原生自动遮挡命中失败仍成立。按设计允许的明确拒绝策略，在更新排序列表后、绘制与提交几何前拒绝前景 paint AABB 重叠，暂停宿主并撤销原生命中。移开、隐藏或排序到背景后恢复。保守 AABB 可能拒绝透明区域；未宣称修复浏览器原生遮挡。

## 环境与版本映射

Windows，Google Chrome **155.0.8059.85**；默认 profile 的 enabled_labs_experiments 为 canvas-draw-element@1。浏览器可执行文件和 UA Client Hints fullVersionList 已核对，见 [配置](m1-browser-config.json)。没有显式 user-data-dir 或 feature 参数的记录。

| 版本/特征 | 实测结果 | 当前准入 |
| --- | --- | --- |
| Windows Google Chrome 155.0.8059.85 / layoutsubtree | drawElementImage(element, dx, dy) 返回 DOMMatrix；paint、updateElementGeometry、clearElementGeometry 可用 | 精确版本异步校验及独立探测通过后准入 |
| 同版本 content=drawable 分支 | 收到 paint，但绘制报错要求 layoutsubtree | 拒绝 |
| 其他版本、Firefox/Safari/Edge | 未运行 | 拒绝，不从方法存在推断兼容 |
| 缺 DOM、原生 inert、实验方法或版本信息 | 不具备已验证前提 | CAPABILITY_MISSING |

本机 Node **22.22.2**，不同于项目建议 Node 18；沿用已有依赖，未改锁文件。核心运行时依赖仅 tslib@2.3.0。

## M1 任务与实际证据

| 任务 | 实现与验收 |
| --- | --- |
| 1.1 | CodeGraph 核查 Storage、Painter、brush、事件、SVG patch/SSR 调用链；design.md 记录接入点及保留工作区改动 |
| 1.2 | capabilities/types/profile/native 封装初筛、版本和探测；真实原型及配置记录接口签名、首次 paint 和合法 Canvas 所属 |
| 1.3 | 可信点击、输入、change/blur、几何、inert 调查；保留自动遮挡失败与 IME 异常，并在公共入口验证重叠拒绝/恢复 |
| 1.4 | docs/html-content.md 固定精确版本和支持边界，不支持路径有明确诊断 |
| 2.1 / 2.1b | HTML、createHTMLHost、公共类型与统一诊断可导入；无 DOM ESM 安全，SVG 不支持 HTML 时明确拒绝；无框架依赖 |
| 2.2 | 稳定容器、显式/自动高度、ResizeObserver 清理与代次隔离；单测与真实 DOM 检查 |
| 2.3 | 同实例移出/重加、隐藏、clear、幂等释放、异步取消、禁止复活；单测与公共浏览器检查 |
| 2.4 | 原生公共用例与文档明确 element/子树归属；应用卸载 → host.dispose → zr.dispose |

公共 API 返回 element、sceneElement、ready、state、updateLayout、dispose。工厂创建合法 Canvas 子树，HTML 使用普通显示顺序；SVG HTML 尚未实现。直接 new HTML 不提供后端挂载。普通 add 失败会回滚 root，zr.dispose 也释放已经移出的注册宿主。

生命周期通过 inert、失焦和清除几何暂停交互，恢复不抢焦点。隐藏或尺寸改变会废弃旧快照，恢复等待新 paint。独立非交互探测使空业务容器也能 ready。错误回调隔离、连续故障去重和重入释放已有基础测试，完整 M2 恢复矩阵尚未验收。

旧接口快照已包含 backing pixels。直接使用上下文 DPR 会重复放大，单纯修正返回矩阵不能修正像素；当前绘制先抵消一次 DPR 缩放、保留物理平移，恢复上下文后用返回矩阵提交 CSS/命中几何。真实绿色像素与 Input 边界在下述两组配置通过；未泛化到所有父变换。

## 公共入口真实浏览器结果

[最新公共证据](m1-public-host-evidence.json) 来自 release 产物，test/html-host-foundation.html 只使用公开 zrender API。

- 直接 Canvas / DPR 1：25 项通过。
- 普通容器初始化 / DPR 2：25 项通过。
- 包括像素、CSS 几何、自动高度、显式尺寸、隐藏/inert、恢复不聚焦、移出/重加、重叠拒绝/移动恢复/背景允许、含 ignore 的导出拒绝、clear 后身份保持、释放后不复活、普通蓝色图元导出恢复、空宿主 ready、zr.dispose 清理。
- 每组唯一 HTML_UNSUPPORTED_SCENE 是预期的前景重叠诊断，无非预期错误。自动生命周期检查未合成 input/change。
- 最新实际点击、输入“-public”并 Tab：值 application-owned-public，可信 focus、7 次 input、1 次 change、blur，宿主 active，无诊断。

仅上述两种初始化/DPR 组合经过公共入口验收，未声称全部四种组合或完整变换矩阵都通过。

## 历史能力证据与已知失败

| 证据 | 内容与结论 |
| --- | --- |
| [原始能力记录](m1-browser-evidence.json)、[遮挡截图](m1-occlusion.png) | 能绘制、输入；红色 Canvas 图元覆盖后仍命中 Input，自动遮挡失败 |
| [后续原生调查](m1-native-followup-evidence.json) | content-only 绘制失败；inert/Tab/动态嵌套控件的独立调查 |
| [真实 IME](m1-ime-evidence.json) | 用户输入“测试中文”，有 compositionstart/update/end 和可信 input/change/blur；compositionend isTrusted=false，候选窗未单独确认 |
| [独立生命周期](m1-lifecycle-evidence.json) | 11 项真实 DOM 检查；不是公共 Painter 证据 |
| [场景拒绝原型](m1-scene-admission-evidence.json) | 10 项 Storage/Rect/brush 原型检查及可信键盘阻断；与最新公共证据分别保留 |

未使用合成事件掩盖 IME 异常。用户反馈“已输入”不能证明候选窗或 compositionend 可信性。IME 中暂停、selection、框架回调和屏幕阅读器均留待后续验收。

## 工程验证

- npm run checktype：通过。
- npm run lint：通过。
- npm test -- --runInBand：16 suites、104 tests 通过。实验 API mock 单测不是浏览器兼容证据。
- npm run release：通过，生成 bundle/min bundle 和 lib。
- Node 无 DOM ESM 导入、公共导出、普通 SVG SSR 在拒绝 HTML 创建前后保持一致：通过；比较时仅归一化自动生成 CSS class 序号，root 数量不变。
- 源码、生成 lib 与 bundle 未发现 React/Vue/UI 库导入；npm ls --omit=dev --depth=0 仅 tslib。
- 新增手写源码/测试/脚本均小于 500 行。源码最大 lifecycle.ts 294 行；测试最大 lifecycle.test.ts 275 行；浏览器脚本最大 html-capability.js 179 行。
- openspec validate add-framework-agnostic-html-element --strict 与 git -c core.whitespace=cr-at-eol diff --check：均通过。

## 支持边界与后续

M1 拒绝多层/迁移、裁剪、hover、增量、脏矩形、motionBlur、自定义/虚拟层、非 source-over、自定义 brush 回调和宿主边界样式覆盖。含 HTML 的 zrender Canvas 导出（含 ignore）明确拒绝，原始 Canvas 导出不受此入口控制。宿主 containment 限定绘制边界，不保证 body/top-layer 弹层兼容。

M2 布局绑定与完整交互恢复、M3 快照版本提交/父变换/连续重排内部命中/性能、M4 SVG、M5 React/Vue 与 IME 暂停、M6 全量与内存验证均未完成。LayoutVersion 仅类型，不能当作 sequence/committedAt/snapshotReady 已实现。

开始时已有 Painter resize 箭头回调与 dist 修改已保留；.codegraph/、AGENTS.md、openspec/、pnpm-lock.yaml 等既有未跟踪内容未删除。未提交或推送，未归档变更。
