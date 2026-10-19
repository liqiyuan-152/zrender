# HTML Content API Reference (Draft)

本文件是 docs/html-content.md 的草案片段，供设计阶段参考。正式文档在任务 1.4 创建。

---

## 浏览器能力检测

同步接口仅检查特征是否存在，不证明 paint、快照、命中或聚焦行为已验证。通过初筛后仍需等待宿主异步初始化。

```typescript
import { checkHTMLCanvasSupport } from 'zrender';

const support = checkHTMLCanvasSupport();
if (support.featuresPresent) {
  // 仅通过初筛，可以尝试创建宿主；不能据此宣称可用
  console.log('支持的特性:', support.features);
} else {
  console.warn('不支持原生 HTML 渲染:', support.reason);
  console.log('缺失的能力:', support.missingCapabilities);
  // 建议回退到纯 SVG 或提示用户升级浏览器
}
```

**返回类型：**
```typescript
interface HTMLCanvasSupportResult {
  featuresPresent: boolean;
  reason?: string;  // 不支持时的原因
  missingCapabilities?: string[];  // 缺失的关键能力列表
  features?: Array<'drawElementImage' | 'paint' | 'autoGeometrySync' | 'inert'>;
  browserVersion?: string;  // 检测到的浏览器版本
}
```

---

## 错误码定义

所有 HTML 相关错误使用统一的 `HTMLHostError` 类型：

```typescript
enum HTMLHostErrorCode {
  CAPABILITY_MISSING = 'HTML_CAPABILITY_MISSING',
  CYCLIC_DEPENDENCY = 'HTML_CYCLIC_DEPENDENCY',
  INVALID_TARGET = 'HTML_INVALID_TARGET',
  UNSUPPORTED_EXPORT = 'UNSUPPORTED_EXPORT',
  LAYOUT_COMPUTATION_FAILED = 'HTML_LAYOUT_COMPUTATION_FAILED',
  UNSUPPORTED_LAYER_MIGRATION = 'HTML_UNSUPPORTED_LAYER_MIGRATION',
  INITIALIZATION_FAILED = 'HTML_INITIALIZATION_FAILED',
  INITIALIZATION_TIMEOUT = 'HTML_INITIALIZATION_TIMEOUT',
  DISPOSED = 'HTML_DISPOSED',
  RENDER_FAILED = 'HTML_RENDER_FAILED',
}

interface HTMLHostError extends Error {
  code: HTMLHostErrorCode;
  context?: {
    targetId?: string;
    hostId?: string;
    failedOperation?: string;
    [key: string]: unknown;
  };
}
```

**同步错误与异步错误分开处理：** 以下代码在 async 函数内使用。
```typescript
try {
  const host = createHTMLHost(zr, {
    ...options,
    onError: error => console.error('运行期错误', error),
    onStateChange: state => console.log('宿主状态', state)
  });
  // element 已稳定存在，可先挂载内容；不要等 ready 才挂载。
  // 此处由应用挂载组件，完成后等待：
  await host.ready;
} catch (err) {
  console.error('创建或初始化失败', err);
}
```

## 就绪、状态和运行期诊断

拟定句柄包含 `element`、`state`、`ready: Promise<void>`、`updateLayout(config)` 和 `dispose()`。状态为 pending / active / suspended / disposed。options 的 `onError` 和 `onStateChange` 在创建时注册，避免首次异步通知丢失。

- 参数无效或明确缺失特征时同步抛错，回滚已分配资源。
- 初筛成功后立即返回 pending 宿主，element 可挂载。系统用自己的最小非交互探测内容验证异步绘制链路，不依赖业务组件先出现；不得通过抢用户焦点做运行期聚焦测试，完整交互行为由指定浏览器验收记录保证。
- 初始化成功时 ready resolve 一次；可显示宿主进入 active，隐藏或零面积宿主进入 suspended。ready 只表示后端初始化成功，不保证字体、图片或业务组件首次画面已完成。
- `initializationTimeoutMs` 默认 10000，必须为有限正数。超时报告 INITIALIZATION_TIMEOUT，不能将后台页面调度延迟诊断为永久能力缺失。失败使 ready reject、清理探测/监听/调度并进入 disposed；element 保留为空间供框架卸载，不由系统卸载框架内容。调用方须处理 ready rejection。
- 初始化期间 dispose 使 ready 以 DISPOSED 拒绝，取消后续通知；ready 已完成时不再次结算。异步初始化失败仅由 ready 报告，避免与 onError 重复。
- ready 成功后的布局或绘制错误通过 onError 报告，仅暂停受影响宿主，不抛出到全局刷新。相同 code + targetId + failedOperation 在一次连续故障内只通知一次，恢复后可重新通知。
- 修正 layout 时调用 updateLayout；目标重新有效时由依赖失效自动重试，成功后恢复 active，不重建组件、不自动聚焦。绘制错误只在新快照/场景失效时重试，禁止逐帧空转。后端不可恢复错误释放后端资源并进入 disposed，由外部卸载后重新创建。
- 状态先变更再回调；每个回调后重新检查存活状态。回调自身抛错不得打断其他宿主的刷新，也不得递归调用 onError，使用独立控制台诊断。

Promise 为新增异步 API 的运行时要求，旧环境须由调用方提供兼容实现；ES3 编译不会自动补齐 Promise。

---

## 布局绑定 API

### 坐标模式对比

| 模式 | 适用场景 | 容器是否跟随目标旋转 | 固定尺寸行为 | fill 尺寸行为 |
|------|---------|---------------------|------------|-------------|
| `follow` | 需要跟随目标完整变换的 UI（如标签、悬浮说明） | 是 | 在局部空间保持尺寸 | 使用目标局部边界尺寸 |
| `screen` | 需要保持正向的控件（如输入框、按钮） | 否（轴对齐） | 在场景空间保持尺寸 | 使用目标变换后的 AABB 尺寸 |

### 示例：follow 模式跟随旋转的 Rect

```typescript
const rect = new Rect({
  shape: { x: 100, y: 100, width: 200, height: 100 },
  rotation: Math.PI / 4,  // 45度旋转
});
zr.add(rect);

const host = createHTMLHost(zr, {
  layout: {
    target: rect,
    mode: 'follow',  // 容器会跟随旋转
    placement: 'inside',
    padding: [10, 10],
    width: 'fill',
    height: 'fill'
  }
});

// 将 host 传给下方实际返回 Portal 的 React 组件。
```

### 示例：screen 模式保持正向的 Input

```typescript
const host = createHTMLHost(zr, {
  layout: {
    target: rect,  // 即使 rect 旋转，容器也保持正向
    mode: 'screen',
    placement: 'inside',
    padding: [5, 8],
    width: 'fill',
    height: 32  // 固定高度，在场景坐标系中始终是 32 逻辑像素
  }
});
```

### 示例：自定义布局计算（底部对齐）

```typescript
const host = createHTMLHost(zr, {
  layout: {
    target: rect,
    mode: 'follow',
    compute: ({ bounds }) => {
      // bounds 是目标的局部包围盒
      return {
        x: bounds.x + 12,
        y: bounds.y + bounds.height - 40,  // 底部对齐
        width: Math.max(0, bounds.width - 24),
        height: 32
      };
    }
    // compute 会覆盖 padding/fill，但仍需在同一坐标空间
  }
});
```

---

## 组件样式建议

### React 完整挂载与清理示例（拟定 API）

调用 `mountExample(canvasContainer, reactContainer)`；两个参数为页面上独立的 DOM 容器，返回的函数用于最终清理。本例不等待 ready 才挂载 Portal，避免相互等待。示例尚未运行，须在框架任务中编译并实测。

```tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { init, Rect, createHTMLHost } from 'zrender';
import type { HTMLHost } from 'zrender';

function InputContent({ host }: { host: HTMLHost }) {
  const [value, setValue] = useState('');
  return createPortal(
    <input
      value={value}
      onChange={event => setValue(event.target.value)}
      style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
    />,
    host.element
  );
}

export function mountExample(canvasContainer: HTMLElement, reactContainer: HTMLElement) {
  const zr = init(canvasContainer, { renderer: 'canvas', width: 640, height: 320 });
  const rect = new Rect({
    shape: { x: 40, y: 60, width: 320, height: 80 },
    style: { fill: '#fff' }
  });
  zr.add(rect);
  let host: HTMLHost;
  try {
    host = createHTMLHost(zr, {
      layout: { target: rect, mode: 'follow', padding: [16, 12] },
      onError: error => console.error('宿主运行失败', error)
    });
  } catch (error) {
    zr.dispose();
    throw error;
  }
  const root = createRoot(reactContainer);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    root.unmount(); // 先卸载 Portal 及组件
    host.dispose();
    zr.dispose();
  };
  root.render(<InputContent host={host} />);
  void host.ready.then(
    () => { if (!stopped) console.log('后端已就绪'); },
    error => {
      if (!stopped) {
        console.error('初始化失败', error);
        stop();
      }
    }
  );
  return stop;
}
```

由于布局绑定只控制**容器**尺寸，组件需要使用 CSS 填满容器：

```tsx
// React 示例
<input 
  style={{ 
    width: '100%',   // 填满容器宽度
    height: '100%',  // 填满容器高度
    border: 'none',
    boxSizing: 'border-box'
  }} 
/>
```

```vue
<!-- Vue 示例 -->
<input 
  :style="{ 
    width: '100%', 
    height: '100%',
    border: 'none',
    boxSizing: 'border-box'
  }" 
/>
```

---

## TypeScript 类型导出

核心类型会从 zrender 主入口导出：

```typescript
import type {
  HTMLHost,
  HTMLHostOptions,
  LayoutBindingConfig,
  HTMLHostErrorCode
} from 'zrender';
```

如果需要更细粒度的类型，可以从子路径导入（取决于最终构建配置）：

```typescript
import type { LayoutVersion } from 'zrender/canvas/html';
import type { ComputeLayoutFn } from 'zrender/dom/html/layout';
```

---

## 支持矩阵（待任务 1.2-1.4 完成后填充）

| 浏览器 | 版本 | 原生 Canvas API | inert 支持 | 备注 |
|--------|------|----------------|-----------|------|
| Chrome | 待实测 | 待实测 | 待行为验证 | 记录实验开关与接口特征 |
| Firefox | 待实测 | 待实测 | 待行为验证 | 不预设支持旧接口 |
| Safari | 待实测 | 待实测 | 待行为验证 | 与 SVG 支持分别记录 |
| Edge | 待实测 | 待实测 | 待行为验证 | 记录实验开关与接口特征 |

首版两个后端均要求经验证的原生 inert 宿主级阻断，缺失时返回 CAPABILITY_MISSING；不修改组件后代的 tabindex/disabled 来降级。此表为空白验证计划，不是已验证的兼容承诺。

---

## 安全与隐私考虑

1. **compute 回调中的边界访问：** `compute` 函数可以读取目标元素的 `getBoundingRect()` 结果，但这些信息已经在同一 zrender 场景中可见，不构成额外信息泄露。不允许在 compute 中修改目标或访问其他场景。

2. **框架子树隔离：** 系统不会读取或修改外部框架在 `host.element` 内挂载的 DOM 节点（除了容器边界的 inert/visibility 等系统属性），组件状态和事件处理完全由框架管理。

3. **跨域内容：** 如果组件加载跨域图片或资源，Canvas 可能受污染（tainted），导致导出失败；这是浏览器的既有限制，与 HTML 功能无关。

---

**本草案待实际实现后更新完整的 API 签名、参数说明和浏览器测试结果。**
