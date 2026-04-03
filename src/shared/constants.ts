import { HomepageSettings } from '../app/types';

export const VIEW_TYPE_HOMEPAGE = 'homepage-dashboard-view';

export const DEFAULT_SETTINGS: HomepageSettings = {
  // 通用设置
  openOnStartup: false,
  globalFilter: '(-"SCRIPTS") and (-"TODO")',
  customPluginFolder: 'SCRIPTS/dashboard-plugins',
  language: 'system',

  // TODO 通用设置
  todoSourceFolder: 'TODO',
  todoStatsFile: 'SCRIPTS/data/daily_stats.json',
  weekStart: 0,

  // 布局配置
  layout: {
    gridColumns: 12,
    gridGap: '16px',
    enableDragDrop: true,
    modules: [
      { id: 'date-progress', order: 0, width: 6, x: 0, y: 0, w: 6, h: 8, enabled: true, title: '' },
      {
        id: 'contribution-graph',
        order: 1,
        width: 12,
        x: 0,
        y: 8,
        w: 12,
        h: 8,
        enabled: true,
        title: '📈 Activity',
      },
      {
        id: 'daily-todo',
        order: 2,
        width: 4,
        x: 0,
        y: 16,
        w: 4,
        h: 10,
        enabled: true,
        title: '📅 Daily Tasks',
      },
      {
        id: 'regular-todo',
        order: 3,
        width: 4,
        x: 4,
        y: 16,
        w: 4,
        h: 10,
        enabled: true,
        title: '📝 Regular Tasks',
      },
      {
        id: 'jottings-todo',
        order: 4,
        width: 4,
        x: 8,
        y: 16,
        w: 4,
        h: 10,
        enabled: true,
        title: '✍️ Jottings Tasks',
      },
      {
        id: 'recent-files',
        order: 5,
        width: 12,
        x: 0,
        y: 26,
        w: 12,
        h: 8,
        enabled: true,
        title: '🗂️ Recent Files',
        showTitle: false,
      },
      {
        id: 'random-note',
        order: 6,
        width: 6,
        x: 0,
        y: 34,
        w: 6,
        h: 8,
        enabled: true,
        title: '🎲 Random Note',
      },
      {
        id: 'tmp-note',
        order: 7,
        width: 6,
        x: 6,
        y: 34,
        w: 6,
        h: 8,
        enabled: true,
        title: '📝 Tmp Note',
      },
    ],
  },

  // 日期进度
  dateProgress: {
    dateFormat: 'YYYY-MM-DD',
    showStats: true,
    excludeFolders: ['SCRIPTS', 'TODO', 'VIEWS'],
  },

  // 活跃度图
  contributionGraph: {
    tooltipEnabled: true,
    enableDailyTodo: true,
    enableRegularTodo: true,
    enableJottingsTodo: true,
  },

  // Daily TODO
  dailyTodo: {
    dailyFileName: 'daily.md',
    maxItems: 10,
    enableCrontab: true,
    showPinButton: true,
    showAbandonButton: true,
    showDeleteButton: true,
    statusFilters: ['today'],
    sortBy: 'default',
    sortOrder: 'asc',
  },

  // Regular TODO
  regularTodo: {
    dateFormat: 'YYMMDD',
    autoCreateFile: true,
    maxItems: 10,
    showPinButton: true,
    showAbandonButton: true,
    showDeleteButton: true,
    statusFilters: ['active'],
    sortBy: 'default',
    sortOrder: 'asc',
  },

  // Jottings TODO
  jottingsTodo: {
    jottingsFolder: 'jottings',
    doneTag: 'jottings/done',
    abandonedTag: 'jottings/abandoned',
    maxItems: 10,
    templatePath: '',
    jottingsPathPattern: '[jottings]/YYYY/MM', // Default to User's preference
    showPinButton: true,
    showAbandonButton: true,
    showDeleteButton: true,
    statusFilters: ['active'],
    sortBy: 'default',
    sortOrder: 'asc',
  },

  // 近期文档
  recentFiles: {
    defaultFileLimit: 6,
    creationDateProperty: 'create_date',
    modifiedDateProperty: 'modified_date',
    columns: [
      { id: 'notes', title: '📝 Notes', source: '"notes" or "works/notes"' },
      { id: 'jottings', title: '✍️ Jottings', source: '"jottings"' },
      { id: 'clippings', title: '📚 Clippings', source: '"clippings" or "works/clippings"' },
      { id: 'tasks', title: '✅ Tasks', source: '"works/tasks"' },
    ],
  },

  // 随机笔记
  randomNote: {
    randomNoteSource: '(-"SCRIPTS") and (-"TODO") and (-"VIEWS")',
  },

  // 临时笔记
  tmpNote: {
    tmpNotePath: 'works/tmp/tmp.md',
  },
};
