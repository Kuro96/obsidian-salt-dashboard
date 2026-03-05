import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ModuleLayout } from '../types';

export const useLayout = () => {
  const { settings, updateSettings } = useSettings();

  const saveLayout = useCallback(
    (layout: any[]) => {
      // layout is array of { i, x, y, w, h }
      const newModules = settings.layout.modules.map((m: ModuleLayout) => {
        const newItem = layout.find((l: any) => l.i === m.id);
        if (newItem) {
          return { ...m, x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h };
        }
        return m;
      });

      const newSettings = {
        ...settings,
        layout: {
          ...settings.layout,
          modules: newModules,
        },
      };

      updateSettings(newSettings);
    },
    [settings, updateSettings]
  );

  const getModuleConfig = useCallback(
    (id: string) => {
      return settings.layout.modules.find((m: ModuleLayout) => m.id === id);
    },
    [settings.layout.modules]
  );

  return {
    modules: settings.layout.modules,
    saveLayout,
    getModuleConfig,
  };
};
