---
title: Salt Dashboard PRD
description: 产品需求文档 - Obsidian Salt Dashboard 插件
categories:
tags:
  - homepage
  - obsidian
  - plugin
  - prd
create_date: 2026-02-09T18:27
modified_date: 2026-02-24T00:00
cssclasses:
  - wide-view
status: draft
version: 1.0.8
---

## Salt Dashboard - 产品需求文档 (PRD)

### 📋 项目概述

#### 项目名称

**Salt Dashboard** (中文名：Salt 仪表盘)

#### 项目背景

替代原有的 DataviewJS 脚本 (`homepage.js`)，解决以下痛点:

- 依赖 Dataview 插件，启动和渲染性能较差
- 无法在非 Dataview 块中使用
- 配置管理分散，用户体验不佳
- 缺少原生 Obsidian API 支持
- 移动端优化不足

#### 项目目标

构建一个独立的 Obsidian 插件，实现:

1. **性能优化**: 脱离 Dataview，使用原生 API 和 React 渲染
2. **用户体验**: 提供图形化设置界面，降低配置门槛
3. **扩展性**: 微内核+插件架构，支持第三方扩展和用户自定义模块
4. **稳定性**: 完整的错误处理和数据备份机制
5. **移动优先**: 完善的移动端适配和触摸交互
6. **国际化**: 支持多语言界面（中/英文）

#### 当前状态 (v1.0.8)

✅ **已完成核心功能**:

- 微内核架构与模块注册系统
- 响应式网格布局（支持拖拽、调整大小）
- 动态设置面板与模块化配置
- 国际化支持（中英文）
- 8个内置功能模块
- 外部插件加载机制

🔧 **进行中**:

- 全面的单元测试
- 类型定义清理与优化

---

### 🎯 核心功能

#### 1. 响应式网格布局系统

##### 功能描述

基于 `react-grid-layout` 实现的动态网格布局系统，支持拖拽、调整大小和响应式适配。

##### 核心特性

- **12列网格系统**:
  - 桌面端使用 12 列网格布局，支持模块宽度 1-12 精细调整
  - 模块坐标与尺寸 (x, y, w, h) 持久化存储
  - 默认布局预定义于 `DEFAULT_SETTINGS.layout.modules`
- **拖拽与调整大小**:
  - 每个模块右上角显示拖拽手柄（Grip 图标）
  - **交互限制**: 仅当拖动手柄时才能移动模块，避免误触
  - 支持模块边缘调整大小，自动吸附到网格列数
- **响应式适配**:
  - **断点定义**:
    - `lg` (≥1200px): 12列
    - `md` (≥996px): 12列
    - `sm` (≥768px): 6列（平板）
    - `xs` (≥480px): 4列（大屏手机）
    - `xxs` (<480px): 2列（小屏手机）
  - **自适应宽度逻辑**:
    - 平板端: 大模块占满宽度，小模块占半宽
    - 移动端: 强制单列堆叠，所有模块占满宽度
  - 自动重新排列避免空白区域
- **布局管理**:
  - `LayoutManager` 服务负责同步布局配置
  - 支持"恢复默认布局"功能
  - 自动检测新模块并添加到布局
  - 清理孤立模块配置（设置面板）

#### 2. 动态设置面板

##### 功能描述

基于模块注册表动态生成的插件配置界面，提供统一的设置管理体验。

##### 核心特性

- **通用设置**:
  - 启动时自动打开仪表盘
  - TODO 源文件夹配置（应用于所有待办模块）
  - **全局过滤器**:
    - 应用于"近期文档"和"随机笔记"模块
    - 支持逻辑运算符 (AND, OR, NOT)、标签 (#tag) 和路径字符串 ("folder")
    - 使用 `SourceParser` 解析 Dataview 风格查询
    - 默认排除: SCRIPTS, TODO, Templates 文件夹
- **扩展模块管理**:
  - 自定义插件文件夹配置
  - 支持加载外部 `.js`/`.jsx` 插件文件
  - 实时重新加载插件
  - 清理孤立模块配置
- **活动模块管理**:
  - 可视化模块开关（启用/禁用）
  - 模块禁用时自动隐藏其设置区域
  - 待办模块与贡献图数据源自动同步
- **动态模块配置**:
  - 每个模块通过 `renderSettings` 方法定义自己的配置 UI
  - 设置面板遍历 `ModuleRegistry` 动态加载模块配置
  - 模块配置仅在模块启用时显示
- **布局管理**:
  - 一键重置布局到默认配置
- **危险区域**:
  - **恢复初始设置**: 重置所有插件配置为默认值（需二次确认）
  - **撤销恢复**: 仅在重置操作后出现，允许撤销上一次重置

#### 3. 国际化 (i18n)

##### 功能描述

基于 `i18next` 和 `react-i18next` 的多语言支持，自动适配 Obsidian 界面语言。

##### 核心特性

- **多语言支持**:
  - 默认支持英语 (`en`)、简体中文 (`zh`, `zh-cn`, `zh-CN`, `zh-tw`, `zh-TW`) 以及机翻生草中文 (`zh-meme`)
  - 语言资源文件独立管理于 `src/i18n/locales/`
  - 易于扩展其他语言（添加新语言文件并注册）
- **自动检测与切换**:
  - 优先使用 `moment.locale()` 检测 Obsidian 界面语言
  - 支持通过 `window.localStorage.getItem('language')` 覆盖
  - 语言切换需重启插件或重载布局
- **翻译覆盖范围**:
  - 设置面板：所有标签、描述、按钮文本
  - 命令面板：命令名称、Ribbon 图标提示
  - 模块界面：模块标题、按钮、提示、占位符、错误信息
  - 待办任务：状态标签、操作按钮
  - 贡献图：工具提示、模态框内容
- **技术实现**:
  - `I18nextProvider` 包裹整个 React 应用
  - 使用 `useTranslation` hook 获取翻译函数
  - 模块标题通过 `DraggableModule` 动态本地化

---

### 🧩 模块化架构 (Modular Architecture)

> 本项目采用微内核架构，所有功能模块均作为"插件"注册到系统中。

#### 核心概念

1.  **ModuleRegistry (模块注册表)**:
    - 单例模式，管理所有可用模块的生命周期
    - 提供 `register(module)`, `getModule(id)`, `getAllModules()` 接口
    - 支持订阅注册表变更（用于 UI 刷新）
    - 插件启动时，所有内置模块自动注册到注册表

2.  **DashboardModule (模块接口)**:
    所有模块必须实现以下接口：

    ```typescript
    interface DashboardModule {
      id: string; // 唯一标识 (e.g., "recent-files")
      title: string; // 显示名称（支持 i18n key）
      icon: string; // 图标（Lucide 图标名或 SVG）
      defaultSettings: Record<string, any>; // 模块默认配置
      defaultLayout?: {
        // 可选默认布局配置
        w?: number; // 默认宽度（1-12）
        h?: number; // 默认高度（行单位）
        showTitle?: boolean; // 是否显示标题
      };
      component: React.ComponentType<any>; // 渲染组件
      renderSettings: (
        containerEl: HTMLElement,
        plugin: Plugin,
        settings: HomepageSettings
      ) => void;
    }
    ```

3.  **上下文注入 (Context Injection)**:
    - `ObsidianContext`: 提供 `app` (Obsidian App 实例)
    - `SettingsContext`: 提供 `settings` (完整配置), `updateSettings()` (配置更新回调)
    - 模块组件通过 `useObsidian()` 和 `useSettings()` hooks 访问上下文
    - 支持模块间的松散耦合通信（如贡献图监听待办模块数据变化）

#### 内置模块列表

##### 1. 日期与进度模块 (DateProgressModule)

- **ID**: `date-progress`
- **功能**: 显示当前日期、星期、季度、周数、年度进度和笔记统计。
- **配置项**: `showStats` (显示统计), `excludeFolders` (排除文件夹)
- **特性**:
  - 仿真撕页日历样式
  - 年度进度条可视化（智能定位）
  - 实时笔记统计（总数、本周/今日修改/新增）

##### 2. 活跃度图表模块 (ContributionGraphModule)

- **ID**: `contribution-graph`
- **功能**: GitHub 风格的年度活跃度热力图，可视化每日任务完成情况。
- **配置项**: `enableDailyTodo`, `enableRegularTodo`, `enableJottingsTodo`, `clickBehavior` (点击行为)
- **特性**:
  - 53周×7天网格布局，5级颜色深度
  - 支持三种点击行为：弹窗详情、跳转文件、筛选任务
  - 自动从三个待办模块收集数据
  - 支持按月/按年翻页查看历史数据

##### 3. 待办任务管理系统

采用面向对象继承架构，共享 `TodoBaseService` 基础逻辑。

- **3.1 日常待办模块 (DailyTodoModule)**
  - **ID**: `daily-todo`
  - **功能**: 管理每日重复的日常任务，支持简化 crontab 语法调度。
  - **配置项**: `dailyFileName`, `enableCrontab`
  - **特性**:
    - 任务完成状态独立存储于 `daily_stats.json`
    - 置顶状态 (`- [!]`) 持久化到源文件
    - 支持 crontab 表达式控制任务显示日期

- **3.2 常规待办模块 (RegularTodoModule)**
  - **ID**: `regular-todo`
  - **功能**: 管理按日期独立的每日任务文件（如 `260209.md`）。
  - **配置项**: `dateFormat`, `autoCreateFile`
  - **特性**:
    - 每日任务独立文件，完成后直接修改文件内容
    - 自动创建今日文件（可选）
    - 支持任务筛选（进行中/已完成/已放弃）

- **3.3 随手记待办模块 (JottingsTodoModule)**
  - **ID**: `jottings-todo`
  - **功能**: 管理与 jottings 笔记链接的任务，完成时自动更新笔记标签。
  - **配置项**: `jottingsFolder`, `doneTag`, `abandonedTag`, `templatePath`
  - **特性**:
    - 自动扫描包含 `[[jottings/xxx]]` 链接的任务
    - 完成任务时自动更新笔记标签（`jottings` → `jottings/done`）
    - 支持 Templater 模板创建新 jottings 笔记

##### 4. 近期文档模块 (RecentFilesModule)

- **ID**: `recent-files`
- **功能**: 多列展示不同分类的近期文档，支持自定义列配置。
- **配置项**: `columns` (列配置), `defaultFileLimit`, `creationDateProperty`, `modifiedDateProperty`
- **特性**:
  - 动态列配置（标题、数据源查询、Templater 模板）
  - 支持全局过滤器
  - 原生悬停预览 (Hover Preview)
  - 响应式列数（桌面4列、平板2列、移动1列）

##### 5. 随机笔记模块 (RandomNoteModule)

- **ID**: `random-note`
- **功能**: 每日自动/手动切换展示随机笔记预览。
- **配置项**: `randomNoteSource` (查询), `previewLength`, `mobilePreviewLength`
- **特性**:
  - 基于日期的缓存随机选择
  - 支持全局过滤器
  - 原生悬停预览
  - 可调整预览高度

##### 6. 临时笔记模块 (TmpNoteModule)

- **ID**: `tmp-note`
- **功能**: 展示临时笔记文件的内容预览，用于快速记录和查看。
- **配置项**: `tmpNotePath`, `tmpNoteHeight`
- **特性**:
  - 低调设计（默认折叠，细边框）
  - 实时预览临时笔记内容
  - 展开后显示"打开文件"按钮

#### 外部插件支持

##### 功能描述

支持从自定义文件夹加载用户编写的第三方模块，扩展仪表盘功能边界。

##### 核心特性

- **插件加载机制**:
  - 从 `customPluginFolder` 配置的文件夹加载 `.js`/`.jsx` 文件
  - 支持 JSX 实时转译（使用 sucrase）
  - 自动注册符合 `DashboardModule` 接口的模块
- **运行环境**:
  - 提供 `require` shim 支持 `react` 和 `obsidian` 模块
  - 模块导出支持 CommonJS 或 ES Module 格式
- **管理功能**:
  - 设置面板提供"重新加载插件"按钮
  - 自动同步新模块到布局配置
  - 清理孤立模块配置

---

### 🎨 UI/UX 设计规范

#### 响应式布局实现

- **移动优先设计**: 所有模块组件适配移动端 (`< 640px`)
- **网格自适应策略**:
  - **桌面端 (≥1200px)**: 12列网格，模块按配置宽度显示
  - **平板端 (768px-1199px)**: 6列网格，大模块占满宽度，小模块占半宽
  - **移动端 (<768px)**: 4列或2列网格，强制单列堆叠
- **自适应宽度逻辑** (`GridLayout.tsx`):
  - 平板端: 原始宽度≥8列的模块强制占满宽度(6列)，4-7列模块占半宽(3列)
  - 移动端: 所有模块占满可用宽度
  - 自动重新排列避免空白区域

#### 视觉设计

- **模块卡片设计**:
  - 统一卡片样式: 圆角边框、阴影、内边距
  - 标题栏可配置显示/隐藏
  - 拖拽手柄位于右上角（Grip 图标）
- **主题适配**:
  - 使用 Obsidian CSS 变量 (`--background-primary`, `--text-normal` 等)
  - 自动检测深色/浅色模式 (`theme-dark` 类)
  - 贡献图配色方案适配主题 (`github` 或 `monokai`)
- **动画与过渡**:
  - 模块悬停效果: 背景色变化 + 左边框高亮
  - 折叠/展开动画: 平滑高度过渡
  - 进度条填充动画: 宽度渐变

#### 交互规范

- **链接预览**: 所有文件链接使用 `<a class="internal-link" data-href="...">` 结构，触发 Obsidian 原生悬停预览
- **拖拽交互**:
  - 仅拖拽手柄可触发模块移动，避免内容误触
  - 调整大小限制在模块边缘
  - 拖拽时显示占位符（虚线框）
- **模块头部操作**:
  - 操作按钮绝对定位在右上角（紧邻拖拽手柄）
  - 统一按钮样式: 24×24px，悬停背景色变化
  - 移动端收纳到齿轮菜单
- **设置面板交互**:
  - 模块配置使用折叠面板节省垂直空间
  - 危险操作需二次确认（按钮变为"Are you sure?"）
  - 实时保存配置变更

---

### 🛠️ 技术架构

> 详细的技术架构文档已移动至: [Technical Architecture](docs/architecture.md)

---
