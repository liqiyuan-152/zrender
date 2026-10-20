# HTML 内容承载（M1）

M1 提供框架无关的稳定 DOM 容器、HTML 场景句柄及最小原生 Canvas 接入。绑定、完整快照版本、SVG、React/Vue 属于后续里程碑。

## 公共 API 与原生挂载

```ts
import { init, createHTMLHost } from 'zrender';

export function mount(container: HTMLElement) {
    const zr = init(container, { renderer: 'canvas', width: 640, height: 240 });
    let host: ReturnType<typeof createHTMLHost>;
    try {
        host = createHTMLHost(zr, { x: 80, y: 40, width: 240, z: 1 });
    }
    catch (error) {
        zr.dispose();
        throw error;
    }
    const input = document.createElement('input');
    input.style.cssText = 'box-sizing:border-box;width:100%;height:32px';
    input.onchange = () => console.log(input.value);
    host.element.appendChild(input); // 不必等待 ready 才挂载。
    zr.remove(host.sceneElement); // 普通移出保留容器和应用子树。
    zr.add(host.sceneElement);    // 重新加入同一实例。

    let stopped = false;
    const stop = () => {
        if (stopped) { return; }
        stopped = true;
        host.element.removeChild(input); // 应用先卸载自身内容。
        host.dispose();
        zr.dispose();
    };
    host.ready.catch(error => { console.error(error); stop(); });
    return stop;
}
```

安装依赖并运行 npm run build，通过静态 HTTP 服务提供仓库根目录，打开 test/html-host-foundation.html 运行检查。该用例直接使用公共 API，无框架依赖，覆盖挂载、隐藏、移出/重加、最终释放和普通导出恢复。

导出 HTMLHost、HTMLHostOptions、HTMLHostLayout、HTMLHostState、HTML、HTMLProps。直接 new HTML 后加入场景会明确报错；场景句柄由工厂关联后端。

- createHTMLHost(zr, options) 返回 element、sceneElement、state、ready、updateLayout、dispose。
- M1 options 支持有限数值 x/y、非负 width、可选非负 height 和 zlevel/z/z2。省略 height 时使用 ResizeObserver 测量逻辑 border-box 内容高度，不从变换后的包围盒反推尺寸。
- updateLayout({x?, y?, width, height?}) 更新独立布局；传入 layout 明确拒绝。target/follow/screen/padding/fill/compute 由 M2 实施。
- initializationTimeoutMs 默认 10000，要求有限正数。Promise 是运行时要求，ES3 编译不提供 polyfill。
- 同步参数/特征错误直接抛出，异步初始化由 ready 成功或拒绝。ready 表示后端探测完成，不表示业务内容、字体或图片首次画面已完成。
- 状态为 pending/active/suspended/disposed；onError 接收运行期诊断，onStateChange 接收状态变化；初始化错误仅通过 ready 报告。完整恢复矩阵由 M2 验收。

## 所有权与生命周期

系统拥有稳定 element、场景句柄、尺寸观察器、paint 订阅和几何注册。应用拥有子树、框架组件、值和业务监听器。系统不复制节点，也不合成 input/change/composition。

隐藏、零面积、移出场景或不支持的重叠使宿主暂停：撤销原生几何、设置 inert 并退出内部焦点。恢复不自动 focus。重新加入同一 zr 保留节点和组件值；跨实例加入明确拒绝。

最终释放顺序为 **应用/框架卸载 → host.dispose() → zr.dispose()**。host.dispose 幂等；zr.dispose 同时释放已注册但已移出场景的宿主，但不能替代框架卸载。释放后更新和重加报 DISPOSED，过期 paint/观察通知不会复活句柄。

宿主的 width、box-sizing、transform、visibility、inert、contain:paint 和 overflow:hidden 由系统管理。应用 CSS 写入子树；应用控件可设置 width:100%。M1 以宿主矩形作为绘制/命中边界，移除 containment 或覆盖宿主 width 会明确诊断。body 弹层和原生 top-layer 弹层不属于承载契约，不保证第三方组件透明兼容。

## 能力与诊断

**兼容性规则（2026-10-20）：** 不设浏览器版本号、品牌或操作系统白名单，也不要求 UA / UA Client Hints 版本信息。是否启用 HTML in Canvas 仅由实际原生接口、接口签名及初始化调用结果决定。浏览器版本只用于记录验证环境，不作为运行条件。不支持的接口分支和调用失败仍须明确诊断，不能仅凭版本号认定兼容，也不能因版本未经测试而直接拒绝。

checkHTMLCanvasSupport(document?) 无 DOM 时安全返回缺失 DOM。featuresPresent 仅初筛特征，candidate 为 drawable/layout-subtree/unknown，不证明快照或交互行为。工厂等待原生 paint，实际调用 drawElementImage，并验证返回有限二维 DOMMatrix、CSS 矩阵应用及几何注册/清除调用。准入不再依赖操作系统和 Chrome 精确版本；不兼容签名仍明确拒绝。运行时探测不等于所有浏览器组合均已完成交互验收。

诊断为原生 Error，name=HTMLHostError，消息为 [CODE] message，带 code/context。hostId/targetId 保留数值或字符串，failedOperation 标记操作。导出 HTMLHostErrorCode 和 createHTMLHostError。

## 浏览器与首版边界

下表的具体浏览器版本为历史验证环境，不是版本准入清单。

| 环境/组合 | M1 结果或策略 | 诊断 |
| --- | --- | --- |
| Windows Chrome 155.0.8059.85，canvas-draw-element@1 | 已验证 layoutsubtree 旧接口，返回 DOMMatrix；显式 CSS 矩阵和几何注册 | 不承诺其他版本行为相同 |
| macOS Chrome，启用 canvas-draw-element | 2026-10-19 本机实测示例编辑保存、移动、隐藏恢复；公共用例 DPR 1/2 各 25 项检查通过，含真实像素、命中、重排和释放 | 按原生接口探测准入；未验证真实 OS 中文输入法 |
| 直接 Canvas/DPR 1、容器初始化/DPR 2 | 公共用例验证像素、基本命中、生命周期；旧接口 snapshot 已含 DPR，避免再次放大 | 完整父变换和重排版本仍待 M3 |
| content=drawable 当前提案分支 | 收到 paint，但绘制报错要求 layoutsubtree，未启用此分支 | CAPABILITY_MISSING |
| Firefox/Safari/Edge | 未运行，不从 Chrome 推断支持 | 缺接口或签名不兼容时拒绝 |
| 缺 DOM、native inert 或实验 API | 拒绝 HTML，普通图元不受影响 | CAPABILITY_MISSING |
| SVG HTML / SSR HTML | M4 实施；当前不创建宿主，普通 SVG/SSR 入口保留 | CAPABILITY_MISSING |
| 前景 paint AABB 与 HTML 相交 | 绘制/提交几何前拒绝并暂停，移开/隐藏/改为背景后恢复 | UNSUPPORTED_SCENE |
| 多层、迁移、场景裁剪、hover、增量、非 source-over、自定义 beforeBrush/afterBrush | M1 拒绝；保守 AABB 可能拒绝实际透明像素未重叠的组合 | UNSUPPORTED_SCENE / UNSUPPORTED_LAYER_MIGRATION |
| 脏矩形、motionBlur、自定义或虚拟 Canvas 层 | M1 拒绝，M3 再实现/验证重绘策略 | UNSUPPORTED_SCENE |
| zrender Canvas 导出含 HTML，包括 ignore | 在单 Canvas 快速返回前拒绝；移出后恢复普通导出 | UNSUPPORTED_EXPORT |
| 原始 Canvas toDataURL/toBlob | 不属于 zrender 拦截范围，不保证 HTML 输出 | 无拦截 |

HTML 宿主内的鼠标、触摸与指针事件由原生控件处理，不再触发底层 zrender 图元事件；控件自身和页面的 DOM 事件冒泡仍保留。从 Canvas 开始的鼠标或指针拖拽可以在 HTML 控件上方继续并结束。存在 HTML 宿主时，仅刷新 hover 也会重新验证场景并重绘普通层，避免暂停后残留旧像素。HTML 绘制与后续图元的 Canvas 样式缓存相互隔离。

原生自动遮挡命中确实失败；当前通过明确限制组合解决，未将浏览器行为改判通过。隐藏后缓存快照失效，恢复必须等待新的 paint。

真实中文“测试中文”及 compositionstart/update/end、change/blur 已记录；compositionend 的 isTrusted=false 原因未查明，未合成替代事件。IME 中暂停、selection、框架回调、完整父变换和连续重排内部命中仍待后续验收。

## 验证与后续

[M1 验证记录](../openspec/changes/add-framework-agnostic-html-element/m1-validation.md) 汇总版本、配置、历史失败和检查；最新公共入口证据为 [m1-public-host-evidence.json](../openspec/changes/add-framework-agnostic-html-element/m1-public-host-evidence.json)。

M1 最小 Canvas 接入不等同于 M3 整体验收。M2 布局绑定和完整恢复、M3 快照版本/父变换/性能、M4 SVG、M5 框架集成和 IME 暂停继续按任务清单推进。

