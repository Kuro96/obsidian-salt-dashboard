---
title: Salt Dashboard PRD
description: 产品需求与当前实现对齐文档 - Obsidian Salt Dashboard 插件
categories:
tags:
  - homepage
  - obsidian
  - plugin
  - prd
create_date: 2026-02-09T18:27
modified_date: 2026-03-31T00:00
cssclasses:
  - wide-view
status: draft
version: 0.1.1
---

## Salt Dashboard - 产品需求文档

### 项目概述

#### 项目名称

**Salt Dashboard**

#### 项目背景

该插件用于替代原有 DataviewJS 版首页脚本 `homepage.js`，目标是把首页能力迁移到独立 Obsidian 插件中，减少 Dataview 依赖，提供更完整的设置界面、更稳定的原生 API 集成和更好的移动端体验。

#### 项目目标

1. 用原生 Obsidian API 与 React 渲染替代 DataviewJS 方案。
2. 提供图形化设置面板，降低配置门槛。
3. 以微内核 + 模块注册表方式支持内置模块和外部扩展模块。
4. 优化移动端体验与触摸交互。
5. 提供中英文与扩展语言支持。

#### 当前状态 (v0.1.1)

已实现：

- 微内核式模块注册与动态设置面板
- 响应式网格布局、拖拽与尺寸调整
- 8 个内置模块
- 外部插件加载机制
- 多语言支持与语言切换设置
- TODO 模块统一提交流程与重复提交保护

当前技术债：

- TypeScript 类型系统尚未收敛，当前存在 `tsc --noEmit` 错误
- 模块默认配置协议不统一
- 若干配置项已声明但运行时未真正接入
- 测试基础设施已存在，但自动化覆盖仍然很少

---

### 核心能力

#### 1. 响应式网格布局系统

- 基于 `react-grid-layout` 实现模块化首页布局。
- 桌面端使用 12 列网格；平板和移动端按断点压缩列数并自动重排。
- 模块位置和尺寸以 `(x, y, w, h)` 持久化到设置中。
- 支持拖拽排序与模块边缘缩放。
- 仅拖拽手柄可触发模块移动，避免误触内容区域。
- `LayoutManager` 在启动和模块变更时同步布局，并支持恢复默认布局。

#### 2. 动态设置面板

- 设置页基于模块注册表动态渲染。
- 通用设置包含：
  - 启动时自动打开 Dashboard
  - TODO 源文件夹配置
  - 全局过滤器
  - 自定义插件目录
  - 语言选择（System / EN / ZH / ZH-Meme）
- 支持启用/禁用模块。
- 仅在模块启用时显示其设置区域。
- 支持重载外部插件、清理孤立模块配置、恢复默认布局、恢复初始设置与撤销恢复。

#### 3. 国际化

- 基于 `i18next` 与 `react-i18next`。
- 当前支持：`en`、`zh` 系列、`zh-meme`。
- 覆盖设置面板、模块标题、模块内按钮与提示文案。
- 支持通过插件设置显式切换语言，而不是只依赖 Obsidian 默认语言。

---

### 模块化架构

#### 核心结构

1. `ModuleRegistry`

- 统一管理内置模块和外部模块。
- 提供注册、查询、遍历与订阅能力。

2. `DashboardModule`

- 每个模块定义自己的 `id`、标题、图标、默认布局、React 组件与设置渲染逻辑。
- 当前代码中 `defaultSettings` 协议仍需进一步收敛，这是已知技术债。

3. 上下文注入

- `ObsidianContext` 提供 `app` 和插件实例。
- `SettingsContext` 提供当前设置与更新入口。
- 模块通过 hooks 获取上下文，并在各自 service 中调用 Obsidian API。

#### 内置模块列表

##### 1. Date Progress

- **ID**: `date-progress`
- **功能**: 显示日期、星期、周数、季度、年度进度和笔记统计。
- **已实现配置**:
  - `showStats`
- **已存在但未在设置页暴露的配置**:
  - `excludeFolders`
- **实现特性**:
  - 撕页日历视觉风格
  - 年度进度条与日期信息联动展示
  - 基于 Vault 文件统计今日、本周、总量等信息

##### 2. Contribution Graph

- **ID**: `contribution-graph`
- **功能**: GitHub 风格年度活跃度热力图，基于待办模块数据统计每日完成量。
- **当前已稳定工作的配置**:
  - `enableDailyTodo`
  - `enableRegularTodo`
  - `enableJottingsTodo`
- **当前代码中已声明但未完整接入的配置**:
  - `clickBehavior`
  - `jumpTarget`
  - `colorScheme`
  - `cacheExpiry`
  - `showPagination`
- **实现特性**:
  - 53 周 × 7 天网格
  - 颜色深度按数量变化
  - 可汇总三个 TODO 模块的数据源
- **当前限制**:
  - 点击行为尚未达到文档层面的 modal / jump / filter 全量能力
  - `TaskDetailModal` 组件已存在，但当前主流程未真正接入

##### 3. TODO 模块体系

共享基础：

- 三个 TODO 模块共用 `TodoBaseService` 的部分解析和写回逻辑。
- 新增任务流程已统一为共享提交状态管理，并增加同步锁与幂等保护，减少重复写入。
- 当前写回仍主要依赖 `lineNumber`，这是需要继续加固的技术债。
- 桌面端任务行操作按钮默认收起，在 hover 行时展开并参与布局，因此会重新挤压文本；移动端与平板端继续保留文本和按钮的显式间隔布局。
- TODO 模块支持按模块配置是否显示 `pin`、`abandon`、`delete` 行内操作按钮。
- TODO 列表滚动容器保留稳定的 scrollbar gutter，用于降低编辑时临时锁滚动导致的文本重排与选区抖动。

###### 3.1 Daily Todo

- **ID**: `daily-todo`
- **功能**: 管理每日重复任务，支持简化 crontab 调度。
- **配置项**:
  - `dailyFileName`
  - `dailyStatsPath`
  - `enableCrontab`
- **实现特性**:
  - 完成状态独立记录到统计文件
  - 支持置顶、筛选、排序
  - 支持 Today / Future 视图与下次触发时间计算
  - 支持配置是否显示 pin / delete 操作按钮

###### 3.2 Regular Todo

- **ID**: `regular-todo`
- **功能**: 管理按日期分文件的常规待办。
- **配置项**:
  - `dateFormat`
  - `autoCreateFile`
- **实现特性**:
  - 支持状态筛选
  - 支持按日期文件组织任务
  - 可按配置自动创建当日文件
  - 支持配置是否显示 pin / abandon / delete 操作按钮

###### 3.3 Jottings Todo

- **ID**: `jottings-todo`
- **功能**: 管理与 Jottings 笔记关联的待办任务。
- **配置项**:
  - `jottingsFolder`
  - `doneTag`
  - `abandonedTag`
  - `templatePath`
- **实现特性**:
  - 支持识别 `[[path]]` 与 `[[path|alias]]`
  - 完成任务时更新关联笔记标签
  - 删除任务时可同时删除关联 Jottings 笔记
  - 支持基于模板创建新 Jottings 笔记
  - 支持配置是否显示 pin / abandon / delete 操作按钮

##### 4. Recent Files

- **ID**: `recent-files`
- **功能**: 按多列展示不同来源的近期文件。
- **当前主要配置**:
  - `columns`
  - `defaultFileLimit`
  - `creationDateProperty`
  - `modifiedDateProperty`
- **实现特性**:
  - 列级数据源配置
  - 全局过滤器接入
  - 支持在全局过滤器与列来源查询中使用 `.属性` / `.属性=值` 形式的 frontmatter 过滤
  - 设置页提供 Recent Files 查询语法的 hover 帮助说明
  - 原生 Hover Preview
  - 快速创建笔记
  - 模板文件建议器
  - frontmatter pin 状态切换
- **当前限制**:
  - `mobileFileLimit` 已声明，但运行时未真正使用

##### 5. Random Note

- **ID**: `random-note`
- **功能**: 展示每日随机笔记预览，并支持手动刷新。
- **当前主要配置**:
  - `randomNoteSource`
- **实现特性**:
  - 基于日期的随机缓存
  - 接入全局过滤器
  - 支持 Hover Preview
- **当前限制**:
  - `previewLength`、`mobilePreviewLength`、`randomNoteHeight` 已声明，但运行时尚未完整接入
  - 当前缓存 key 未完全绑定过滤条件与来源配置，设置变更后可能在当天命中旧缓存

##### 6. Tmp Note

- **ID**: `tmp-note`
- **功能**: 显示临时笔记内容，便于快速查看与打开。
- **当前主要配置**:
  - `tmpNotePath`
- **实现特性**:
  - 默认轻量展示
  - 展开后可直接打开源文件
- **当前限制**:
  - `tmpNoteHeight` 已声明，但运行时尚未接入

#### 外部插件支持

- 从配置目录加载 `.js` / `.jsx` / `.cjs` 外部模块。
- 支持运行时重载与同步到布局。
- 当前通过动态执行脚本注入 `react`、`obsidian` 等依赖。
- 当前缺少更严格的类型和 runtime shape 校验，这是后续重构重点之一。

---

### UI / UX 原则

- 保持 Obsidian 原生视觉风格，优先复用主题变量。
- 模块头部操作与拖拽手柄分离，避免误触。
- 移动端优先保证可读性和点击目标大小。
- 允许正文文本选择，不对整块内容绑定宽泛点击事件。
- 下拉层、头部操作、悬浮控件需保证正确的层级关系，避免被内容区域遮挡。

---

### 已知实现偏差

以下内容是当前实现与理想产品定义之间的差距，需要在后续版本中逐步收敛：

1. TypeScript 类型基线尚未恢复，当前存在编译错误。
2. `DashboardModule.defaultSettings` 协议不统一。
3. `Contribution Graph` 多个高级配置项尚未真正实现。
4. `Random Note`、`Tmp Note`、`Recent Files` 中存在已声明但未接线的配置项。
5. TODO 文件写回主要依赖行号，仍有并发修改风险。
6. 自动化测试基础设施存在，但覆盖率仍不足以为重构提供强保护。

---

### 技术架构文档

详细实现说明见 `docs/architecture.md`。
