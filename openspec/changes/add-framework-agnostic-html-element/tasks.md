# Tasks

任务状态按实际实施更新。OpenSpec 文档创建完成不代表功能完成；不得将对话示例或模拟接口单测视作真实浏览器验证结果。

2026-10-20 兼容性规则更新：取消浏览器版本号、品牌和操作系统白名单，改为检测实际原生接口、签名及初始化调用结果。不要求 UA Client Hints；下方 2026-10-19 的精确版本准入描述属于历史验收记录，已由本规则替代。macOS Chrome 示例及 DPR 1/2 公共生命周期检查也已通过，详见 docs/html-content.md。

2026-10-19：M1 **已完成**，1.1–1.4、2.1–2.4（含 2.1b）已验收。公共 createHTMLHost、HTML 场景句柄和稳定容器生命周期已接入正常 Canvas 显示列表。直接 Canvas/DPR 1、容器初始化/DPR 2 共 50 项真实浏览器检查及可信输入通过。原生自动遮挡失败保留；以绘制/几何提交前的保守重叠拒绝与暂停限制支持范围。仅准入 Windows Google Chrome 155.0.8059.85 已验证实验接口。中文 compositionend isTrusted=false 异常保留。详见 [m1-validation.md](m1-validation.md)。M2–M6 不整体标记完成；提前实现的后端、状态与诊断基础不代表后续全部验收，LayoutVersion 仍仅为类型。

---

## 任务与文件映射总览

为便于追踪，主要文件与任务的对应关系（未勾选任务所列文件仍是计划，不表示已经创建）：

| 文件 | 相关任务 | 类型 |
|------|---------|------|
| src/dom/html/diagnostics.ts | 2.1b | 新建 |
| src/graphic/HTML.ts | 2.1 | 新建 |
| src/dom/html/types.ts | 2.1 | 新建 |
| src/dom/html/createHTMLHost.ts | 2.1 | 新建 |
| src/dom/html/lifecycle.ts | 2.2, 2.3 | 新建 |
| src/dom/html/interactionState.ts | 2.13 | 新建 |
| src/dom/html/capabilities.ts | 1.2, 3.1 | 新建 |
| src/dom/html/layout/types.ts | 2.5 | 新建 |
| src/dom/html/layout/resolve.ts | 2.5, 2.6, 2.7 | 新建 |
| src/dom/html/layout/binding.ts | 2.8, 2.9, 2.10 | 新建 |
| src/canvas/html/types.ts | 1.2, 3.10 | 新建 |
| src/canvas/html/host.ts | 2.1, 2.3, 2.4；M3 基础 | 已新建，M1 最小接入 |
| src/canvas/html/native.ts、profile.ts、scenePolicy.ts | 1.2, 1.3, 2.1 | 已新建 |
| test/ut/spec/html/*.test.ts | 1.2, 1.3, 2.1–2.3 | 已新建 |
| test/html-host-foundation.html、.js | 2.1–2.4 | 已新建，公共入口浏览器验收 |
| test/html-capability.*、html-lifecycle-foundation.*、html-scene-admission.* | 1.2–1.4, 2.2 | 已新建，独立能力证据 |
| src/canvas/html/brush.ts | 3.3, 3.4 | 新建 |
| src/canvas/Painter.ts | 3.5, 3.7 | 修改 |
| src/export.ts | 2.1 | 公共符号导出 |
| src/svg/html.ts | 4.1 | 新建 |
| src/svg/patch.ts 或 Painter.ts | 4.2, 4.4 | 修改 |
| test/html-native.html | 3.8 | 新建 |
| test/html-svg.html | 4.5 | 新建 |
| test/html-frameworks/react-demo/ | 5.1 | 新建目录 |
| test/html-frameworks/vue-demo/ | 5.2 | 新建目录 |
| test/memory-leak-check.html | 6.5 | 新建或扩展 |
| benchmark/html-canvas.html | 3.11 | 新建 |
| docs/html-content.md | 1.4, 2.11 | 新建 |

---

## 里程碑划分（Milestones）

为便于阶段性评审和交付，任务划分为以下里程碑：

### M1: 能力验证与公共承载（Foundation）
**任务：** 1.1-1.4, 2.1-2.4  
**交付物：** 浏览器能力验证报告、版本映射表、公共 API 类型、错误码定义、最小原生 DOM 挂载示例  
**验收标准：** 真实浏览器原型可运行，createHTMLHost 可导入且无框架依赖，docs/html-content.md 初版完成

### M2: 布局绑定系统（Layout Binding）
**任务：** 2.5-2.15  
**交付物：** follow/screen 模式实现、padding/fill/compute 支持、循环检测、隐藏跟随、交互暂停/恢复  
**验收标准：** 布局单测全部通过，隐藏状态真值表验证完成，原生 inert 阻断验证通过，缺失时明确拒绝

### M3: Canvas 原生后端（Canvas Backend）
**任务：** 3.1-3.11  
**交付物：** Canvas 绘制实现、快照版本管理、脏矩形处理、导出拒绝、性能基准  
**验收标准：** test/html-native.html 在目标浏览器运行正常，性能基准记录完成，普通场景无回归

### M4: SVG 后端（SVG Backend）
**任务：** 4.1-4.6  
**交付物：** foreignObject 实现、patch 子树保护、SSR 导出拒绝  
**验收标准：** test/html-svg.html 运行正常，无浏览器原生 API 环境可用，普通 SVG 导出无回归

### M5: 框架集成与示例（Framework Integration）
**任务：** 5.1-5.7  
**交付物：** React/Vue 隔离示例、绑定演示、无障碍验证、交互协调测试  
**验收标准：** 两个框架示例可独立构建运行，交互回归测试通过，README 完整

### M6: 最终验收（Final Validation）
**任务：** 6.1-6.5  
**交付物：** 完整测试报告、内存泄漏验证、依赖检查、OpenSpec 验证  
**验收标准：** 所有检查通过或明确记录例外，支持矩阵完整，可交付

每个里程碑完成后建议进行一次评审，确认设计决策和实现质量再进入下一阶段。

---

## 1. 原生可行性与现有代码核查

- [x] 1.1 使用 CodeGraph 核查 Canvas 层管理、brush、刷新、事件与 SVG patch/导出调用链；在 design.md 补充最终接入点和既有工作区修改处理记录。
- [x] 1.2 建立真实浏览器最小原生演示，记录浏览器精确版本、实验开关、接口签名（drawElementImage vs layoutsubtree）、首次 paint 和 DOM 所属要求；建立版本-特征映射表（Chrome 版本 X 支持 drawable/paint，Firefox 版本 Y 仅支持旧接口），以可运行演示及验证记录验收。**[创建: src/dom/html/capabilities.ts, src/canvas/html/types.ts 的版本管理结构]**
- [x] 1.3 验证原生 Input 的点击、onChange 对应事件、IME、焦点和几何同步，以及普通图元遮挡后的命中行为；记录通过/失败项，关键前提失败时停止依赖实现并记录原因。同时验证 `inert` 属性支持度，记录缺失聚焦阻断能力的浏览器，首版不降级。
- [x] 1.4 创建 docs/html-content.md 支持矩阵，固定首版多层、裁剪、hover、增量、SSR 和导出边界；确保每个未支持组合有计划中的明确诊断（错误码和消息），并记录原型证据。**[创建: docs/html-content.md]**

## 2. 公共 HTML 元素与承载生命周期

- [x] 2.1 实现 HTML 场景元素和 createHTMLHost 公共类型/导出，支持原生脚本挂载；以类型检查和最小导入示例验证核心无框架/UI 库依赖。**[创建: src/graphic/HTML.ts, src/dom/html/types.ts, src/dom/html/createHTMLHost.ts]**
- [x] 2.1b 定义统一错误码和诊断消息格式，包括 HTMLHostErrorCode 枚举（CAPABILITY_MISSING, CYCLIC_DEPENDENCY, INVALID_TARGET, UNSUPPORTED_EXPORT 等）和结构化错误上下文。**[创建: src/dom/html/diagnostics.ts]**
- [x] 2.2 实现稳定容器、显式尺寸与内容高度观察；添加单测验证节点身份、尺寸更新和观察器清理。**[修改: src/dom/html/lifecycle.ts]**
- [x] 2.3 实现移出/重新加入同一实例、隐藏和幂等 dispose；添加回归测试验证释放后不再触发调度、句柄不复活。**[修改: src/dom/html/lifecycle.ts]**
- [x] 2.4 文档化 element/场景句柄归属和框架卸载顺序；通过一个挂载、移除、重新加入、最终销毁的原生 DOM 用例验收。
- [ ] 2.5 实现 layout.target、inside、padding、数值/fill 尺寸及默认值，拒绝独立位置尺寸冲突；以 320×80、padding=[16,12] 得到 (12,16,296,48)、非零原点及零面积单测验收。**[创建: src/dom/html/layout/types.ts, src/dom/html/layout/resolve.ts]**
- [ ] 2.6 实现 follow/screen 共享几何解析，避免重复应用宿主父级变换；单测覆盖旋转后轴对齐边界、不同父组、缩放、固定尺寸与 fill 语义及 DPR 无关性。**具体测试用例：** 目标位于 (100,100)、父组缩放 2× 旋转 45°，以现有 Transformable 结果核对父累计矩阵 × 局部矩阵及 globalScaleRatio，验证四角变换后的 AABB，验证 follow 模式下容器跟随旋转、screen 模式下容器为正向轴对齐；固定宽度 100 在 screen 模式下保持 100 逻辑像素，fill 宽度使用变换后边界宽度。**[修改: src/dom/html/layout/resolve.ts]**
- [ ] 2.7 实现纯 compute 回调的模式坐标契约和内置布局覆盖规则；单测验证底部对齐、非法返回值（NaN/Infinity/负尺寸）、异常诊断及配置更新失效。**[修改: src/dom/html/layout/resolve.ts]**
- [ ] 2.8 将绑定解析放在依赖几何更新后，区分期望与已提交布局，合并失效且跳过未变化 DOM 写入；测试目标访问顺序倒置、纯变换下一次绘制同步、重排等待及连续尺寸更新最终收敛，不要求新快照零帧延迟。**[创建: src/dom/html/layout/binding.ts]**
- [ ] 2.9 实现 followVisibility、目标移除恢复、解除/重绑与销毁清理；测试容器身份保持、自身可见性优先、旧依赖清除及无目标 destroy 事件时的显式解除流程。**[修改: src/dom/html/layout/binding.ts]**
- [ ] 2.10 实现跨实例、自绑定、绑定链及 Group 包围盒反向依赖的循环检测；测试父子关系动态变化后拒绝循环，空目标边界暂停，不产生重绘循环。**[修改: src/dom/html/layout/binding.ts]**
- [ ] 2.11 在 docs/html-content.md 补充绑定 API、两种坐标模式、自定义计算和组件 100% 样式示例；核对描述与单测结果一致。
- [ ] 2.12 实现独立于显示列表的必要依赖几何更新，区分 ignore/invisible/移出场景；测试 followVisibility=false 时隐藏祖先继续移动缩放、隐藏目标改变尺寸，确认宿主跟随且不重复执行更新钩子或强制显示目标。**验证隐藏状态真值表所有组合。**
- [ ] 2.13 实现原生 inert 宿主级交互阻断，缺失时拒绝创建，不提供 tabindex/visibility 降级；验证嵌套、动态控件、Tab、程序化聚焦、失焦重入与应用属性保持，文档说明恢复不聚焦及 IME 限制。**[创建: src/dom/html/interactionState.ts]**

- [ ] 2.14 实现同步 featuresPresent 初筛与异步 ready、四种状态及初始化超时；测试挂载早于就绪、空业务容器也能初始化、等待时销毁、后台超时、资源回滚及 Promise 运行要求，更新 API 示例。
- [ ] 2.15 实现 onError/onStateChange、连续故障去重、updateLayout 恢复与回调异常隔离；测试创建后 compute/绘制失败、多个宿主互不影响、重入销毁、恢复后再次报告及不可恢复错误释放。

## 3. Canvas 原生后端

- [ ] 3.1 实现经验证版本的能力检测、实验类型和可识别错误；单测覆盖接口缺失及不支持环境下普通图元仍可使用。**[创建: src/canvas/html/host.ts 的能力检测部分]**
- [ ] 3.2 实现直接 Canvas 与普通容器初始化的 host 所属绑定及首次快照等待；以两种初始化路径的真实浏览器用例验证无未处理异常。**[修改: src/canvas/html/host.ts]**
- [ ] 3.3 将 HTML 绘制接入正常显示列表顺序，隔离上下文状态并处理 DPR；验证 HTML 与普通图元交错绘制、DPR 1/2、父级变换及原生命中。**[创建: src/canvas/html/brush.ts]**
- [ ] 3.4 实现 paint 驱动的合并失效及场景刷新联动；测试 props/样式/内容尺寸变化、稳定状态无重绘循环，以及背景刷新后 HTML 不消失。**[修改: src/canvas/html/host.ts, src/canvas/html/brush.ts]**
- [ ] 3.5 处理脏矩形旧区域清除与含 HTML 层必要的完整重绘；通过移动、缩小和删除内容的浏览器用例验证无残影，并记录性能取舍。**[修改: src/canvas/Painter.ts 的脏矩形逻辑]**
- [ ] 3.6 实现可见性、移出场景及销毁的命中几何撤销；验证隐藏区域不可点击，恢复后保持组件状态。
- [ ] 3.7 对不支持的跨层迁移、hover、增量和裁剪组合增加诊断（使用 HTMLHostErrorCode），并实现 HTML 导出路径的明确拒绝（在 src/canvas/Painter.ts 的 getRenderedCanvas 单 Canvas 快速返回前检查并抛出 UNSUPPORTED_EXPORT）；测试单 Canvas、多层合成、高分辨率重绘及 ignore HTML 的拒绝行为，验证移除宿主后普通导出恢复；说明原始 Canvas 的浏览器导出不受此入口控制。**[修改: src/canvas/Painter.ts]**
- [ ] 3.8 完成 test/html-native.html 和 Canvas 文档；按支持矩阵运行实际浏览器并记录版本、截图及交互结果，不能仅以 mock 测试验收。**[创建: test/html-native.html]**
- [ ] 3.9 在 Canvas 浏览器用例中验证绑定目标拖动、尺寸动画、祖先旋转缩放及 follow/screen 切换；检查 DPR 1/2 下 Input 命中、首次/后续尺寸快照同步、零面积和隐藏恢复，并记录结果。
- [ ] 3.10 验证尺寸快照等待和连续更新的版本提交（实现 LayoutVersion 结构：sequence 单调递增、geometry、committedAt、snapshotReady），检查容器内多个控件重排后的内部命中而非仅外框；不能保持一致时验证暂停路径，记录延迟、最终尺寸收敛及不接受过期提交（v1→v2→v3 时 v1 延迟到达不覆盖 v2）。**[扩展: src/canvas/html/types.ts 的版本管理]**
- [ ] 3.11 建立含 HTML 的 Canvas 绘制性能基准，对比普通场景、1/5/10 个 HTML 宿主的帧率与内存；记录脏矩形 vs 完整重绘的性能差异。**测试场景：** 每个宿主包含 200×40 Input，绑定独立 Rect；测试 (a) 静态显示，(b) 目标每帧平移 1px（纯变换），(c) 5 个宿主同时改变高度（每秒 10 次重排）。记录帧时间中位数/P95、掉帧率、内存峰值；附带硬件、OS、浏览器版本/开关、画布尺寸、DPR、采样时长；明确 10 个宿主、模式 (c) 下 P95 帧时间 <20ms（50fps）为可接受基准。**[创建: benchmark/html-canvas.html]**

## 4. SVG foreignObject 后端

- [ ] 4.1 实现 foreignObject 与 XHTML 挂载容器，接入显示列表排序和尺寸/变换；在无原生 Canvas API 的环境运行 SVG 浏览器用例。**[创建: src/svg/html.ts]**
- [ ] 4.2 扩展 SVG patch 保留外部框架子树；增加节点身份回归测试，并在输入/组合输入期间刷新兄弟图元确认焦点和选区不丢失。**[修改: src/svg/patch.ts 或 src/svg/Painter.ts]**
- [ ] 4.3 同步内容高度、可见性和支持的裁剪，清理后端资源；以缩放、旋转、隐藏恢复、移除及销毁用例验收。
- [ ] 4.4 实现含 HTML 场景的 SSR/静态导出明确错误（在 SVG renderToString 入口检查并抛出 UNSUPPORTED_EXPORT），保留普通 renderToString 行为；运行相应回归测试并更新 SVG 支持说明。**[修改: src/svg/Painter.ts 的 renderToString 或相关导出路径]**
- [ ] 4.5 完成 test/html-svg.html，验证普通图元与 HTML 交错层级、原生输入事件与动态内容；记录浏览器结果及文档使用步骤。**[创建: test/html-svg.html]**
- [ ] 4.6 在 SVG 用例中运行相同目标绑定场景，核对与 Canvas 共享的逻辑矩形和变换结果；输入期间改变目标尺寸和父组变换，验证 DOM 身份、焦点与原组件回调保持。

## 5. 框架交互与完整示例

按 design.md 的框架示例工程结构创建隔离目录，每个示例有独立 package.json 和 README。

- [ ] 5.1 创建隔离的 React 示例，从 zr 初始化、Portal 挂载到卸载；验证受控 Input value/onChange/onBlur/onPressEnter、外部 setState 和 Context，示例依赖不得进入核心运行时。**[创建: test/html-frameworks/react-demo/]**
- [ ] 5.2 创建隔离的 Vue 示例，从 zr 初始化、Teleport 挂载到卸载；验证 props、v-model、watch、组件 change 语义和 provide/inject。**[创建: test/html-frameworks/vue-demo/]**
- [ ] 5.3 在两个后端运行 React/Vue 输入及按钮用例，验证同一操作不重复触发业务回调，disabled、Tab、中文输入法和选区行为符合原组件语义。**增加无障碍验证：** 测试 ARIA 属性保留（aria-label, aria-describedby）、键盘导航（Tab 顺序、Enter/Space 激活按钮）和屏幕阅读器公告（在支持的浏览器/OS 组合中手动验证，记录结果）。
- [ ] 5.4 验证组件区域与 zrender 拖拽/指针事件的协调；加入交互回归用例，确保输入不被场景拖拽抢占。
- [ ] 5.5 增加弹层目标配置与动态高度示例，验证 CSS 变量/字体继承和弹层边界；在文档中列明未验证或不支持的第三方组件行为。
- [ ] 5.6 为 React/Vue 示例增加”绑定已有 Rect 的 Input”和自定义底部布局，演示目标拖动/尺寸变化后无需手动刷新；验证原 props/onChange/v-model 用法保留，并说明容器尺寸不会自动改写组件 props。
- [ ] 5.7 在 Canvas/SVG 真实浏览器中测试聚焦或 IME 输入期间隐藏、移除目标、零面积及 compute 失败：确认后续键盘不能修改暂停 Input，Tab/程序化 focus 被阻断，恢复不抢焦点，组件原有 disabled/tabindex 保持，blur/composition 不被桥接重复派发；记录浏览器实际提交行为与回调重入结果。

- [ ] 5.8 编译并实际运行 API 草案完整 React Portal 示例及对应 Vue 生命周期示例；验证返回 Portal 后内容确实挂载、ready 失败清理、提前销毁无未处理拒绝、组件先卸载且回调保持。

## 6. 集成验收

- [ ] 6.1 运行适用单测、npm run lint、npm run checktype 和 npm run release；记录结果，区分新增问题、既有问题及未执行检查。
- [ ] 6.2 检查全部新增手写源码/测试/脚本不超过 500 行，检查构建和发布入口不引入示例框架/UI 库依赖（验证 npm run build 产物和 lib/ 不包含 react/vue 导入痕迹）；以文件检查和依赖检查记录验收。
- [ ] 6.3 逐条核对三个 capability 的场景及浏览器支持矩阵，运行普通 Canvas/SVG 场景回归；交付可复现示例、版本、截图与剩余限制清单。
- [ ] 6.4 运行 openspec validate add-framework-agnostic-html-element --strict，核实任务状态与真实实现一致，再提交最终验证报告。
- [ ] 6.5 固定环境、预热、框架卸载顺序、异步清理等待与 GC 方法，分批执行共 1000 次创建/销毁并采集回收后快照；检查宿主 DOM、监听器和闭包是否持续累积，分析 retained path，定位可归因于宿主生命周期的残留引用。交付曲线、快照和原因分析，不用堆比例或残留数量门槛判定；无法控制 GC 时明确结论限制。**[创建: test/memory-leak-check.html 或扩展现有用例]**

## Workflow follow-up

- 功能实现及验证完成后再按项目流程评审和归档，本次仅完成 M1，不归档整个变更。


