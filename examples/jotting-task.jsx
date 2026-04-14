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
    title: '✍️ Jotting Tasks',
    empty: 'No jotting tasks.',
    loading: 'Loading...',
    addBtn: '+ Add Task',
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
    title: '✍️ 灵感任务',
    empty: '没有灵感任务。',
    loading: '加载中…',
    addBtn: '+ 添加任务',
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
  statusFilters: ['active'],
  sortBy: 'modified',
  sortOrder: 'desc',
};

// ─── Lightweight shared-look controls ─────────────────────────────────────────

function HeaderActionButton({ icon, className = '', children, ...props }) {
  return (
    <button className={`header-action-btn ${className}`.trim()} {...props}>
      {icon}
      {children}
    </button>
  );
}

function MultiSelect({ options, selectedValues, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = value => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <HeaderActionButton
        className={isOpen ? 'multi-select-open' : ''}
        onClick={() => setIsOpen(open => !open)}
        title={label}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        }
      />
      {isOpen && (
        <div
          className="multi-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '140px',
            padding: '4px 0',
            textAlign: 'left',
            cursor: 'default',
          }}
          onClick={e => e.stopPropagation()}
        >
          {options.map(option => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-normal)',
                gap: '8px',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')
              }
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                style={{ margin: 0 }}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SortControls({ sortBy, sortOrder, onSortChange, onOrderChange, options }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <select
        className="rf-control-select"
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
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
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <HeaderActionButton
        onClick={() => onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        title={sortOrder === 'asc' ? t('sort.ascending') : t('sort.descending')}
        icon={sortOrder === 'asc' ? '↑' : '↓'}
      />
    </div>
  );
}

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
            mtime: getFileMtime(this.app, f),
            ctime: getFileCtime(this.app, f),
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

// ─── File time helpers (frontmatter-first, same as native getFileMtime/Ctime) ──

function getFileMtime(app, file) {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (fm?.modified_date) {
    const m = window.moment(fm.modified_date);
    if (m.isValid()) return m.valueOf();
  }
  return file.stat.mtime;
}

function getFileCtime(app, file) {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (fm?.create_date) {
    const m = window.moment(fm.create_date);
    if (m.isValid()) return m.valueOf();
  }
  return file.stat.ctime;
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
  const plugin = useMemo(() => app.plugins?.getPlugin?.('salt-dashboard') ?? null, []);
  const cfg = useMemo(() => {
    try {
      return plugin?.settings?.[MODULE_ID] ?? DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }, [plugin]);

  const svc = useMemo(() => new JottingService(app, cfg), [cfg]);

  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(cfg.statusFilters ?? DEFAULTS.statusFilters);
  const [sortBy, setSortBy] = useState(cfg.sortBy ?? DEFAULTS.sortBy);
  const [sortOrder, setSortOrder] = useState(cfg.sortOrder ?? DEFAULTS.sortOrder);
  const [isAdding, setIsAdding] = useState(false);
  const [addText, setAddText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const persistConfig = useCallback(
    async patch => {
      if (!plugin) return;
      const current = plugin.settings?.[MODULE_ID] ?? { ...DEFAULTS };
      plugin.settings[MODULE_ID] = { ...current, ...patch };
      await plugin.saveSettings();
    },
    [plugin]
  );

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

        let comparison = 0;
        if (sortBy === 'name') comparison = a.basename.localeCompare(b.basename);
        else if (sortBy === 'created') comparison = a.ctime - b.ctime;
        else comparison = a.mtime - b.mtime; // 'modified' (default)

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [tasks, filters, sortBy, sortOrder]);

  const updateFilters = useCallback(
    async nextFilters => {
      setFilters(nextFilters);
      await persistConfig({ statusFilters: nextFilters });
    },
    [persistConfig]
  );

  const updateSortBy = useCallback(
    async nextSortBy => {
      setSortBy(nextSortBy);
      await persistConfig({ sortBy: nextSortBy });
    },
    [persistConfig]
  );

  const updateSortOrder = useCallback(
    async nextSortOrder => {
      setSortOrder(nextSortOrder);
      await persistConfig({ sortOrder: nextSortOrder });
    },
    [persistConfig]
  );

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
      <div className="module-header-actions">
        <MultiSelect
          label={getLocale() === 'zh' ? '筛选' : 'Filter'}
          options={FILTER_OPTIONS.map(value => ({ label: t(`filter.${value}`), value }))}
          selectedValues={filters}
          onChange={values => {
            void updateFilters(values);
          }}
        />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={value => {
            void updateSortBy(value);
          }}
          onOrderChange={value => {
            void updateSortOrder(value);
          }}
          options={[
            { label: t('sort.modified'), value: 'modified' },
            { label: t('sort.name'), value: 'name' },
            { label: t('sort.created'), value: 'created' },
          ]}
        />
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
