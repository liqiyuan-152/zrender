# Spec Delta

## Purpose

使用浏览器原生 HTML-in-Canvas 能力将外部组件的真实 DOM 绘制进 zrender Canvas 场景，由浏览器承担布局和输入语义，同时约束自动重绘、命中同步、能力检测以及实验接口的兼容边界。

## ADDED Requirements

### Requirement: Explicit native capability detection
系统 MUST 在创建原生 HTML 承载时初筛所需特征，并在 ready 完成前异步验证所需绘制、快照通知和几何同步链路。不支持时 SHALL 返回可识别的错误及所缺能力，不得静默采用截图、overlay 或切换渲染器。普通非 HTML 图元不得受影响。

系统 MUST NOT 使用浏览器版本号、品牌、操作系统或版本验证记录作为准入白名单，MUST NOT 要求 UA Client Hints 版本信息。兼容性 SHALL 由实际接口、签名及初始化调用结果决定；版本信息仅用于记录验证环境。

#### Scenario: Compatible interface on a different browser version
- **WHEN** 当前浏览器提供兼容的原生接口并通过初始化探测，即使其版本未经验证或版本信息不可用
- **THEN** 系统允许创建 HTML 承载，不因版本号、品牌或操作系统拒绝

#### Scenario: Unsupported browser
- **WHEN** 浏览器缺失经验证的原生接口，或实验功能未启用
- **THEN** 创建 HTML 承载失败并报告原因，已存在的普通 zrender 图形仍能使用

### Requirement: Native DOM rendering and canvas ownership
系统 SHALL 把组件容器置于真正执行绘制的 Canvas 所允许的 DOM 子树中，并在快照可用后按场景绘制顺序绘制。系统 MUST 区分普通容器初始化与传入 Canvas 初始化，不得把另一 Canvas 的 DOM 直接交给当前 Canvas 绘制。

#### Scenario: First paint
- **WHEN** 外部组件首次挂载且浏览器尚未准备好快照
- **THEN** 系统等待有效绘制通知，快照就绪后显示组件，不产生未处理异常

#### Scenario: Interleave with ordinary graphics
- **WHEN** 支持的同一 Canvas 场景中 HTML 元素前后存在普通图元
- **THEN** 绘制遵循场景排序，不把全部 HTML 统一追加到最顶层

### Requirement: Automatic visual synchronization
系统 SHALL 使用浏览器的原生可视更新通知使组件变化自动反映到 Canvas，合并重复失效并清除旧画面。外部调用方无需手动刷新；场景几何变化也 SHALL 触发绘制与命中同步。

#### Scenario: DOM or visual state changes
- **WHEN** 组件文字、样式、布局、输入光标或支持的 CSS 动画改变可视快照
- **THEN** 在后续可用绘制周期显示最新内容，无旧像素残留或持续自触发重绘循环

#### Scenario: Unrelated scene redraw
- **WHEN** zrender 因普通图元变化重绘 HTML 所在区域
- **THEN** HTML 内容继续存在，并按正确顺序重新绘制

### Requirement: Native hit geometry synchronization
系统 SHALL 按实际支持的原生接口同步 DOM 绘制位置与命中几何，正确处理 Canvas CSS 尺寸、DPR 和元素变换。系统 MUST 避免原生组件事件与 zrender 处理路径造成重复业务回调。

#### Scenario: Input under scale and DPR
- **WHEN** 在 DPR 为 1 或 2 且父组缩放的场景中点击输入框并输入
- **THEN** 点击定位到正确原 DOM，文字尺寸和光标位置一致，组件回调不因桥接重复触发

### Requirement: Explicit unsupported scene and export behavior
系统 MUST 发布经验证的层级、裁剪、增量绘制、hover 层、离屏及导出支持矩阵。不能保持原生 DOM 归属或命中正确性的组合 SHALL 在使用前明确拒绝。HTML 图像导出首版不作为保证能力，导出包含 HTML 的场景 MUST 明确报告不支持，不得静默遗漏 HTML。

#### Scenario: Unsupported layer migration or clipping
- **WHEN** HTML 元素请求未支持的跨 Canvas 层迁移、渐进绘制或裁剪组合
- **THEN** 系统给出具体限制诊断，不把组件移入错误的绘制 Canvas 或保留过期命中区域

#### Scenario: Export containing HTML
- **WHEN** 调用方请求导出包含 HTML 的场景，而首版未实现对应导出路径
- **THEN** 导出明确失败并说明 HTML 限制；不含 HTML 的原有导出行为保持不变

### Requirement: Export guard scope
系统 SHALL 在 zrender 提供的 Canvas 导出方法中统一拒绝仍属于场景的 HTML 元素，包括被 ignore 的元素，覆盖单 Canvas 快速返回、多层合成和高分辨率重绘。已移出场景的宿主不再阻止普通导出。此契约不拦截调用方直接操作原始 Canvas 的浏览器导出方法，也不保证其输出。

#### Scenario: Hidden HTML and direct canvas access
- **WHEN** 场景仍包含被 ignore 的 HTML，调用方使用 zrender Canvas 导出方法
- **THEN** 返回 UNSUPPORTED_EXPORT；文档明确直接调用原始 Canvas 的 toDataURL/toBlob 不属于该拦截范围
