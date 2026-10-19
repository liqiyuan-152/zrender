# Design

## Context

动机见 proposal.md。现有 Storage 展开 GroupLike 并收集显示列表，Canvas/SVG 绘制器按图元类型分派；Text 已有子图元组合，但不是 DOM 布局引擎。SVG 另有虚拟节点与 patch 流程，HTML 的框架子树必须与该流程隔离。

**术语约定：**  
- **宿主容器 (host container)**：系统提供的稳定 HTML 挂载节点，由 `createHTMLHost` 返回的 `element`，统称"宿主"；避免"挂载容器""承载容器"混用。
- **场景坐标系 (scene coordinates)**：zrender 内部的逻辑坐标空间，不受浏览器 DPR 或外部 CSS 变换影响；统一使用"场景坐标系"，不使用"画布逻辑坐标"。注意：布局绑定的 `screen` 模式指"场景坐标对齐"，不是"物理屏幕坐标"。
- **目标元素 (target element)**：布局绑定配置中指定的 zrender 图形元素，宿主根据其边界计算布局。
- **绑定 (binding)**：宿主与目标元素的布局依赖关系，不是父子关系。
- **跨层迁移 (layer migration)**：HTML 元素在运行时改变所属的 Canvas 层级（zlevel），或从一个独立的 Canvas 元素移动到另一个。首版不支持。

原生 HTML-in-Canvas 为实验 API。2026-10-19 查阅的 WICG 当前提案使用 content="drawable"、drawable、paint、drawElementImage 及几何同步；旧示例使用 layoutsubtree 且接口签名不同。对话中的演示代码未实测，不直接作为生产实现。

**实验 API 版本管理策略：**  
系统将记录每个经验证浏览器的精确版本、实验开关名称和支持的接口特征集（drawElementImage、paint 通知、自动几何同步等）。能力检测不仅检查单个方法存在性，还需验证接口签名与调用行为。检测到旧版本接口（如 layoutsubtree）时，若该版本已有独立验证记录，提供显式适配分支；未验证版本明确拒绝并报告所需特征和当前环境缺失项。降级策略不包括自动切换到 SVG、overlay 或截图方案；缺失能力时创建失败，由调用方决定后续路径。版本初筛和局部类型在 src/dom/html/capabilities.ts、src/canvas/html/types.ts；M1 精确版本准入和原生适配在 src/canvas/html/profile.ts、native.ts。

工作区已有 src/canvas/Painter.ts 和 dist 修改，本次 M1 实施保留既有改动，并通过 release 更新生成产物。新增手写源码、测试、脚本每文件不超过 500 行，沿用 ES3 编译目标，不能假定编译器补齐运行时 API。

## Goals / Non-Goals

### M1 代码核查与验收记录（2026-10-19）

已通过本仓库 CodeGraph 核查以下接入点，并完成 M1 最小公共 Canvas 接入：

- Canvas 刷新链为 `ZRender._refresh → CanvasPainter.refresh → Storage.getDisplayList(true) → _updateLayerStatus → _paintList → _doPaintList → _paintPerCursor → brush`。`getLayer/_ensureLayer` 决定真实 Canvas 所属，不能在 rendered 回调追加顶层内容。
- `src/canvas/graphic.ts` brush 分派保持显示顺序，需处理上下文及批路径；`_doPaintList` 的 createRepaintRects 是脏矩形接入点。`getRenderedCanvas` 在单 Canvas 快速返回前需检查全部场景成员，不能只读可见列表。
- SVG 为 `refresh → renderToVNode → brush → patch`，patchVnode/updateChildren 管理普通 vnode 子树，需显式保护框架子树。`renderToString → renderToVNode → vNodeToString` 是静态导出路径，拒绝检查不能导致共用 renderToVNode 的普通浏览器刷新失败。
- Handler.findHover 依赖图元列表，HandlerProxy 事件路径不等同于浏览器 drawable DOM 命中；不能凭像素覆盖推断 Input 不可点击。
- `ZRender.add/remove → Element.addSelfToZr/removeSelfFromZr`，Group 递归传播；普通移除不同于最终释放。`ZRender.dispose → clear → storage/painter/handler.dispose` 需额外宿主资源清理，不假定有元素 destroy 事件。
- Storage._updateAndAddDisplayable 在 ignore 时提前返回，M2 必要依赖几何不能仅依靠可见列表。

开始时已有 Painter.ts resize 中 eachLayer 回调由 function 改为箭头函数及 dist 改动，均保留；构建更新产物，未提交/推送。`.codegraph/`、AGENTS.md、OpenSpec 和 pnpm-lock.yaml 为开始时已有未跟踪内容，未删除或改写依赖锁。

真实 Chrome 155.0.8059.85 旧接口原型能绘制与输入，但普通 Canvas 图元覆盖后仍命中 Input。保留该失败，按设计允许的限制策略在 Painter 获取已更新排序列表后、绘制和提交几何前执行 scenePolicy：前景 paint AABB 相交时暂停、设置 inert 并撤销几何，移动/隐藏/排序后恢复。公共 createHTMLHost 已接入正常 brush；直接 Canvas/DPR 1 与容器/DPR 2 共 50 项检查及可信输入通过。M1 完成，完整 M3 仍未验收。中文 compositionend isTrusted=false 原因未明，IME 暂停仍待 M5。详细证据见 [m1-validation.md](m1-validation.md)。

**Goals:**
- 同一外部挂载契约覆盖原生 Canvas 与浏览器 SVG。
- 浏览器承担 HTML 布局、真实事件、焦点和编辑；框架承担组件状态。
- 接入显示列表和后端生命周期，避免仅使用 rendered 回调把 HTML 画到最顶层的演示方案。
- 先验证原生浏览器能力，再实现版本适配，记录可重现的支持矩阵。
- 使用两个后端共享的布局绑定层，根据已有元素及祖先更新自动计算 HTML 几何。

**Non-Goals:**
- 不实现 Button/Input 等 UI 库，不引入核心框架依赖，不复制组件定义或业务回调。
- 不实现 HTML/CSS 解析器、截图重建、自动 overlay 降级或任意第三方组件兼容保证。
- 不在首版承诺 HTML 静态导出、SSR、跨渲染器热切换或任意裁剪/渐进绘制。

## Decisions

### 1. 公共承载模型

拟采用 createHTMLHost(zr, options)，返回稳定 element、场景元素句柄和幂等 dispose；命名在实现时随公共类型评审固定。options 提供位置、宽高及适用场景属性。外部使用 React createPortal 或 Vue Teleport 挂载到 element；原生脚本也可直接挂载。

能力检测分两阶段：同步 checkHTMLCanvasSupport 仅返回 featuresPresent 初筛结果，实际绘制/paint 链路通过宿主内部异步探测验证。createHTMLHost 同步返回可挂载 element 和 pending 句柄，ready Promise 表示后端初始化完成，不表示业务内容/字体图片全部就绪；组件无需等待 ready 才挂载。探测使用系统自有内容，不主动聚焦业务控件；交互语义仍依赖真实浏览器验收。首次快照与业务首次绘制继续单独调度。

生命周期及诊断的公共契约见 API 草案“就绪、状态和运行期诊断”：pending/active/suspended/disposed；initializationTimeoutMs 默认 10000 的有限正数超时；初始化错误只通过 ready 拒绝，运行期错误由创建参数 onError 通知，状态变化经 onStateChange 通知。初始化取消与失败释放探测及后端资源，但不代替框架卸载；正常运行错误按故障键去重并隔离到单宿主，配置更新或依赖变化后重试，不以逐帧轮询自愈。回调异常与重入必须隔离。Promise 运行时依赖在公共 API 文档声明。

优先由后端创建正确归属的容器，避免把框架管理的现有 DOM 强行 reparent。不复制 DOM，因为副本不保留框架事件与组件实例。核心依赖仅限 DOM/图形接口，示例依赖隔离在演示工程。

不把普通 Group 当作有自绘能力的 HTML 宿主；新增显示元素负责包围盒、失效和场景属性，绘制交由各后端。存储与事件层只在代码探查确认必要时修改，不预先重写。

### 2. Canvas 原生后端

将挂载容器加入实际绘制该 HTML 的 Canvas 的合法子树。支持直接 canvas 初始化和由容器创建 Canvas 的路径。首版以普通、非增量场景为基础；层所属在挂载时固定，跨 Canvas 迁移、hover 提升等未经验证路径明确拒绝，不能只把 host 放在顶层容器中。

能力检测集中封装，覆盖实际支持版本的 opt-in、paint、绘制和几何接口，不仅检测一个方法名。首次快照就绪前不绘制；paint 标记对应 HTML 失效，通过 zrender 调度合并刷新。背景重绘必须包含受影响 HTML；脏矩形路径不安全时对含 HTML 的相关层退回完整重绘，并记录成本。

在正常 brush 顺序中调用原生绘制，隔离 Canvas 状态、显式处理目标尺寸和 DPR。依据实测接口使用自动或显式几何更新，不重复应用 CSS transform。隐藏、移出、裁剪和释放时同步撤销命中几何。

必须验证原生 DOM 与上层普通图元遮挡的命中关系；不能通过只调整像素绘制顺序宣称命中正确。若某组合无法保持几何/事件一致，限制该组合并输出诊断。

### 3. SVG 后端

增加 foreignObject 绘制分支，在内部创建 XHTML div。SVG patch 将该 div 以下视为外部管理的 opaque 子树；以稳定元素标识复用 foreignObject，避免在重绘或换序时重新创建组件 DOM。

场景排序与几何由 SVG 后端维护，内容由浏览器直接渲染；尺寸观察只用于同步布局边界，不逐帧解析 HTML。普通图元的 patch 行为保持不变。

### 4. 事件和生命周期

业务链路为原 DOM 事件 → 框架回调 → 业务状态 → DOM；绘制链路为 DOM 可视快照变化 → paint → 原生绘制。SVG 无需快照绘制链路。不得以 paint 推断 onChange，也不为外部 props 更新伪造业务事件。

验证键盘导航、IME、selection、disabled 和 focus。检查 HandlerProxy 与命中路径，明确组件区域由真实 DOM 消费交互，场景拖拽不应抢走输入操作；不以通用 dispatchEvent 模拟原生交互。

普通 remove 保留 host 身份但停止显示与命中，重新加入同一实例可恢复。最终释放顺序为框架卸载 → host.dispose → zr.dispose；文档说明 zr.dispose 无法替代框架卸载。清理观察器、paint 订阅、待执行帧及 DOM，防止销毁后资源回调复活。

交互暂停是独立状态：隐藏、移出场景、零面积、布局失败或循环依赖时，先标记暂停以阻止回调重入重新聚焦，再退出宿主内部 activeElement、撤销命中，并在系统拥有的容器边界使用经验证的原生 inert 阻止 Tab 和程序化聚焦。首版不实现 tabindex/visibility 组合降级；Canvas 和 SVG 均要求可靠的宿主级聚焦阻断，缺失时拒绝创建 HTML 宿主并报告 CAPABILITY_MISSING，不影响普通图元。测试必须覆盖嵌套控件及暂停期间动态新增节点，不能仅凭属性存在宣称行为正确。不能只用 pointer-events:none 或清除 Canvas 几何，也不能遍历改写框架子节点的 disabled/tabindex。恢复仅移除系统施加的阻断，不自动 focus，也不撤销应用自身设置的限制。

blur/focusout 和 composition 结束交给浏览器及框架原机制，不额外 dispatchEvent，不保证不同浏览器的回调次序一致。暂停可正常结束 IME，保留已被组件接受的业务值，但不承诺恢复未提交的预编辑串。失焦回调可能同步卸载或重绑，后续操作必须复查宿主是否仍存活。正常重绘和能够维持命中一致性的快照等待不应触发暂停或失焦；无法维持一致性时按上述契约暂停并记录该浏览器限制。

### 5. 能力与导出策略

Canvas 缺失原生能力时创建失败，普通图元继续工作；SVG 不依赖 Canvas 实验能力，但同样要求可靠的原生 inert，不提供降级。首版无自动 overlay，也不自动切换 renderer。静态导出和 SSR 的 HTML 路径明确拒绝，普通场景的既有导出保持不变；后续如需快照导出另立规范。

**导出错误处理策略：** Canvas 导出的真实入口在 `src/canvas/Painter.ts` 的 `getRenderedCanvas` 方法（单 Canvas 快速返回、多层合成、高分辨率重绘的公共路径）；在方法开头、首个逻辑分支前检查场景是否包含 HTML 元素，是则抛出 `HTMLHostError` (code: `UNSUPPORTED_EXPORT`)。SVG 导出的入口在 `src/svg/Painter.ts` 的 `renderToString` 方法开头；另需验证委托到 `getRenderedCanvas` 的 `toDataURL` 等路径是否能正确传递异常。检查 Storage 管理的场景元素而非仅可见显示列表，避免 ignore 的 HTML 绕过限制；已调用 `remove()` 移出场景的宿主不应阻止普通场景导出。`src/export.ts` 仅负责公共类型和工具函数的符号导出，不是绘制导出执行入口，无需修改。限制范围为 zrender 提供的导出方法；不能拦截调用方直接取得原始 Canvas 后调用浏览器原生 `toDataURL`/`toBlob`，也不对这些调用的结果作保证。

弹层默认挂 body 时不在承载子树内；示例配置 UI 库提供的 popup container，并明确容器尺寸和裁剪限制。字体继承、CSS 变量、Portal/Teleport 上下文和组件卸载都纳入框架示例验证。

### 6. 已有元素的布局绑定

在公共 options 中新增 layout。下例是拟定接口，不代表已实现：

```ts
const host = createHTMLHost(zr, {
    layout: {
        target: rect,
        placement: 'inside',
        padding: [16, 12],
        width: 'fill',
        height: 'fill',
        mode: 'follow',  // 坐标模式：follow 或 screen
        followVisibility: true
    }
});
```

首版内置 placement 为 inside；其他定位可用 compute 表达，不扩展为通用 CSS 布局引擎。padding 按上右下左规范化，支持数值、二项与四项数组；宽高支持非负数值或 fill。默认 mode='follow'、inside、padding=0、宽高 fill、followVisibility=true。绑定生效时 layout 拥有宿主位置和尺寸，拒绝同时配置独立 x/y/width/height，以免来源冲突。未绑定的原有尺寸契约保持不变。

- **follow（跟随变换模式）计算流程：**
  1. 读取 `target.getBoundingRect()` 获得局部边界（含非零 bounds.x/y）
  2. 复用目标已正确更新的累计矩阵，保持现有 Transformable 语义（基础组合顺序为父级累计矩阵 × 目标局部矩阵，并保留 globalScaleRatio 等处理），不手工按相反顺序重建
  3. 在局部坐标系应用 padding 和 fill 计算，得到局部矩形
  4. 传入后端时附带该局部矩形及累计变换矩阵；后端将该矩阵应用到 Canvas/SVG，不再叠加宿主父级变换
  5. 包围盒不是通用 CSS content box，描边等是否计入遵循该目标的 getBoundingRect 契约，示例需说明
  
- **screen（画布对齐模式）计算流程：**
  1. 执行 follow 的步骤 1-2，取得局部边界与有效累计矩阵；将局部边界四角分别变换到场景坐标系
  2. 对变换后的四角取 min/max 得到轴对齐包围盒（AABB），结果矩形保持正向，其宽高包含旋转、倾斜和缩放的影响
  3. 在画布场景坐标系应用 padding 和 fill 计算，得到正向矩形（无旋转）
  4. 固定数值尺寸使用场景逻辑像素，不随目标缩放；fill 尺寸则使用 AABB 宽高
  5. 传入后端时使用单位矩阵或仅包含平移的矩阵
  6. 这里的 screen 指 zrender 场景坐标系，不是页面 client 坐标或物理像素；画布本身的外部 CSS 变换仍由浏览器处理
- 内置布局：x=bounds.x+left，y=bounds.y+top；fill 宽高分别为 max(0,bounds.width-left-right)、max(0,bounds.height-top-bottom)。零面积不绘制、不命中；数值尺寸显式覆盖对应 fill 计算。
- compute({bounds})：bounds 使用所选模式的空间，返回同空间的 {x,y,width,height}；compute 优先并替代整个内置矩形计算，不再叠加 padding。输入为只读快照，计算须为纯函数；NaN/Infinity/负尺寸或异常使绑定暂停并报告诊断。系统只跟踪声明的 target，闭包中的额外业务数据变化需通过更新 layout 配置触发失效。

容器布局只修改 DOM 承载几何，不修改组件 value/width 等 props。文档示例显式设置组件 width:100%，按需要设置 height:100%。

布局绑定是依赖关系，不是父子关系。不自动 reparent；后端接收统一解析后的局部矩形及有效场景矩阵，防止宿主父级与目标父级变换重复叠加。自身父组隐藏仍生效；followVisibility 只控制是否额外随目标及其祖先隐藏。层级、裁剪沿用宿主自身配置，本次不新增自动复制目标裁剪/层级功能。

调度顺序为依赖几何更新 → 按依赖顺序解析期望布局 → 后端准备 → 提交画面及交互几何。不能依赖显示列表中目标恰好先于宿主访问。区分期望布局与已提交布局：纯位置/矩阵变化不触发 DOM 重排时，在下一次场景绘制同步；宽高变化引起重排时，Canvas 等待对应有效快照，允许跨浏览器渲染周期延迟，不承诺零帧滞后。SVG 使用浏览器自身布局与绘制同步。

Canvas 以布局版本管理待处理尺寸及实际可用快照，合并连续更新，禁止过期结果覆盖新提交。画面、实际边界和命中几何使用同一已提交版本；原 DOM 已重排而旧快照仍展示时，必须实测内部命中是否仍一致，不能只保留旧容器矩形就假定成立。不能维持一致性则暂停交互，按焦点契约处理。目标更新停止且有效快照到达后最终提交最新布局；纯变换与尺寸重排同时发生时不作当帧新内容保证。稳定布局不反复写 DOM，不轮询等待快照。

依赖几何更新独立于可绘制列表：当前 Storage 会在 ignore 时提前返回，因此绑定层需要对仍在场景中的目标及必要祖先刷新边界/累计矩阵，即使隐藏遍历被跳过。不得通过清除 ignore 强制绘制，也不得为同一帧重复运行有副作用的 beforeUpdate/afterUpdate；具体几何更新扩展点经 CodeGraph 核查后实现。ignore（可能剪掉整个遍历子树）、invisible（隐藏图元）和移出场景分别处理；followVisibility=false 仅跳过目标隐藏联动，不跳过依赖几何计算，也不允许已移出场景的目标继续显示宿主。目标及祖先的有效隐藏状态、宿主自身隐藏策略单独计算。

**隐藏跟随的有效状态真值表：**

| 目标状态 | 目标祖先状态 | followVisibility | 宿主显示 | 宿主命中 | 备注 |
|---------|-------------|------------------|---------|---------|------|
| ignore  | 任意         | true             | 隐藏     | 无       | 目标隐藏触发联动 |
| ignore  | 任意         | false            | 显示     | 有       | 关闭联动，宿主继续显示 |
| invisible | 任意       | true             | 隐藏     | 无       | 目标隐藏触发联动 |
| invisible | 任意       | false            | 显示     | 有       | 关闭联动，宿主继续显示 |
| 正常     | ignore      | true             | 隐藏     | 无       | 祖先隐藏触发联动 |
| 正常     | ignore      | false            | 显示     | 有       | 关闭联动，宿主继续显示 |
| 正常     | invisible   | true             | 隐藏     | 无       | 祖先隐藏触发联动 |
| 正常     | invisible   | false            | 显示     | 有       | 关闭联动，宿主继续显示 |
| 移出场景 | 任意         | 任意              | 隐藏     | 无       | 移出场景始终暂停，不论 followVisibility |
| 任意     | 任意         | 任意              | 由宿主自身策略决定 | 对应宿主显示状态 | 宿主自身父级隐藏仍生效 |

依赖管理提供显式更新、解除绑定与清理。目标 remove 后暂停显示/命中但保留宿主身份，重新加入同一实例恢复。zrender 元素未必有独立 destroy 事件，因此不虚构该事件：业务永久弃用目标时解除/重绑，宿主或 zr.dispose 时彻底清理。目标为空 Group 等没有有效边界时暂停；跨实例目标拒绝。

检测自绑定、显式绑定链循环，以及宿主参与目标 Group 包围盒计算的反向依赖；在新建绑定、重绑和场景父子关系变化时检查。发生错误时报告且停止该绑定，不通过反复测量求固定点。既不让 HTML 自动高度回写目标，也不允许 compute 内更新目标形成隐式反馈。

### 7. 文件规划（拟定）

| 路径 | 职责 |
| --- | --- |
| src/graphic/HTML.ts | 场景 HTML 元素、属性和包围盒 |
| src/dom/html/types.ts | 公共挂载参数、状态、后端契约及错误码 |
| src/dom/html/diagnostics.ts | 统一错误定义、诊断消息格式和上下文 |
| src/dom/html/createHTMLHost.ts | 公共入口和后端选择 |
| src/dom/html/lifecycle.ts | 稳定容器、尺寸观察及清理 |
| src/dom/html/interactionState.ts | 暂停状态、焦点退出、原生 inert 阻断及恢复 |
| src/dom/html/capabilities.ts | 实验能力检测、版本映射和可识别诊断 |
| src/dom/html/layout/types.ts | target、两种坐标模式、compute 及绑定配置 |
| src/dom/html/layout/resolve.ts | padding/fill、自定义计算及坐标转换 |
| src/dom/html/layout/binding.ts | 依赖失效、生命周期与循环检测 |
| src/canvas/html/types.ts | 局部实验 DOM 类型、布局版本管理（LayoutVersion: sequence 单调递增、geometry、committedAt、snapshotReady 标志；用于管理待处理尺寸更新与实际可用快照，确保过期快照不覆盖新提交），不污染全局 |
| src/canvas/html/host.ts | Canvas 归属、快照通知与失效 |
| src/canvas/html/brush.ts | 原生绘制、DPR 和几何同步 |
| src/svg/html.ts | foreignObject 创建、属性与复用 |
| test/ut/spec/html/*.test.ts | 生命周期、能力检测和调度回归 |
| test/ut/spec/html/layout*.test.ts | 布局计算、矩阵、失效顺序及循环依赖回归 |
| test/html-native.html、test/html-svg.html | 原生浏览器与 SVG 场景验证 |
| test/html-frameworks/ | 隔离的 React/Vue 组件验证工程 |
| docs/html-content.md | API、运行要求、支持矩阵和能力检测示例 |

**框架示例工程结构：**  
test/html-frameworks/ 包含独立的框架验证项目，每个子目录有自己的 package.json 和依赖，不影响根目录构建。推荐结构：
```
test/html-frameworks/
├── react-demo/
│   ├── package.json     # 独立依赖（react, react-dom, 本地引用 zrender）
│   ├── src/
│   │   ├── index.tsx    # Portal 挂载示例
│   │   └── controlled-input.tsx
│   └── README.md        # 运行步骤和验证要点
├── vue-demo/
│   ├── package.json     # 独立依赖（vue）
│   ├── src/
│   │   ├── main.ts      # Teleport 挂载示例
│   │   └── ControlledInput.vue
│   └── README.md
└── shared/              # 可选的共享测试工具（非框架代码）
    └── test-utils.ts
```
每个示例需在 README 中说明：如何构建 zrender、安装示例依赖、启动本地服务和验证交互行为。

预计修改 src/canvas/graphic.ts、src/canvas/Painter.ts、src/svg/graphic.ts、src/svg/Painter.ts、src/svg/patch.ts 与 src/export.ts；先使用 CodeGraph 查调用链再确定最小改动。既有超过 500 行的文件不为此统一拆分，新增逻辑优先独立模块。

## Risks / Trade-offs

- [实验接口漂移] → 先记录浏览器精确版本、开关与可运行最小示例；兼容旧签名必须有独立检测与测试。
- [多层 Canvas 所属及重排] → 绑定实际绘制层，未支持迁移显式拒绝；不能用共享图片替代交互 DOM 后仍声称原生交互。
- [任意 Path 裁剪无法等价同步命中] → 首版只开放经验证的组合，视觉裁剪与命中裁剪同时验证。
- [SVG patch 破坏组件] → opaque 子树身份与输入中刷新回归测试。
- [绘制通知循环或旧像素残留] → 分离 DOM 更新与绘制，合并失效，测试稳定状态无持续重绘。
- [框架委托事件与图形事件冲突] → 浏览器集成测试检查单次回调、拖拽和键盘焦点。
- [支持度被文档示例夸大] → 模拟单测不能替代浏览器原生 API 测试；失败与未测试项明确列出。
- [包围盒布局反馈或双重变换] → 拒绝循环依赖，明确计算坐标空间，使用统一矩阵并验证不同父组和非零局部原点。
- [目标几何已变而 Canvas 快照滞后] → 保持实际画面与命中几何成对更新，以最新可用快照提交；测试目标动画与组件重排同时发生。
- [含 HTML 场景性能退化] → 固定硬件、OS、浏览器版本/开关、刷新率、DPR、画布尺寸、组件复杂度、动画负载、预热和采样时长，重复比较普通场景与 1/5/10 个宿主的中位数及 P95 帧耗时、掉帧和内存；60fps 只能作为指定 60Hz 环境的参考目标，不作为通用通过门槛。发布结论附环境和样本，阈值须先结合基线约定。
- [内存测量噪声掩盖泄漏] → 固定预热、框架卸载顺序、异步清理等待和 GC 条件，分批创建/销毁并比较回收后快照；检查宿主 DOM、监听器和闭包的 retained path 及持续增长趋势，不使用堆大小 ±10% 或允许少量残留节点的任意门槛。无法控制 GC 时记录证据局限，不宣称无泄漏。

## Migration Plan

新增 opt-in API，不改现有调用方式。先提交浏览器验证记录和最小原型，再落地公共承载、Canvas、SVG、框架示例。原生前提验证失败时记录阻塞原因并重新评审，不自动改成其他产品路线。撤销 HTML 使用即可恢复普通场景；无需迁移已有数据。

## References

- https://github.com/WICG/html-in-canvas/blob/main/README.md
- https://github.com/antvis/G 与 https://g.antv.antgroup.com/api/basic/html
- https://github.com/konvajs/react-konva-utils （overlay 参考，本次不实现该路线）

以上为设计参考，不代表本项目已完成兼容性验证。

### M1 停止条件后的受限路线验收

原生自动遮挡失败未改判通过。独立 scenePolicy 原型先验证限制路线，随后将相同策略接入实际 Painter/brush 和公共工厂，公共入口验证重叠拒绝、恢复、命中撤销及生命周期。隐藏使 native cached paint record 失效，恢复必须等待新 paint。旧接口快照已含 backing pixels，绘制时抵消一次 DPR 缩放并保留物理平移，再以返回矩阵更新 CSS 和原生几何。异步探测与精确版本准入由 native.ts/profile.ts 承担；未验证版本即使方法存在也拒绝。M1 不实现完整布局版本提交、绑定、SVG 或框架兼容。详见 m1-validation.md。
