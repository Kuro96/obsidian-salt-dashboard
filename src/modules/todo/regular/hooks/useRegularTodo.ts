import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../../app/context/ObsidianContext';
import { useSettings } from '../../../../app/context/SettingsContext';
import { RegularTodoService } from '../services/RegularTodoService';
import { Task } from '../../../../app/types';
import { moment } from 'obsidian';

export const useRegularTodo = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  // No longer need currentDate for viewing, as we view ALL.
  // But we might want it for "Add to Today" logic or history?
  // getCompletedTasks still needs a date for history view.
  // But the main view is inbox.

  const service = useMemo(() => {
    const config = {
      ...settings.regularTodo,
      todoSourceFolder: settings.todoSourceFolder,
      excludedFiles: [settings.dailyTodo.dailyFileName || 'daily.md'],
    };
    return new RegularTodoService(app, config);
  }, [app, settings.regularTodo, settings.todoSourceFolder, settings.dailyTodo.dailyFileName]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const { updateSettings } = useSettings();
  const sortBy =
    (settings.regularTodo.sortBy as 'default' | 'name' | 'modified' | 'created') || 'default';
  const sortOrder = settings.regularTodo.sortOrder || 'asc';
  const statusFilters = settings.regularTodo.statusFilters || ['active'];

  const setSortBy = (newSortBy: 'default' | 'name' | 'modified' | 'created') => {
    updateSettings({ regularTodo: { ...settings.regularTodo, sortBy: newSortBy } });
  };

  const setSortOrder = (newSortOrder: 'asc' | 'desc') => {
    updateSettings({ regularTodo: { ...settings.regularTodo, sortOrder: newSortOrder } });
  };

  const setStatusFilters = (newFilters: string[]) => {
    updateSettings({ regularTodo: { ...settings.regularTodo, statusFilters: newFilters } });
  };

  const fetchTasks = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const data = await service.getTasks(undefined, sortBy, sortOrder);
        setTasks(data);
      } catch (e) {
        console.error('Failed to fetch regular tasks', e);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [service, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchTasks(true);

    // Listen to vault changes
    const ref = app.vault.on('modify', file => {
      if (file.path.includes(settings.todoSourceFolder)) {
        fetchTasks(false);
      }
    });

    return () => {
      app.vault.offref(ref);
    };
  }, [fetchTasks, app.vault, settings.todoSourceFolder]);

  const toggleComplete = async (task: Task) => {
    await service.toggleComplete(task);
  };

  const togglePin = async (task: Task) => {
    await service.togglePin(task);
  };

  const abandonTask = async (task: Task) => {
    await service.abandonTask(task);
  };

  const addTask = async (text: string) => {
    await service.addTask(text);
  };

  const updateTask = async (task: Task, newText: string) => {
    await service.updateTask(task, newText);
  };

  const deleteTask = async (task: Task) => {
    await service.deleteTask(task);
  };

  return {
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
  };
};
