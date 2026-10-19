# Spec Delta

## Purpose

为外部应用提供框架无关且稳定的 HTML 组件挂载位置，使同一业务组件在 Canvas 与 SVG 场景中保留原有属性、响应式数值、输入事件和实例归属，并明确场景与应用之间的生命周期责任。

## ADDED Requirements

### Requirement: Asynchronous host readiness
系统 SHALL 将同步特征初筛与异步后端验证分开，初筛不得承诺行为可用。创建成功返回可立即挂载的稳定容器及 pending 状态，ready SHALL 在后端初始化成功后完成一次，不要求业务先挂载，也不代表所有业务资源加载完成。初始化失败或超时 SHALL 拒绝 ready 并释放探测资源，外部框架负责卸载组件。

#### Scenario: Mount before ready
- **WHEN** 调用方在 ready 完成前挂载 React Portal 或 Vue Teleport
- **THEN** 容器可接受内容且初始化不与挂载互相等待，后端就绪后按正常绘制链路显示

#### Scenario: Cancel or time out initialization
- **WHEN** pending 宿主被释放，或超过配置的初始化等待时间
- **THEN** ready 分别以 DISPOSED 或 INITIALIZATION_TIMEOUT 拒绝，探测节点、订阅及调度清理，状态进入 disposed，不再回调已释放宿主；超时不被宣称为永久能力缺失

### Requirement: Runtime diagnostics and recovery
系统 SHALL 提供 pending/active/suspended/disposed 状态及创建时注册的 onError/onStateChange 通知。初始化错误由 ready 报告，运行期布局/绘制错误 SHALL 隔离到对应宿主并通知 onError，不中断整个场景。相同故障在连续失败期间去重，恢复后重新计数；回调异常不得递归触发错误通知。

#### Scenario: Computation fails after successful creation
- **WHEN** 已就绪宿主的 compute 在后续目标更新中抛错
- **THEN** 宿主暂停交互并通知一次运行期错误，其他宿主继续刷新；调用方修复 layout 或依赖更新后重新计算，成功则恢复且不抢焦点

#### Scenario: Diagnostic callback disposes host
- **WHEN** 错误或状态回调同步销毁宿主或自身抛错
- **THEN** 系统复查存活状态并终止陈旧操作，异常不传播到其他宿主刷新，框架卸载仍由外部负责

### Requirement: Framework-independent mounting
系统 SHALL 提供与当前渲染器关联的稳定 HTML 挂载容器及场景元素句柄，核心运行时 MUST 不依赖 Vue、React 或任何 UI 组件库。外部应用负责挂载组件，系统不得解析组件定义或复制事件回调。

#### Scenario: Mount external components
- **WHEN** React 使用 Portal、Vue 使用 Teleport 或原生脚本向挂载容器加入内容
- **THEN** 内容进入对应渲染器的承载结构，业务组件仍由外部应用管理

### Requirement: Preserve component state and callbacks
系统 SHALL 保留原 DOM 接收用户输入的路径，让组件沿原框架机制处理 props、状态、事件和回调。系统 MUST 不把绘制通知当作值变化事件，也不得自行切换组件业务值或为同一操作合成重复业务事件。

#### Scenario: Input value changes through user interaction
- **WHEN** 用户在已显示且启用的输入组件中输入、提交或移开焦点
- **THEN** 原组件按自身语义触发输入、提交及失焦回调，更新后的内容自动显示

#### Scenario: External controlled value update
- **WHEN** 外部应用通过 React state/props 或 Vue 响应式数据修改组件值或 disabled 状态
- **THEN** 显示与交互状态自动跟随组件更新，无需调用手动刷新接口，系统不额外伪造 change 回调

#### Scenario: Composition and selection
- **WHEN** 宿主保持可交互，用户执行中文输入法组合输入、选区操作和键盘焦点切换
- **THEN** 原输入 DOM 负责这些行为，系统不得在重绘时替换输入节点或打断焦点与组合输入

### Requirement: Scene geometry contract
系统 SHALL 支持 HTML 元素的位置、显式尺寸、父级二维变换、可见性和声明支持的层级及裁剪语义。无显式高度时 SHALL 可依据内容布局更新高度。未支持的场景组合 MUST 明确诊断，不得静默显示在错误位置或产生错误命中区域。

#### Scenario: Transform and resize
- **WHEN** 元素父组平移、缩放或旋转，或外部内容改变高度
- **THEN** 可视内容、报告的尺寸与实际交互区域在支持范围内保持一致

#### Scenario: Hide and show
- **WHEN** 元素或其父级被隐藏后重新显示
- **THEN** 隐藏期间内容不可见且不可命中，恢复时保留原组件实例与业务值

### Requirement: Lifecycle ownership
系统 SHALL 保持刷新期间挂载容器的身份。外部框架负责卸载组件；承载句柄提供幂等释放并清理订阅、调度和后端资源。移出场景 SHALL 停止绘制与命中，重新加入同一渲染器时可恢复；最终释放后不得执行陈旧异步回调。

#### Scenario: Ordinary redraw
- **WHEN** 普通图元刷新或 HTML 内容更新
- **THEN** 挂载容器和仍由外部框架保留的子节点不因 zrender 重绘而重建

#### Scenario: Unmount and dispose
- **WHEN** 外部框架先卸载组件，再释放承载句柄或销毁整个 zrender 实例
- **THEN** 系统释放全部承载资源，重复释放不报错，销毁后不再安排绘制

### Requirement: Document component boundaries
系统 SHALL 提供从初始化到卸载的 React 与 Vue 示例，说明原事件语义、弹层目标容器、浏览器要求和渲染器差异；不得承诺所有第三方组件透明兼容。

#### Scenario: Component creates a popup
- **WHEN** 组件默认向 document.body 挂载弹层
- **THEN** 文档明确该弹层不自动属于 HTML 元素，并演示如何在组件支持的情况下配置兼容的挂载目标

### Requirement: Target element layout binding
系统 SHALL 允许 HTML 承载绑定同一 zrender 实例中的已有元素，根据目标局部包围盒或其画布空间边界计算位置与尺寸，并在 Canvas/SVG 后端采用相同布局语义。系统 SHALL 支持 inside、padding 和宽高 fill，尺寸不得小于零。绑定只调整容器布局，不自动修改外部组件 props。

#### Scenario: Fill a rectangle with padding
- **WHEN** HTML 绑定局部边界为 (0, 0, 320, 80) 的矩形，使用 inside、上下 16 和左右 12 的 padding，宽高均为 fill
- **THEN** follow 模式下容器局部位置为 (12, 16)，尺寸为 296 × 48，组件是否填满容器由外部样式决定

#### Scenario: Insufficient space
- **WHEN** 目标可用尺寸小于 padding 总量
- **THEN** 对应容器尺寸钳制为零，不产生负尺寸，零面积区域不参与交互

### Requirement: Binding coordinate modes
系统 SHALL 提供 follow 与 screen 模式。follow 在目标局部坐标布局并应用目标及祖先累计变换；screen 在 zrender 画布逻辑坐标中使用变换后的轴对齐包围盒布局，保持容器正向，不继承目标旋转和缩放。DPR 不得改变布局逻辑单位。

#### Scenario: Follow transformed target
- **WHEN** 目标位于有缩放和旋转的父组内，绑定使用 follow
- **THEN** 容器位置、显示和命中随目标累计变换同步，不重复应用宿主父组变换

#### Scenario: Screen-aligned content
- **WHEN** 旋转目标的绑定使用 screen
- **THEN** 以目标变换后的轴对齐边界定位正向容器，固定数值尺寸保持画布逻辑像素大小，fill 尺寸随该边界计算

### Requirement: Custom binding computation
系统 SHALL 支持自定义布局计算，输入边界与返回位置尺寸使用所选模式的坐标空间，并明确其优先于内置 inside/padding/fill 计算。系统 MUST 拒绝非有限数值及负宽高，不让无效结果影响场景；计算函数不得修改目标或建立布局反馈。

#### Scenario: Bottom-aligned custom layout
- **WHEN** follow 模式的自定义计算对局部边界返回 x+12、y+height-40、max(0,width-24)、32
- **THEN** 容器按返回的局部矩形布局并跟随目标累计变换，不再次叠加 padding

### Requirement: Automatic binding invalidation
系统 SHALL 在目标及相关祖先的几何更新后解析绑定，覆盖合法的形状更新、拖动、动画和父组变换，无需手动刷新。纯位置/变换变化 SHALL 在下一次场景绘制同步；涉及 DOM 重排的 Canvas 更新允许等待有效快照，但 MUST 保持已发布画面与命中几何一致，并在输入稳定且快照可用后收敛到最新布局。未变化的布局不得持续触发 DOM 写入或绘制循环。

#### Scenario: Animated target and ancestor
- **WHEN** 目标尺寸动画和父组平移同时进行
- **THEN** 系统计算最新目标布局；纯变换在下一次绘制同步，尺寸重排可等待快照，等待期间不把新命中几何配给旧画面，动画结束且快照就绪后提交最终布局

#### Scenario: Pending layout is superseded
- **WHEN** Canvas 等待尺寸重排的快照期间目标再次更新尺寸
- **THEN** 系统合并待处理布局，不让过期快照覆盖较新提交，最终显示最新有效尺寸；若无法维持等待期间的命中一致性，则按暂停交互契约处理

### Requirement: Geometry of hidden binding targets
系统 SHALL 区分 ignore、invisible 与移出场景。关闭隐藏跟随时，仍在同一场景中的目标及祖先即使因 ignore 未进入显示列表，其绑定所需边界和累计变换也 MUST 更新；不得为计算几何而将目标重新显示。移出场景始终暂停绑定。开启隐藏跟随时 SHALL 按目标及祖先的有效隐藏状态暂停宿主。

#### Scenario: Ignored ancestor keeps moving
- **WHEN** followVisibility 为 false，目标祖先被设为 ignore 并继续通过合法 API 移动或缩放
- **THEN** 目标仍不绘制，宿主使用更新后的累计变换跟随，不读取跳过遍历前的旧矩阵

#### Scenario: Invisible target versus removed target
- **WHEN** followVisibility 为 false，目标先被设为 invisible 并改变尺寸，随后被移出场景
- **THEN** 隐藏期间宿主继续跟随最新有效几何，移出场景后停止显示及交互

### Requirement: Focus during suspension and recovery
系统 MUST 在宿主隐藏、移出、零面积、布局失败或循环依赖等导致交互暂停时撤销指针命中、退出内部焦点并阻止 Tab 或程序化聚焦进入。系统 SHALL 保留组件实例和已由组件接受的业务值，恢复后不自动抢回焦点。失焦及 composition 结束沿浏览器和框架正常事件路径处理，不伪造或重复派发 change、blur、composition 事件。

#### Scenario: Hide while typing
- **WHEN** Input 已聚焦，宿主因隐藏或目标移除而暂停
- **THEN** 焦点退出该宿主，后续键盘输入不能修改隐藏 Input，Tab 跳过暂停子树；由实际焦点转移产生的回调正常执行，系统不重复合成回调

#### Scenario: Layout failure during composition
- **WHEN** 组合输入期间布局变成零面积、计算失败或出现循环依赖
- **THEN** 系统执行暂停和失焦，允许浏览器正常结束组合输入，不承诺保留未提交的输入法预编辑内容，不额外写入业务值

#### Scenario: Resume without stealing focus
- **WHEN** 布局恢复有效或目标重新进入场景，且用户已聚焦其他控件
- **THEN** 宿主恢复可交互但不自动 focus，保留组件状态，不改写应用自身的 disabled、tabindex 等交互配置

### Requirement: Host-level focus blocking capability
系统 MUST 在 Canvas 和 SVG 模式下要求经验证的原生 inert 宿主级阻断能力，缺失时 SHALL 拒绝创建 HTML 宿主并报告 CAPABILITY_MISSING，不影响普通图元。首版不得通过遍历修改框架节点的 tabindex/disabled 提供降级。

#### Scenario: Nested and dynamically added controls
- **WHEN** 已暂停宿主中存在嵌套输入控件，或外部框架新增可聚焦节点
- **THEN** Tab 和程序化 focus 均不能进入暂停子树，恢复后仍保留应用原有交互属性

#### Scenario: Missing focus blocking support
- **WHEN** 环境不能可靠提供宿主级聚焦阻断
- **THEN** HTML 宿主创建明确失败，不仅凭 foreignObject 或绘制方法存在宣称支持

### Requirement: Binding lifecycle and independent scene policies
系统 SHALL 将几何绑定与隐藏、裁剪、层级策略分开，不因绑定自动 reparent 或继承目标的裁剪和层级。目标隐藏跟随 SHALL 可配置；目标离开场景时暂停显示与命中，同一目标恢复时保留容器身份；显式解除、重绑或最终释放 SHALL 清理旧依赖。

#### Scenario: Target removal and rebinding
- **WHEN** 目标被移出后重新加入同一场景，或调用方将绑定改为另一有效目标
- **THEN** 原目标缺席期间组件不可见且不可命中，恢复或重绑后继续使用原组件实例，旧依赖不再影响新绑定

#### Scenario: Independent visibility and stacking
- **WHEN** 绑定关闭隐藏跟随且目标仅被隐藏，或目标调整层级和裁剪
- **THEN** 宿主继续遵守自身可见性及场景属性，不自动继承目标层级和裁剪；宿主自身父级隐藏规则仍然有效

### Requirement: Reject cyclic layout dependencies
系统 MUST 拒绝跨 zrender 实例目标、自绑定、绑定链循环以及目标包围盒反向依赖该 HTML 宿主的循环布局，并提供可识别诊断。目标不存在有效边界或计算失败时 SHALL 暂停该绑定的显示与命中并报告错误，不得无限迭代。

#### Scenario: Group bounds contain bound host
- **WHEN** HTML 宿主位于目标 Group 的包围盒依赖子树中并试图按该 Group 的包围盒布局
- **THEN** 系统拒绝循环依赖并报告原因，不反复扩大尺寸或持续重绘
