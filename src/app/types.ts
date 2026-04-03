import { TFile } from 'obsidian';

// Crontab 字段
export interface CrontabField {
  type: 'all' | 'value' | 'range' | 'list' | 'step'; // 类型
  values: number[]; // 具体值列表
  step?: number; // 步长值 (仅 step 类型)
}

// Crontab 表达式接口
export interface CrontabExpression {
  raw: string; // 原始表达式 (如 "1-5 * 1-5")
  dayOfMonth: CrontabField; // 日期字段
  month: CrontabField; // 月份字段
  dayOfWeek: CrontabField; // 星期字段
}

// 任务接口
export interface Task {
  id: string; // 唯一标识
  text: string; // 任务内容(原始 Markdown)
  completed: boolean; // 是否完成
  isAbandoned: boolean; // 是否放弃
  isPinned: boolean; // 是否置顶
  isDaily: boolean; // 是否为日常任务
  isJottings: boolean; // 是否为 jottings 任务
  sourceFile: TFile | null; // 源文件对象
  sourcePath: string; // 源文件路径
  lineNumber: number; // 行号
  completedDate?: string; // 完成日期 (YYYY-MM-DD)
  abandonedDate?: string; // 放弃日期 (YYYY-MM-DD)
  tags: string[]; // 标签列表
  jottingLinks?: string[]; // 关联的 jottings 链接
  crontab?: CrontabExpression; // crontab 表达式 (仅 daily 任务)
  isDue?: boolean; // 是否今天到期 (动态计算)
  nextTriggerDate?: Date | null; // 下次触发日期 (动态计算)
}

// 模块布局配置
export interface ModuleLayout {
  id: string; // 模块唯一标识
  order?: number; // 显示顺序 (Deprecated: use x,y)
  width?: number; // 宽度 (Deprecated: use w)
  x?: number; // Grid X (0-11)
  y?: number; // Grid Y
  w?: number; // Grid Width (1-12)
  h?: number; // Grid Height (in row units)
  enabled: boolean; // 是否启用
  title?: string; // 模块标题 (Unified Layout)
  showTitle?: boolean; // 是否显示标题
}

// 布局系统配置
export interface LayoutConfig {
  modules: ModuleLayout[]; // 模块布局列表
  gridColumns: 12; // Grid 列数 (固定为12)
  gridGap: string; // 模块间距 (如 "16px")
  enableDragDrop: boolean; // 是否启用拖拽
}

// 基础模块配置
export interface ModuleConfig {
  maxItems?: number; // 最大显示数量
}

// TODO 模块基础配置
export interface TodoModuleConfig extends ModuleConfig {
  maxItems?: number; // 最大显示任务数
  todoSourceFolder?: string; // 源文件夹路径 (from global settings)
  statsFile?: string; // 统计数据文件路径 (from global settings, injected at runtime)
  templatePath?: string; // Templater 模板路径 (optional)
  jottingsFolder?: string; // jottings 文件夹路径 (optional)
  statusFilters?: string[]; // 状态过滤 (NEW)
  sortBy?: SortOption; // 排序方式 (NEW)
  sortOrder?: SortOrder; // 排序方向 (NEW)
  showPinButton?: boolean; // 是否显示置顶按钮
  showAbandonButton?: boolean; // 是否显示放弃按钮
  showDeleteButton?: boolean; // 是否显示删除按钮
}

// Daily TODO 配置
export interface DailyTodoConfig extends TodoModuleConfig {
  dailyFileName: string; // 日常任务文件名
  enableCrontab: boolean; // 是否启用 crontab 语法
}

// Regular TODO 配置
export interface RegularTodoConfig extends TodoModuleConfig {
  dateFormat: string; // 日期文件命名格式
  autoCreateFile: boolean; // 今日文件不存在时自动创建
  excludedFiles?: string[]; // 排除的文件名列表
}

// Jottings TODO 配置
export interface JottingsTodoConfig extends TodoModuleConfig {
  jottingsFolder: string; // jottings 笔记文件夹
  doneTag: string; // 完成时的标签
  abandonedTag: string; // 放弃时的标签
  templatePath?: string; // Templater 模板路径
  jottingsPathPattern?: string; // jottings 生成路径模式 (e.g. jottings/YYYY/MM)
}

// ContributionGraph 配置
export interface ContributionGraphConfig extends ModuleConfig {
  tooltipEnabled: boolean; // 是否启用悬停提示
  enableDailyTodo: boolean; // 是否启用 DailyTodo 数据源
  enableRegularTodo: boolean; // 是否启用 RegularTodo 数据源
  enableJottingsTodo: boolean; // 是否启用 JottingsTodo 数据源
}

// DateProgress 配置
export interface DateProgressConfig extends ModuleConfig {
  dateFormat: string; // 日期格式
  showStats: boolean; // 是否显示笔记统计
  excludeFolders: string[]; // 统计排除文件夹
}

// RecentFiles 配置
export interface RecentFilesConfig extends ModuleConfig {
  columns: ColumnConfig[]; // 列配置
  defaultFileLimit: number; // 默认文件数
  creationDateProperty?: string; // Frontmatter 字段名: 创建时间
  modifiedDateProperty?: string; // Frontmatter 字段名: 修改时间
}

export interface ColumnConfig {
  id: string; // 唯一标识
  title: string; // 列标题
  source: string; // 数据源查询
  icon?: string; // 图标
  templatePath?: string; // Templater 模板路径 (optional)
}

// RandomNote 配置
export interface RandomNoteConfig extends ModuleConfig {
  randomNoteSource: string; // 笔记源查询
}

// 排序选项
export type SortOption = 'default' | 'name' | 'modified' | 'created';
export type SortOrder = 'asc' | 'desc';

// TmpNote 配置
export interface TmpNoteConfig extends ModuleConfig {
  tmpNotePath: string; // 临时笔记路径
}

// 插件总配置
export interface HomepageSettings {
  // 通用设置
  openOnStartup: boolean; // 启动时自动打开
  globalFilter: string; // 全局过滤器 (Applied to Recent Files & Random Note)
  customPluginFolder: string; // 自定义插件文件夹路径
  language: string; // 语言设置 ('system', 'en', 'zh', 'zh-meme')

  // TODO 通用设置
  todoSourceFolder: string; // TODO 模块统一数据源文件夹
  todoStatsFile: string; // 任务统计数据 JSON 文件路径
  weekStart: number; // 一周起始日 (0=周日, 1=周一)

  // 布局配置
  layout: LayoutConfig; // 布局系统配置

  // 模块配置
  dateProgress: DateProgressConfig;
  contributionGraph: ContributionGraphConfig;
  dailyTodo: DailyTodoConfig;
  regularTodo: RegularTodoConfig;
  jottingsTodo: JottingsTodoConfig;
  recentFiles: RecentFilesConfig;
  randomNote: RandomNoteConfig;
  tmpNote: TmpNoteConfig;

  // Dynamic Module Settings
  [key: string]: unknown;
}
