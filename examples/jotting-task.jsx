/* eslint-disable */
/**
 * jotting-task.jsx  —  Brainattic Jotting Task Module
 *
 * External single-file plugin for Salt Dashboard.
 * Directly queries notes with type:jotting via metadataCache.
 * No TODO/ checkbox files involved.
 *
 * State mapping (frontmatter):
 *   status: inbox                    → active (unpinned)
 *   status: inbox  +  tags: [pinned] → pinned
 *   status: done                     → completed
 *   status: archive                  → abandoned
 */

const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Notice, Setting, TFile } = Obsidian;

// ─── i18n ─────────────────────────────────────────────────────────────────────

const RESOURCES = {
  en: {
    title: 'Jotting Tasks',
    empty: 'No jotting tasks.',
    loading: 'Loading...',
    addPlaceholder: 'New jotting title...',
    add: 'Add',
    pin: 'Pin',
    unpin: 'Unpin',
    complete: 'Complete',
    uncomplete: 'Mark incomplete',
    abandon: 'Abandon',
    restore: 'Restore',
    delete: 'Delete note',
    deleteConfirm: 'Delete this jotting note permanently?',
    filter: { active: 'Active', done: 'Done', archive: 'Archived' },
    settings: {
      heading: 'Jotting Task Settings',
      allowedRoots: 'Allowed root folders',
      allowedRootsDesc: 'Comma-separated roots to scan for jotting notes (default: personal,work)',
      newJottingRoot: 'New jotting root',
      newJottingRootDesc: 'Root folder for newly created jotting notes',
      showPinButton: 'Show pin button',
      showAbandonButton: 'Show abandon button',
      showDeleteButton: 'Show delete button',
    },
  },
  zh: {
    title: '灵感任务',
    empty: '没有灵感任务。',
    loading: '加载中…',
    addPlaceholder: '新灵感笔记标题…',
    add: '添加',
    pin: '置顶',
    unpin: '取消置顶',
    complete: '完成',
    uncomplete: '标为未完成',
    abandon: '放弃',
    restore: '恢复',
    delete: '删除笔记',
    deleteConfirm: '确认永久删除这篇灵感笔记？',
    filter: { active: '活跃', done: '已完成', archive: '已放弃' },
    settings: {
      heading: '灵感任务设置',
      allowedRoots: '允许的根目录',
      allowedRootsDesc: '逗号分隔，扫描灵感笔记的根目录（默认：personal,work）',
      newJottingRoot: '新建笔记根目录',
      newJottingRootDesc: '新建灵感笔记时使用的根目录',
      showPinButton: '显示置顶按钮',
      showAbandonButton: '显示放弃按钮',
      showDeleteButton: '显示删除按钮',
    },
  },
};

const getLocale = () => {
  const lang = window.localStorage.getItem('language') || (window.moment?.locale?.() ?? 'en');
  return lang.startsWith('zh') ? 'zh' : 'en';
};

const t = key => {
  const keys = key.split('.');
  let v = RESOURCES[getLocale()];
  for (const k of keys) v = v?.[k];
  if (v !== undefined) return v;
  v = RESOURCES['en'];
  for (const k of keys) v = v?.[k];
  return v ?? key;
};

// ─── Default settings ─────────────────────────────────────────────────────────

const MODULE_ID = 'brainattic-jotting-task';

const DEFAULTS = {
  allowedRoots: ['personal', 'work'],
  newJottingRoot: 'personal',
  showPinButton: true,
  showAbandonButton: true,
  showDeleteButton: true,
};

// ─── Service ──────────────────────────────────────────────────────────────────

class JottingService {
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;
  }

  // Read per-file frontmatter tags as a normalised array.
  _tags(fm) {
    const raw = fm?.tags ?? [];
    return Array.isArray(raw) ? raw : [raw];
  }

  // Derive display status from frontmatter.
  _status(fm) {
    const s = fm?.status ?? 'inbox';
    if (s === 'inbox' && this._tags(fm).includes('pinned')) return 'pinned';
    return s; // 'inbox' | 'done' | 'archive'
  }

  // Collect all jotting notes from the configured roots.
  fetchTasks() {
    const roots = this.cfg.allowedRoots ?? DEFAULTS.allowedRoots;
    return this.app.vault
      .getMarkdownFiles()
      .filter(f => roots.some(r => f.path.startsWith(r + '/')))
      .flatMap(f => {
        const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
        if (fm?.type !== 'jotting') return [];
        return [
          {
            id: f.path,
            file: f,
            basename: f.basename,
            status: this._status(fm),
            fm,
          },
        ];
      });
  }

  // ── Frontmatter helpers ──────────────────────────────────────────────────────

  async _update(file, fn) {
    await this.app.fileManager.processFrontMatter(file, fn);
  }

  async setStatus(file, status) {
    await this._update(file, fm => {
      fm.status = status;
    });
  }

  async setPinned(file, pinned) {
    await this._update(file, fm => {
      let tags = Array.isArray(fm.tags) ? [...fm.tags] : fm.tags ? [fm.tags] : [];
      if (pinned) {
        if (!tags.includes('pinned')) tags.push('pinned');
      } else {
        tags = tags.filter(t => t !== 'pinned');
      }
      fm.tags = tags;
    });
  }

  // ── Operations ───────────────────────────────────────────────────────────────

  async toggleComplete(task) {
    if (task.status === 'done') {
      await this.setStatus(task.file, 'inbox');
    } else {
      await this.setStatus(task.file, 'done');
      await this.setPinned(task.file, false);
    }
  }

  async togglePin(task) {
    if (task.status === 'pinned') {
      await this.setPinned(task.file, false);
    } else if (task.status === 'inbox') {
      await this.setPinned(task.file, true);
    }
  }

  async toggleAbandon(task) {
    if (task.status === 'archive') {
      await this.setStatus(task.file, 'inbox');
    } else {
      await this.setStatus(task.file, 'archive');
    }
  }

  async deleteTask(task) {
    await this.app.vault.delete(task.file);
  }

  async addTask(title) {
    const root = this.cfg.newJottingRoot ?? DEFAULTS.newJottingRoot;
    const dir = `${root}/${window.moment().format('YYYY/MM')}`;
    const path = `${dir}/${title.trim()}.md`;

    if (!this.app.vault.getAbstractFileByPath(dir)) {
      await this.app.vault.createFolder(dir);
    }

    const content = `---\ntype: jotting\nstatus: inbox\ntags: []\n---\n\n# ${title.trim()}\n`;
    const file = await this.app.vault.create(path, content);
    this.app.workspace.openLinkText(file.basename, file.path);
  }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

function TaskItem({ task, cfg, svc, onRefresh }) {
  const isDone = task.status === 'done';
  const isArchive = task.status === 'archive';
  const isPinned = task.status === 'pinned';

  const act = async fn => {
    try {
      await fn();
    } catch (err) {
      new Notice('Jotting Task: ' + err.message);
    }
    onRefresh();
  };

  return (
    <div
      className={`todoItem${isPinned ? ' pinned' : ''}${isDone ? ' completed' : isArchive ? ' abandoned' : ''}`}
    >
      <input
        type="checkbox"
        className="checkbox"
        checked={isDone}
        onChange={() => act(() => svc.toggleComplete(task))}
        disabled={isArchive}
      />

      <span
        className="content"
        onClick={() => app.workspace.openLinkText(task.basename, task.file.path)}
        style={{ cursor: 'pointer' }}
        title={task.file.path}
      >
        {task.basename}
      </span>

      <div className="actions">
        {cfg.showPinButton && !isDone && !isArchive && (
          <button
            className={`shared-item-action-btn${isPinned ? ' pinned' : ''}`}
            onClick={e => {
              e.stopPropagation();
              act(() => svc.togglePin(task));
            }}
            title={isPinned ? t('unpin') : t('pin')}
          >
            {isPinned ? '📌' : '📍'}
          </button>
        )}
        {cfg.showAbandonButton && !isDone && (
          <button
            className="shared-item-action-btn abandon-btn"
            onClick={e => {
              e.stopPropagation();
              act(() => svc.toggleAbandon(task));
            }}
            title={isArchive ? t('restore') : t('abandon')}
          >
            {isArchive ? '↩️' : '❌'}
          </button>
        )}
        {cfg.showDeleteButton && (
          <button
            className="shared-item-action-btn delete-btn"
            onClick={e => {
              e.stopPropagation();
              if (confirm(t('deleteConfirm'))) act(() => svc.deleteTask(task));
            }}
            title={t('delete')}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['active', 'done', 'archive'];

const JottingTaskModule = () => {
  const cfg = useMemo(() => {
    try {
      return app.plugins?.getPlugin?.('salt-dashboard')?.settings?.[MODULE_ID] ?? DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }, []);

  const svc = useMemo(() => new JottingService(app, cfg), [cfg]);

  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(['active']);
  const [isAdding, setIsAdding] = useState(false);
  const [addText, setAddText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setTasks(svc.fetchTasks());
  }, [svc]);

  const debouncedLoad = useMemo(() => debounce(load, 300), [load]);

  useEffect(() => {
    load();
    const ref = app.metadataCache.on('changed', debouncedLoad);
    return () => app.metadataCache.offref(ref);
  }, [load, debouncedLoad]);

  const visible = useMemo(() => {
    const STATUS_PRIORITY = { pinned: 0, inbox: 1, done: 2, archive: 3 };
    return tasks
      .filter(task => {
        if (filters.includes('active') && (task.status === 'inbox' || task.status === 'pinned'))
          return true;
        if (filters.includes('done') && task.status === 'done') return true;
        if (filters.includes('archive') && task.status === 'archive') return true;
        return false;
      })
      .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
  }, [tasks, filters]);

  const toggleFilter = v =>
    setFilters(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  const handleAdd = async () => {
    if (!addText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await svc.addTask(addText.trim());
      setAddText('');
      setIsAdding(false);
      load();
    } catch (e) {
      new Notice('Jotting Task: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(v => (
          <button
            key={v}
            onClick={() => toggleFilter(v)}
            style={{
              fontSize: '0.75em',
              padding: '1px 8px',
              borderRadius: '10px',
              border: '1px solid var(--color-accent)',
              cursor: 'pointer',
              background: filters.includes(v) ? 'var(--color-accent)' : 'transparent',
              color: filters.includes(v) ? 'var(--text-on-accent)' : 'var(--color-accent)',
            }}
          >
            {t('filter.' + v)}
          </button>
        ))}
      </div>

      {/* Scrollable task list */}
      <div className="task-list" style={{ flex: 1, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '6px', opacity: 0.5, fontSize: '0.9em' }}>{t('empty')}</div>
        ) : (
          visible.map(task => (
            <TaskItem key={task.id} task={task} cfg={cfg} svc={svc} onRefresh={load} />
          ))
        )}
      </div>

      {/* Add bar - anchored at bottom outside scroll */}
      <div className="add-task-container">
        {!isAdding ? (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            {t('addPlaceholder')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') {
                  setAddText('');
                  setIsAdding(false);
                }
              }}
              placeholder={t('addPlaceholder')}
              className="add-task-input"
              style={{ flex: 1 }}
            />
            <button
              className="confirm-add-btn"
              onClick={handleAdd}
              disabled={submitting || !addText.trim()}
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings panel ───────────────────────────────────────────────────────────

const renderSettings = (containerEl, plugin, settings) => {
  if (!settings[MODULE_ID]) settings[MODULE_ID] = { ...DEFAULTS };
  const cfg = settings[MODULE_ID];

  containerEl.createEl('h3', { text: t('settings.heading') });

  new Setting(containerEl)
    .setName(t('settings.allowedRoots'))
    .setDesc(t('settings.allowedRootsDesc'))
    .addText(text =>
      text.setValue((cfg.allowedRoots ?? DEFAULTS.allowedRoots).join(', ')).onChange(async v => {
        const roots = v
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        cfg.allowedRoots = roots.length ? roots : DEFAULTS.allowedRoots;
        await plugin.saveSettings();
      })
    );

  new Setting(containerEl)
    .setName(t('settings.newJottingRoot'))
    .setDesc(t('settings.newJottingRootDesc'))
    .addText(text =>
      text.setValue(cfg.newJottingRoot ?? DEFAULTS.newJottingRoot).onChange(async v => {
        cfg.newJottingRoot = v.trim() || DEFAULTS.newJottingRoot;
        await plugin.saveSettings();
      })
    );

  for (const [key, label] of [
    ['showPinButton', 'settings.showPinButton'],
    ['showAbandonButton', 'settings.showAbandonButton'],
    ['showDeleteButton', 'settings.showDeleteButton'],
  ]) {
    new Setting(containerEl).setName(t(label)).addToggle(toggle =>
      toggle.setValue(cfg[key] ?? true).onChange(async v => {
        cfg[key] = v;
        await plugin.saveSettings();
      })
    );
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  id: MODULE_ID,
  title: t('title'),
  icon: 'sparkles',
  defaultSettings: { [MODULE_ID]: { ...DEFAULTS } },
  defaultLayout: { w: 4, h: 10 },
  component: JottingTaskModule,
  renderSettings,
};
