import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../../app/context/ObsidianContext';
import { useSettings } from '../../../../app/context/SettingsContext';
import { JottingsTodoService } from '../services/JottingsTodoService';
import { Task } from '../../../../app/types';
import { debounce } from 'lodash';

export const useJottingsTodo = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  const service = useMemo(() => {
    const config = {
      ...settings.jottingsTodo,
      todoSourceFolder: settings.todoSourceFolder,
    };
    return new JottingsTodoService(app, config);
  }, [app, settings.jottingsTodo, settings.todoSourceFolder]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const { updateSettings } = useSettings();
  const sortBy =
    (settings.jottingsTodo.sortBy as 'default' | 'name' | 'modified' | 'created') || 'default';
  const sortOrder = settings.jottingsTodo.sortOrder || 'asc';
  const statusFilters = settings.jottingsTodo.statusFilters || ['active'];

  const setSortBy = (newSortBy: 'default' | 'name' | 'modified' | 'created') => {
    updateSettings({ jottingsTodo: { ...settings.jottingsTodo, sortBy: newSortBy } });
  };

  const setSortOrder = (newSortOrder: 'asc' | 'desc') => {
    updateSettings({ jottingsTodo: { ...settings.jottingsTodo, sortOrder: newSortOrder } });
  };

  const setStatusFilters = (newFilters: string[]) => {
    updateSettings({ jottingsTodo: { ...settings.jottingsTodo, statusFilters: newFilters } });
  };

  const fetchTasks = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const data = await service.getTasks(undefined, sortBy, sortOrder);
        setTasks(data);
      } catch (e) {
        console.error('Failed to fetch jottings tasks', e);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [service, sortBy, sortOrder]
  );

  // Debounced fetch function to prevent rapid re-renders
  // Note: We use useMemo to persist the debounced function across renders
  const debouncedFetch = useMemo(() => debounce(() => fetchTasks(false), 500), [fetchTasks]);

  useEffect(() => {
    fetchTasks(true);

    // Listen to vault changes
    const modifyRef = app.vault.on('modify', file => {
      if (file.path.includes(settings.todoSourceFolder)) {
        debouncedFetch();
      }
    });

    // Listen to metadata changes (critical for Jottings link discovery)
    const metaRef = app.metadataCache.on('changed', file => {
      if (file.path.includes(settings.todoSourceFolder)) {
        debouncedFetch();
      }
    });

    return () => {
      app.vault.offref(modifyRef);
      app.metadataCache.offref(metaRef);
      debouncedFetch.cancel(); // Cancel any pending debounce on unmount
    };
  }, [fetchTasks, debouncedFetch, app.vault, app.metadataCache, settings.todoSourceFolder]);

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

  const toggleSort = () => {
    setSortByName(prev => !prev);
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
