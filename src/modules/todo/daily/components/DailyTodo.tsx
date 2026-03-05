import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { moment } from 'obsidian';
import { getLocalizedMoment } from '../../../../shared/utils/momentHelper';
import { useDailyTodo } from '../hooks/useDailyTodo';
import { TodoItem } from '../../shared/components/TodoItem';
import { useState } from 'react';
import { CronInput, getCronLabel } from './CronInput';
import { AutoResizeTextarea } from '../../../../shared/components/AutoResizeTextarea';
import { MultiSelect } from '../../../../shared/components/MultiSelect';

import { SortControls } from '../../../../shared/components/SortControls';

export const DailyTodo: React.FC = () => {
  const { t } = useTranslation();
  const {
    tasks,
    loading,
    toggleComplete,
    togglePin,
    abandonTask,
    addTask,
    updateTask,
    deleteTask,
    updateTaskSchedule,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilters,
    setStatusFilters,
  } = useDailyTodo();

  const [taskText, setTaskText] = useState('');
  const [cronExpr, setCronExpr] = useState('* * *');
  const [isAdding, setIsAdding] = useState(false);

  // State for editing schedule
  const [editingCronId, setEditingCronId] = useState<string | null>(null);
  const [editCronValue, setEditCronValue] = useState('');
  const editingContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingCronId !== null &&
        editingContainerRef.current &&
        !editingContainerRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.cron-presets-menu-portal')
      ) {
        setEditingCronId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCronId]);

  const visibleTasks = React.useMemo(() => {
    return tasks
      .filter(t => {
        if (t.completed || t.isAbandoned) return false;

        if (statusFilters.length === 0) return t.isDue; // Default if nothing selected

        let show = false;
        if (statusFilters.includes('today') && t.isDue) show = true;
        if (statusFilters.includes('future') && !t.isDue) show = true;

        return show;
      })
      .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
  }, [tasks, statusFilters]);

  const handleAddTask = async () => {
    if (taskText.trim()) {
      // Construct full text with cron
      const fullText = `${taskText.trim()} \`${cronExpr}\``;
      await addTask(fullText);
      setTaskText('');
      setCronExpr('* * *');
      setIsAdding(false);
    }
  };

  const startEditCron = (task: any) => {
    setEditingCronId(task.id);
    setEditCronValue(task.crontab?.raw || '* * *');
  };

  const saveEditCron = async (task: any) => {
    if (editCronValue.trim()) {
      await updateTaskSchedule(task, editCronValue.trim());
    }
    setEditingCronId(null);
  };

  if (loading) {
    return <div className="loading-state">{t('modules.todo.daily.loading')}</div>;
  }

  return (
    <div
      className="daily-todo-module"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div className="module-header-actions">
        <MultiSelect
          label={t('modules.todo.shared.filter.label')}
          options={[
            { label: t('modules.todo.daily.filter.today'), value: 'today' },
            { label: t('modules.todo.daily.filter.future'), value: 'future' },
          ]}
          selectedValues={statusFilters}
          onChange={setStatusFilters}
        />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSortBy}
          onOrderChange={setSortOrder}
          options={[
            { label: t('modules.todo.shared.sort.default'), value: 'default' },
            { label: t('modules.todo.shared.sort.name'), value: 'name' },
          ]}
        />
      </div>

      <div className="task-list" style={{ flex: 1, overflowY: 'auto' }}>
        {visibleTasks.map(task => (
          <div key={task.id} style={{ position: 'relative' }}>
            <TodoItem
              task={task}
              onToggle={toggleComplete}
              onPin={togglePin}
              onAbandon={abandonTask}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />

            {/* Cron Badge or Editor */}
            <div
              style={{
                position: 'absolute',
                right: editingCronId === task.id ? '8px' : '48px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20,
              }}
            >
              {editingCronId === task.id ? (
                <div className="cron-editor-container" ref={editingContainerRef}>
                  <CronInput
                    value={editCronValue}
                    onChange={setEditCronValue}
                    onConfirm={() => saveEditCron(task)}
                    onCancel={() => setEditingCronId(null)}
                    autoFocus
                  />
                  <button
                    className="actionBtn confirm-delete-btn" // Reuse style
                    onClick={e => {
                      e.stopPropagation();
                      saveEditCron(task);
                    }}
                    onMouseDown={e => e.preventDefault()}
                    title={t('modules.todo.daily.saveSchedule')}
                    style={{ color: 'var(--interactive-success)', fontWeight: 'bold' }}
                  >
                    ✓
                  </button>
                  <button
                    className="actionBtn cancel-delete-btn" // Reuse style
                    onClick={e => {
                      e.stopPropagation();
                      setEditingCronId(null);
                    }}
                    onMouseDown={e => e.preventDefault()}
                    title={t('modules.todo.shared.item.cancel')}
                  >
                    ✗
                  </button>
                </div>
              ) : (
                task.crontab && (
                  <div
                    className="task-cycle-badge clickable"
                    onClick={() => startEditCron(task)}
                    title={t('modules.todo.daily.cronEdit')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>{getCronLabel(task.crontab.raw, t)}</span>
                    {!task.isDue && task.nextTriggerDate && (
                      <span style={{ opacity: 0.6, fontSize: '0.9em' }}>
                        ({t('modules.todo.daily.nextTrigger')}:{' '}
                        {getLocalizedMoment(task.nextTriggerDate).format('MM-DD')})
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))}
        {visibleTasks.length === 0 && (
          <div className="empty-state">{t('modules.todo.daily.empty')}</div>
        )}
      </div>

      <div className="add-task-container">
        {!isAdding ? (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            {t('modules.todo.daily.addTask')}
          </button>
        ) : (
          <div className="daily-add-row">
            <AutoResizeTextarea
              placeholder={t('modules.todo.daily.placeholder')}
              value={taskText}
              autoFocus
              onChange={e => setTaskText(e.target.value)}
              onEnter={handleAddTask}
              onKeyDown={e => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="add-task-input task-text-input"
            />

            <CronInput
              value={cronExpr}
              onChange={setCronExpr}
              onConfirm={handleAddTask}
              onCancel={() => setIsAdding(false)}
            />

            <button
              className="confirm-add-btn"
              onMouseDown={e => {
                e.preventDefault();
                handleAddTask();
              }}
              title={t('modules.todo.daily.addTask')}
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
