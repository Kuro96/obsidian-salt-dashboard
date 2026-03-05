import * as React from 'react';
import { HomepageSettings } from '../types';
import HomepagePlugin from '../main';

interface SettingsContextType {
  settings: HomepageSettings;
  updateSettings: (newSettings: Partial<HomepageSettings>) => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{
  settings: HomepageSettings; // Initial settings
  plugin: HomepagePlugin; // Plugin instance to save settings
  children: React.ReactNode;
}> = ({ settings: initialSettings, plugin, children }) => {
  const [settings, setSettings] = React.useState(initialSettings);

  // Sync state if initialSettings changes (e.g. external reload)
  React.useEffect(() => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)));

    // Subscribe to plugin settings changes (from SettingsTab)
    const unsubscribe = plugin.onSettingsChange(newSettings => {
      setSettings(JSON.parse(JSON.stringify(newSettings)));
    });

    return () => {
      unsubscribe();
    };
  }, [initialSettings, plugin]);

  const updateSettings = async (newSettings: Partial<HomepageSettings>) => {
    const updated = JSON.parse(JSON.stringify({ ...settings, ...newSettings }));
    setSettings(updated);
    plugin.settings = updated;
    await plugin.saveSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
