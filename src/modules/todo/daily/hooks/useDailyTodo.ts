import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../../app/context/ObsidianContext';
import { useSettings } from '../../../../app/context/SettingsContext';
import { DailyTodoService } from '../services/DailyTodoService';
import { Task } from '../../../../app/types';

export const useDailyTodo = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  // Memoize service to avoid recreation
  // We need to inject global todoSourceFolder into config
  const service = useMemo(() => {
    const config = {
      ...settings.dailyTodo,
      todoSourceFolder: settings.todoSourceFolder,
    };
    return new DailyTodoService(app, config);
  }, [app, settings.dailyTodo, settings.todoSourceFolder]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const { updateSettings } = useSettings();
  const sortBy = (settings.dailyTodo.sortBy as 'default' | 'name') || 'default';
  const sortOrder = settings.dailyTodo.sortOrder || 'asc';
  const statusFilters = settings.dailyTodo.statusFilters || ['today'];

  const setSortBy = (newSortBy: 'default' | 'name') => {
    updateSettings({ dailyTodo: { ...settings.dailyTodo, sortBy: newSortBy } });
  };

  const setSortOrder = (newSortOrder: 'asc' | 'desc') => {
    updateSettings({ dailyTodo: { ...settings.dailyTodo, sortOrder: newSortOrder } });
  };

  const setStatusFilters = (newFilters: string[]) => {
    updateSettings({ dailyTodo: { ...settings.dailyTodo, statusFilters: newFilters } });
  };

  const fetchTasks = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        // Cast sortBy to match service signature which accepts more options
        const data = await service.getTasks(undefined, sortBy as any, sortOrder);
        setTasks(data);
      } catch (e) {
        console.error('Failed to fetch daily tasks', e);
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
    // Optimistic update or refresh?
    // DailyTodo completes by writing to JSON. The source file doesn't change.
    // So 'modify' event on vault won't trigger for JSON if it's hidden or handled differently?
    // Actually modifying JSON triggers 'modify' too.
    // But let's refresh manually to be sure UI updates immediately.

    // Update local state first (Optimistic)
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
  };

  const togglePin = async (task: Task) => {
    await service.togglePin(task);
    // This modifies file, so 'modify' event should trigger refresh.
  };

  const abandonTask = async (task: Task) => {
    await service.abandonTask(task);
    // This modifies file.
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

  const updateTaskSchedule = async (task: Task, newCron: string) => {
    await service.updateTaskSchedule(task, newCron);
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
    updateTaskSchedule,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilters,
    setStatusFilters,
  };
};
