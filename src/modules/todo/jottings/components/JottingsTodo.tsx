import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useJottingsTodo } from '../hooks/useJottingsTodo';
import { TodoItem } from '../../shared/components/TodoItem';
import { useState } from 'react';
import { MultiSelect } from '../../../../shared/components/MultiSelect';
import { useTaskSubmission } from '../../shared/hooks/useTaskSubmission';

import { SortControls } from '../../../../shared/components/SortControls';

export const JottingsTodo: React.FC = () => {
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
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilters,
    setStatusFilters,
  } = useJottingsTodo();
  const [newTask, setNewTask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const resetAddForm = React.useCallback(() => {
    setNewTask('');
    setIsAdding(false);
  }, []);

  const { isSubmitting, submit, cancel } = useTaskSubmission({
    canSubmit: () => Boolean(newTask.trim()),
    onSubmit: async () => {
      await addTask(newTask.trim());
    },
    onReset: resetAddForm,
  });

  const visibleTasks = React.useMemo(() => {
    return tasks.filter(t => {
      const isCompleted = t.completed;
      const isAbandoned = t.isAbandoned;
      const isActive = !isCompleted && !isAbandoned;

      if (statusFilters.length === 0) return isActive;

      let show = false;
      if (statusFilters.includes('active') && isActive) show = true;
      if (statusFilters.includes('completed') && isCompleted) show = true;
      if (statusFilters.includes('abandoned') && isAbandoned) show = true;

      return show;
    });
  }, [tasks, statusFilters]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await submit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  if (loading) {
    return <div className="loading-state">{t('modules.todo.daily.loading')}</div>;
  }

  return (
    <div
      className="jottings-todo-module"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div className="module-header-actions">
        <MultiSelect
          label={t('modules.todo.shared.filter.label')}
          options={[
            { label: t('modules.todo.shared.filter.active'), value: 'active' },
            { label: t('modules.todo.shared.filter.completed'), value: 'completed' },
            { label: t('modules.todo.shared.filter.abandoned'), value: 'abandoned' },
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
            { label: t('modules.todo.shared.sort.modified'), value: 'modified' },
            { label: t('modules.todo.shared.sort.created'), value: 'created' },
          ]}
        />
      </div>

      <div className="task-list" style={{ flex: 1, overflowY: 'auto' }}>
        {visibleTasks.map(task => (
          <TodoItem
            key={task.id}
            task={task}
            onToggle={toggleComplete}
            onPin={togglePin}
            onAbandon={abandonTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ))}
        {visibleTasks.length === 0 && (
          <div className="empty-state">{t('modules.todo.jottings.empty')}</div>
        )}
      </div>
      <div className="add-task-container">
        {!isAdding ? (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            {t('modules.todo.daily.addTask')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('modules.todo.jottings.placeholder')}
              value={newTask}
              autoFocus
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={handleKeyDown}
              className="add-task-input"
              style={{ flex: 1 }}
            />
            <button
              className="confirm-add-btn"
              onMouseDown={e => {
                e.preventDefault();
                void submit();
              }}
              title={t('modules.todo.daily.addTask')}
              disabled={isSubmitting}
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
