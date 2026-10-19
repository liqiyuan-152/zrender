# OpenSpec Review Updates

本文档记录根据审核意见对 OpenSpec 文档的修改。“已完成”仅表示文档修订，功能和浏览器验证仍待实施。

---

## 修改日期
2026-10-19

---

## 修改摘要

基于 OpenSpec 审核意见，已完成以下优先级修复和补充：

### P0 优先修复（已完成）

1. **实验 API 版本管理策略** ([design.md](design.md))
   - 增加版本映射表和能力检测策略说明
   - 明确旧版本接口（layoutsubtree）的适配要求和降级拒绝逻辑
   - 在 tasks.md 1.2 中要求建立浏览器版本-特征映射表

2. **错误诊断格式定义** ([design.md](design.md) 文件规划 + [docs-draft-api-reference.md](docs-draft-api-reference.md))
   - 新增 `src/dom/html/diagnostics.ts` 文件用于统一错误定义
   - 定义 `HTMLHostErrorCode` 枚举（CAPABILITY_MISSING, CYCLIC_DEPENDENCY, INVALID_TARGET, UNSUPPORTED_EXPORT 等）
   - 增加结构化错误上下文示例
   - 在 tasks.md 2.1b 中独立任务创建该文件

3. **布局坐标转换详细说明** ([design.md](design.md))
   - 增加 follow 模式 5 步计算流程详解（局部边界与正确累计矩阵 → 局部 padding/fill → 后端不重复叠加宿主父级变换）
   - 增加 screen 模式 5 步计算流程详解（世界空间 → AABB → 场景坐标 → 固定尺寸语义 → 单位矩阵）
   - 在 tasks.md 2.6 中增加具体测试用例（目标在 (100,100)、父组缩放 2× 旋转 45°）

### P1 建议补充（已完成）

4. **性能基准和监控** ([design.md](design.md) Risks + [tasks.md](tasks.md) 3.11)
   - 在 Risks 增加性能退化风险说明和基准要求
   - 新增任务 3.11：建立性能基准（普通场景 vs 1/5/10 个 HTML 宿主，帧率和内存衰减曲线）
   - 固定环境与负载，记录帧耗时分位数及重绘成本；60fps 仅为特定环境参考
   - 新增 `benchmark/html-canvas.html` 文件

5. **框架示例的依赖隔离结构** ([design.md](design.md) 文件规划)
   - 增加 `test/html-frameworks/` 推荐目录结构示例
   - 明确每个示例独立 package.json、README 和运行步骤
   - 在 tasks.md 5.1, 5.2 中标注创建隔离目录
   - 在 tasks.md 6.2 中明确检查构建产物不包含 react/vue 导入痕迹

6. **交互暂停的能力要求** ([design.md](design.md) 第 4 节)
   - 要求经验证的原生 inert 阻断，缺失时拒绝创建
   - 删除未验证的组合降级，不修改框架子节点属性
   - 在 tasks.md 1.3 中要求验证 inert 支持度
   - 在 tasks.md 2.13 中要求验证嵌套及动态控件并记录不支持环境

7. **导出错误处理策略** ([design.md](design.md) 第 5 节)
   - 明确在 Canvas Painter.getRenderedCanvas 提前返回前和 SVG Painter.renderToString 入口检查 HTML 元素存在
   - 抛出 `UNSUPPORTED_EXPORT` 错误码
   - 在 tasks.md 3.7, 4.4 中明确修改入口和测试回归

8. **隐藏跟随的有效状态真值表** ([design.md](design.md) 第 6 节)
   - 增加完整真值表（ignore/invisible/移出场景 × followVisibility × 显示/命中）
   - 在 tasks.md 2.12 中要求验证所有组合

9. **Canvas 快照版本管理详细说明** ([design.md](design.md) 文件规划 + [tasks.md](tasks.md) 3.10)
   - 在 `src/canvas/html/types.ts` 注释中增加 LayoutVersion 结构说明（sequence, geometry, committedAt, snapshotReady）
   - 在 tasks.md 3.10 中要求测试过期快照不覆盖新提交（v1→v2→v3 时 v1 延迟到达）

### P2 可选优化（已完成）

10. **术语统一** ([design.md](design.md) Context)
    - 统一使用"宿主容器 (host container)"，避免"挂载容器""承载容器"混用
    - 统一使用"场景坐标系 (scene coordinates)"，不使用"画布逻辑坐标""屏幕坐标"
    - 明确"目标元素 (target element)"和"绑定 (binding)"术语

11. **任务与文件映射表** ([tasks.md](tasks.md))
    - 增加"任务与文件映射总览"表格，列出 25 个主要文件及对应任务编号
    - 在具体任务中增加 **[创建: xxx.ts]** 或 **[修改: xxx.ts]** 标注

12. **里程碑划分** ([tasks.md](tasks.md))
    - 增加 M1-M6 六个里程碑定义（Foundation, Layout Binding, Canvas Backend, SVG Backend, Framework Integration, Final Validation）
    - 每个里程碑包含任务范围、交付物和验收标准
    - 建议阶段性评审

13. **内存泄漏监控** ([tasks.md](tasks.md) 6.5)
    - 新增任务 6.5：1000 次创建/销毁循环后内存稳定性验证
    - 固定 GC 与卸载条件，检查宿主对象持续增长及 retained path，不使用任意堆比例或残留节点门槛
    - 记录内存曲线和快照比对结果

14. **无障碍性验证** ([tasks.md](tasks.md) 5.3)
    - 在框架示例测试中增加 ARIA 属性保留、键盘导航和屏幕阅读器验证
    - 明确手动验证要求和结果记录

15. **API 参考草案** ([docs-draft-api-reference.md](docs-draft-api-reference.md))
    - 创建 docs/html-content.md 的草案片段
    - 包含能力检测示例、错误码定义、布局 API 对比表、TypeScript 类型导出示例
    - 增加安全与隐私考虑章节

---

## 未修改但已明确的事项

以下审核意见中的内容已在原文档中隐式包含或由任务验收保证，无需额外修改：

- **文件规划与实际任务对应**：已通过"任务与文件映射表"解决
- **多个 spec 中的导出拒绝统一处理**：已在 design.md 明确策略和入口修改位置
- **布局计算的坐标空间转换**：已在 follow/screen 流程详解中明确
- **支持矩阵待填充**：docs-draft-api-reference.md 中已标明待任务 1.2-1.4 完成后填充

---

## 下一步行动

在开始任务 1.1（CodeGraph 核查）和 1.2（浏览器原型验证）之前：

1. ✅ 已完成 P0 和 P1 优先级文档补充
2. ✅ 已完成 P2 可选优化
3. ⬜ 团队评审修改后的 OpenSpec 文档
4. ⬜ 确认实验 API 版本映射表的格式和内容要求
5. ⬜ 开始 M1 里程碑实施

---

## 文档版本

- **原始 OpenSpec 创建日期**：2026-10-19
- **本次审核修改日期**：2026-10-19
- **修改人**：根据审核意见批量更新

---

**备注**：本文件随 OpenSpec 一同归档，记录设计阶段的迭代过程。

