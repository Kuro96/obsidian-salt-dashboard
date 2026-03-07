import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { useSettings } from '../../../app/context/SettingsContext';
import { RecentFilesService, FileInfo } from '../services/RecentFilesService';
import { debounce } from 'obsidian';

interface ColumnState {
  limit: number;
  sortBy: string;
  sortOrder: string;
}

export const useRecentFiles = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  const service = useMemo(() => {
    return new RecentFilesService(app, settings.recentFiles);
  }, [app, settings.recentFiles]);

  const [filesByColumn, setFilesByColumn] = useState<Record<string, FileInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [columnStates, setColumnStates] = useState<Record<string, ColumnState>>({});

  const refresh = useCallback(() => {
    setLoading(true);
    const newFiles: Record<string, FileInfo[]> = {};

    settings.recentFiles.columns.forEach(col => {
      const state = columnStates[col.id] || {
        limit: settings.recentFiles.defaultFileLimit || 6,
        sortBy: 'mtime',
        sortOrder: 'desc',
      };
      newFiles[col.id] = service.getRecentFiles(
        col,
        settings.globalFilter || '',
        state.limit,
        state.sortBy,
        state.sortOrder
      );
    });

    setFilesByColumn(newFiles);
    setLoading(false);
  }, [service, settings.recentFiles, columnStates, settings.globalFilter]);

  const debouncedRefresh = useMemo(() => debounce(refresh, 300), [refresh]);

  useEffect(() => {
    Promise.resolve().then(() => refresh());

    const refModify = app.vault.on('modify', () => debouncedRefresh());
    const refCreate = app.vault.on('create', () => debouncedRefresh());
    const refDelete = app.vault.on('delete', () => debouncedRefresh());
    const refMetadata = app.metadataCache.on('changed', () => debouncedRefresh());

    return () => {
      app.vault.offref(refModify);
      app.vault.offref(refCreate);
      app.vault.offref(refDelete);
      app.metadataCache.offref(refMetadata);
    };
  }, [refresh, debouncedRefresh, app.vault, app.metadataCache]);

  const openFile = (path: string) => {
    const file = app.vault.getAbstractFileByPath(path);
    if (file) {
      app.workspace.getLeaf(false).openFile(file as any);
    }
  };

  const updateColumnState = (colId: string, newState: Partial<ColumnState>) => {
    setColumnStates(prev => ({
      ...prev,
      [colId]: {
        ...(prev[colId] || {
          limit: settings.recentFiles.defaultFileLimit || 6,
          sortBy: 'mtime',
          sortOrder: 'desc',
        }),
        ...newState,
      },
    }));
  };

  const createNewNote = async (colId: string, title: string) => {
    const col = settings.recentFiles.columns.find(c => c.id === colId);
    if (col) {
      const success = await service.createNewNote(col, title);
      if (success) {
        refresh();
      }
    }
  };

  const deleteNote = async (path: string) => {
    const success = await service.deleteNote(path);
    if (success) {
      refresh();
    }
  };

  const togglePin = async (path: string) => {
    const success = await service.togglePin(path);
    if (success) {
      // Wait a small bit for metadata cache to catch up before refreshing
      setTimeout(() => refresh(), 100);
    }
  };

  return {
    columns: settings.recentFiles.columns,
    filesByColumn,
    loading,
    openFile,
    updateColumnState,
    columnStates,
    createNewNote,
    deleteNote,
    togglePin,
  };
};
