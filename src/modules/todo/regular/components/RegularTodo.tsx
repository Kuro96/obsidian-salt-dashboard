import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useRegularTodo } from '../hooks/useRegularTodo';
import { TodoItem } from '../../shared/components/TodoItem';
import { useState } from 'react';
import { AutoResizeTextarea } from '../../../../shared/components/AutoResizeTextarea';
import { MultiSelect } from '../../../../shared/components/MultiSelect';

import { SortControls } from '../../../../shared/components/SortControls';

export const RegularTodo: React.FC = () => {
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
  } = useRegularTodo();

  const [newTask, setNewTask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const visibleTasks = React.useMemo(() => {
    return tasks.filter(t => {
      const isCompleted = t.completed;
      const isAbandoned = t.isAbandoned;
      const isActive = !isCompleted && !isAbandoned;

      if (statusFilters.length === 0) return isActive; // Default if nothing selected

      let show = false;
      if (statusFilters.includes('active') && isActive) show = true;
      if (statusFilters.includes('completed') && isCompleted) show = true;
      if (statusFilters.includes('abandoned') && isAbandoned) show = true;

      return show;
    });
  }, [tasks, statusFilters]);

  const handleAddTask = async () => {
    if (newTask.trim()) {
      await addTask(newTask.trim());
      setNewTask('');
      setIsAdding(false);
    }
  };

  if (loading) {
    return <div className="loading-state">{t('modules.todo.daily.loading')}</div>;
  }

  return (
    <div
      className="regular-todo-module"
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
          <div className="empty-state">{t('modules.todo.regular.empty')}</div>
        )}
      </div>

      <div className="add-task-container">
        {!isAdding ? (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            {t('modules.todo.regular.addTask')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AutoResizeTextarea
              placeholder={t('modules.todo.regular.placeholder')}
              value={newTask}
              autoFocus
              onChange={e => setNewTask(e.target.value)}
              onEnter={handleAddTask}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTask('');
                }
              }}
              className="add-task-input"
              style={{ flex: 1 }}
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
