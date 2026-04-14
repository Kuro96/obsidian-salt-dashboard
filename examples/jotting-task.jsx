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
    addBtn: 'New jotting task',
    addPlaceholder: 'Task title...',
    add: 'Add',
    pin: 'Pin',
    unpin: 'Unpin',
    complete: 'Complete',
    uncomplete: 'Mark incomplete',
    abandon: 'Abandon',
    restore: 'Restore',
    delete: 'Delete task',
    confirmDelete: 'Confirm delete',
    cancel: 'Cancel',
    filter: { active: 'Active', done: 'Done', archive: 'Archived' },
    sort: {
      default: 'Default',
      name: 'Name',
      modified: 'Modified',
      created: 'Created',
      ascending: 'Ascending',
      descending: 'Descending',
    },
    settings: {
      heading: 'Jotting Task Settings',
      allowedRoots: 'Allowed root folders',
      allowedRootsDesc:
        'Comma-separated list of roots to scan. New tasks are created in the first root that exists in the vault.',
      templatePath: 'Templater template path',
      templatePathDesc:
        'Path to a Templater template file (e.g. Templates/jotting.md). Leave blank to use the built-in frontmatter.',
      showPinButton: 'Show pin button',
      showAbandonButton: 'Show abandon button',
      showDeleteButton: 'Show delete button',
    },
  },
  zh: {
    title: '灵感任务',
    empty: '没有灵感任务。',
    loading: '加载中…',
    addBtn: '新建灵感任务',
    addPlaceholder: '任务标题…',
    add: '添加',
    pin: '置顶',
    unpin: '取消置顶',
    complete: '完成',
    uncomplete: '标为未完成',
    abandon: '放弃',
    restore: '恢复',
    delete: '删除任务',
    confirmDelete: '确认删除',
    cancel: '取消',
    filter: { active: '活跃', done: '已完成', archive: '已放弃' },
    sort: {
      default: '默认',
      name: '名称',
      modified: '修改时间',
      created: '创建时间',
      ascending: '升序',
      descending: '降序',
    },
    settings: {
      heading: '灵感任务设置',
      allowedRoots: '允许的根目录',
      allowedRootsDesc: '逗号分隔的根目录列表，新建任务时会依次查找第一个在 vault 中存在的目录。',
      templatePath: 'Templater 模板路径',
      templatePathDesc:
        '指向 Templater 模板文件的路径（如 Templates/jotting.md），留空则使用内置 frontmatter。',
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
  templatePath: '',
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

  // Return the first allowedRoot whose folder exists in the vault, or the first root as fallback.
  _resolveRoot() {
    const roots = this.cfg.allowedRoots ?? DEFAULTS.allowedRoots;
    for (const r of roots) {
      if (this.app.vault.getAbstractFileByPath(r)) return r;
    }
    return roots[0] ?? 'personal';
  }

  _getTemplater() {
    const tp = this.app.plugins?.plugins?.['templater-obsidian'];
    if (typeof tp?.templater?.create_new_note_from_template === 'function') return tp;
    return null;
  }

  async addTask(title) {
    const root = this._resolveRoot();
    const templatePath = this.cfg.templatePath?.trim();

    if (templatePath) {
      const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
      if (!(templateFile instanceof TFile)) {
        new Notice(`Jotting Task: Template not found: ${templatePath}`);
        return;
      }
      const templater = this._getTemplater();
      if (!templater) {
        new Notice('Jotting Task: Templater plugin is not enabled.');
        return;
      }
      const folder = this.app.vault.getAbstractFileByPath(root) ?? this.app.vault.getRoot();
      await templater.templater.create_new_note_from_template(templateFile, folder, title.trim());
      return;
    }

    // No template — create with minimal frontmatter
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
  const [isDeleting, setIsDeleting] = useState(false);

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
        {isDeleting ? (
          <>
            <button
              className="shared-item-action-btn confirm-delete"
              onClick={e => {
                e.stopPropagation();
                act(() => svc.deleteTask(task));
                setIsDeleting(false);
              }}
              title={t('confirmDelete')}
            >
              ✓
            </button>
            <button
              className="shared-item-action-btn cancel-btn"
              onClick={e => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
              title={t('cancel')}
            >
              ✗
            </button>
          </>
        ) : (
          <>
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
                  setIsDeleting(true);
                }}
                title={t('delete')}
              >
                🗑️
              </button>
            )}
          </>
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
  const [sortBy, setSortBy] = useState('default');
  const [sortOrder, setSortOrder] = useState('desc');
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
    const dir = sortOrder === 'asc' ? 1 : -1;

    return tasks
      .filter(task => {
        if (filters.includes('active') && (task.status === 'inbox' || task.status === 'pinned'))
          return true;
        if (filters.includes('done') && task.status === 'done') return true;
        if (filters.includes('archive') && task.status === 'archive') return true;
        return false;
      })
      .sort((a, b) => {
        // Pinned always floats to top regardless of sort mode
        const aPinned = a.status === 'pinned';
        const bPinned = b.status === 'pinned';
        if (aPinned !== bPinned) return aPinned ? -1 : 1;

        if (sortBy === 'name') return dir * a.basename.localeCompare(b.basename);
        if (sortBy === 'modified') return dir * (a.file.stat.mtime - b.file.stat.mtime);
        if (sortBy === 'created') return dir * (a.file.stat.ctime - b.file.stat.ctime);
        // default: status-priority order (inbox → done → archive)
        return (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9);
      });
  }, [tasks, filters, sortBy, sortOrder]);

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
      {/* Filter chips + sort controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '0 4px',
              fontSize: '11px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid var(--background-modifier-border)',
              background: 'var(--background-primary)',
              color: 'var(--text-muted)',
            }}
          >
            <option value="default">{t('sort.default')}</option>
            <option value="name">{t('sort.name')}</option>
            <option value="modified">{t('sort.modified')}</option>
            <option value="created">{t('sort.created')}</option>
          </select>
          <button
            className="header-action-btn"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
            title={sortOrder === 'asc' ? t('sort.ascending') : t('sort.descending')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
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
            {t('addBtn')}
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
    .setName(t('settings.templatePath'))
    .setDesc(t('settings.templatePathDesc'))
    .addText(text =>
      text
        .setPlaceholder('Templates/jotting.md')
        .setValue(cfg.templatePath ?? DEFAULTS.templatePath)
        .onChange(async v => {
          cfg.templatePath = v.trim();
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
