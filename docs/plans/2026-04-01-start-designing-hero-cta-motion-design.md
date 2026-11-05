# Start Designing Hero CTA Motion Design

> 日期：2026-04-01
> 适用页面：`src/app/LandingPage.tsx`
> 目标组件：`src/app/components/LiquidGlassButton.tsx`

---

## 1. 目标

把首页 Hero 区域的 `Start Designing` 主按钮升级为基于参考 demo 的高识别度 CTA 动效，同时保持 navbar 和其他按钮不受影响。

核心目标：
- 保留当前 landing 页的液态玻璃语义
- 只作用于 Hero CTA
- 还原 demo 的四个关键反馈：左侧黑色墨滴扩散、文字反白、双箭头穿梭、顶层玻璃高光
- 保持点击跳转与现有测试可维护性

## 2. 设计边界

本次包含：
- Hero CTA 专用 DOM 结构
- Hero CTA 专用 hover / active 动效
- 针对该结构的单元测试

本次不包含：
- navbar CTA 改版
- 其他按钮复用该动效
- 额外 JS 驱动动画
- 路由或交互行为改动

## 3. 推荐方案

采用“组件变体 + 专用 CSS”的方式。

具体做法：
- 在 `LiquidGlassButton` 中增加 Hero 专用变体
- 由 `LandingPage` 只给 `Start Designing` 传入该变体
- 在按钮内部渲染专用层次：`fill-ink`、`icon-zone`、双箭头容器、文字层、玻璃高光层
- 其余默认按钮结构保持不变

原因：
- 能完整承载 demo 的动画语言
- 不会污染 navbar 的样式边界
- 结构清晰，测试可直接断言 Hero CTA 是否使用了专用层

## 4. 结构设计

Hero CTA 需要以下层次：
- 最外层：现有 liquid glass shell
- 背景层：左侧圆形 `fill-ink`
- 内容层：左侧 `icon-zone` + 右侧文字
- 箭头层：两支箭头重叠，hover 时一出一进
- 顶层覆盖：独立高光 / 边框层，保证黑色填满后仍保留玻璃质感

## 5. 动效规则

默认态：
- 左侧黑色圆形固定在按钮起始位
- 文字为深色
- 第一支箭头可见，第二支箭头隐藏在左侧外部

Hover：
- `fill-ink` 放大到覆盖按钮主体
- 文本颜色切换为白色
- 第一支箭头向右穿出并淡出
- 第二支箭头从左侧补位进入
- 按钮整体轻微放大仍由外层 motion 负责

Active：
- 按钮主体轻微缩放

## 6. 测试要求

需要新增测试保证：
- Hero CTA 使用专用动效变体
- Hero CTA 渲染出墨滴层、双箭头层和文字层
- 该结构只出现在 Hero CTA，不扩散到其他按钮
- 现有点击跳转行为保持不变
