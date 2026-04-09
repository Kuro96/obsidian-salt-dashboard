import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { useLayout } from '../../../app/hooks/useLayout';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { moment } from 'obsidian';
import { getLocalizedMoment } from '../../../shared/utils/momentHelper';
import { SortControls } from '../../../shared/components/SortControls';
import { SortOption, SortOrder } from '../../../app/types';
import {
  PinButton,
  DeleteButton,
  ConfirmButton,
  CancelButton,
} from '../../../shared/components/ItemActionButtons';

export const RecentFiles: React.FC = () => {
  const { t } = useTranslation();
  const app = useObsidianApp();
  const {
    columns,
    filesByColumn,
    loading,
    openFile,
    updateColumnState,
    columnStates,
    createNewNote,
    deleteNote,
    togglePin,
  } = useRecentFiles();
  const { getModuleConfig } = useLayout();

  const moduleConfig = getModuleConfig('recent-files');
  const showTitle = moduleConfig?.showTitle !== false; // Default true if undefined, but check usage

  // Dynamic column calculation based on container width
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [cols, setCols] = React.useState(1);

  // Expanded column state
  const [expandedColId, setExpandedColId] = React.useState<string | null>(null);
  const prevLimitRef = React.useRef<number>(6);

  const handleTitleClick = (colId: string, currentLimit: number) => {
    if (expandedColId === colId) {
      setExpandedColId(null);
      updateColumnState(colId, { limit: prevLimitRef.current });
    } else {
      prevLimitRef.current = currentLimit;
      setExpandedColId(colId);
      updateColumnState(colId, { limit: 9999 });
    }
  };

  // New Note State
  const [creatingNoteColId, setCreatingNoteColId] = React.useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = React.useState('');

  // Delete Note State
  const [deletingNotePath, setDeletingNotePath] = React.useState<string | null>(null);

  const handleCreateSubmit = async (colId: string) => {
    if (newNoteTitle.trim()) {
      await createNewNote(colId, newNoteTitle.trim());
    }
    setCreatingNoteColId(null);
    setNewNoteTitle('');
  };

  React.useLayoutEffect(() => {
    const updateCols = (width: number) => {
      // Calculate columns: min 250px per column, max 4 columns
      const newCols = Math.min(4, Math.max(1, Math.floor(width / 250)));
      setCols(newCols);
    };

    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          updateCols(entry.contentRect.width);
        }
      });

      observer.observe(containerRef.current);

      // Initial calculation
      updateCols(containerRef.current.offsetWidth);

      return () => observer.disconnect();
    }
  }, []);

  if (loading && Object.keys(filesByColumn).length === 0) {
    return <div className="loading-state">{t('modules.recentFiles.loading')}</div>;
  }

  return (
    <div className={`recent-files-module ${!showTitle ? 'no-main-title' : ''}`} ref={containerRef}>
      <div
        className="rf-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {columns.map(col => {
          const state = columnStates[col.id] || {
            limit: 6,
            sortBy: 'mtime',
            sortOrder: 'desc',
          };
          const isExpanded = expandedColId === col.id;
          const isHidden = expandedColId !== null && !isExpanded;

          return (
            <div
              key={col.id}
              className={`rf-column${isExpanded ? ' rf-column--expanded' : ''}`}
              style={
                isHidden ? { display: 'none' } : isExpanded ? { gridColumn: '1 / -1' } : undefined
              }
            >
              <div className="rf-header">
                <div
                  className={`rf-title-group rf-title-group--clickable${expandedColId === col.id ? ' rf-title-group--expanded' : ''}`}
                  onClick={() => handleTitleClick(col.id, state.limit)}
                >
                  {expandedColId === col.id ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="rf-back-icon"
                    >
                      <path d="M19 12H5" />
                      <path d="M12 19l-7-7 7-7" />
                    </svg>
                  ) : (
                    <span className="rf-icon">{col.icon}</span>
                  )}
                  <span className="rf-title">{col.title}</span>
                </div>
                <div className="rf-controls">
                  {creatingNoteColId === col.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        autoFocus
                        type="text"
                        className="rf-create-input"
                        value={newNoteTitle}
                        onChange={e => setNewNoteTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateSubmit(col.id);
                          if (e.key === 'Escape') {
                            setCreatingNoteColId(null);
                            setNewNoteTitle('');
                          }
                        }}
                        placeholder={t('modules.recentFiles.createPlaceholder', 'Note title...')}
                        style={{
                          width: '120px',
                          padding: '2px 6px',
                          fontSize: '0.9em',
                          borderRadius: '4px',
                          border: '1px solid var(--background-modifier-border)',
                        }}
                      />
                      <button
                        className="clickable-icon"
                        onClick={() => handleCreateSubmit(col.id)}
                        aria-label={t('modules.recentFiles.confirmCreate', 'Confirm')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
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
                          className="lucide lucide-check"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="clickable-icon"
                      onClick={() => setCreatingNoteColId(col.id)}
                      aria-label={t('modules.recentFiles.createNote', 'Create Note')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
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
                        className="lucide lucide-plus"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    </button>
                  )}
                  <SortControls
                    sortBy={state.sortBy as SortOption}
                    sortOrder={state.sortOrder as SortOrder}
                    onSortChange={val => updateColumnState(col.id, { sortBy: val })}
                    onOrderChange={val => updateColumnState(col.id, { sortOrder: val })}
                    options={[
                      { label: t('modules.recentFiles.sort.modified'), value: 'mtime' as any }, // Keep legacy 'mtime' value
                      { label: t('modules.recentFiles.sort.created'), value: 'created' },
                      { label: t('modules.recentFiles.sort.name'), value: 'name' },
                      { label: t('modules.recentFiles.sort.size'), value: 'size' as any },
                    ]}
                  />
                </div>
              </div>
              <div
                className="rf-list"
                style={
                  isExpanded
                    ? {
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        gap: '4px 16px',
                      }
                    : undefined
                }
              >
                {filesByColumn[col.id]?.map(file => (
                  <div
                    key={file.path}
                    className={`rf-item ${file.isPinned ? 'pinned' : ''}`}
                    onClick={() => openFile(file.path)}
                  >
                    <a
                      className="rf-item-name internal-link"
                      data-href={file.path}
                      href={file.path}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        openFile(file.path);
                      }}
                      onMouseEnter={e => {
                        app.workspace.trigger('hover-link', {
                          event: e,
                          source: 'preview',
                          hoverParent: e.currentTarget,
                          targetEl: e.currentTarget,
                          linktext: file.path,
                          sourcePath: '',
                        });
                      }}
                    >
                      {file.name}
                    </a>
                    <div className="rf-item-meta">
                      <span className="rf-item-size">{file.sizeStr}</span>
                      <span
                        className={`rf-item-date ${deletingNotePath === file.path ? 'hidden' : ''}`}
                      >
                        {getLocalizedMoment(file.mtime).fromNow(true)}
                      </span>
                      <div
                        className={`rf-item-actions ${deletingNotePath === file.path ? 'active' : ''}`}
                      >
                        {deletingNotePath === file.path ? (
                          <>
                            <ConfirmButton
                              onClick={() => {
                                deleteNote(file.path);
                                setDeletingNotePath(null);
                              }}
                              title={t('modules.todo.shared.item.confirmDelete')}
                            />
                            <CancelButton
                              onClick={() => setDeletingNotePath(null)}
                              title={t('modules.todo.shared.item.cancel')}
                            />
                          </>
                        ) : (
                          <>
                            <PinButton
                              isPinned={file.isPinned || false}
                              onToggle={() => togglePin(file.path)}
                              title={t('modules.todo.shared.item.pin')}
                            />
                            <DeleteButton
                              onClick={() => setDeletingNotePath(file.path)}
                              title={t('modules.todo.shared.item.delete')}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!filesByColumn[col.id] || filesByColumn[col.id].length === 0) && (
                  <div className="rf-empty">{t('modules.recentFiles.empty')}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
