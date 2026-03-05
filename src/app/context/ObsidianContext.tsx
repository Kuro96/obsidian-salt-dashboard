import * as React from 'react';
import { App } from 'obsidian';

const ObsidianContext = React.createContext<App | undefined>(undefined);

export const ObsidianProvider: React.FC<{ app: App; children: React.ReactNode }> = ({
  app,
  children,
}) => {
  return <ObsidianContext.Provider value={app}>{children}</ObsidianContext.Provider>;
};

export const useObsidianApp = (): App => {
  const context = React.useContext(ObsidianContext);
  if (context === undefined) {
    throw new Error('useObsidianApp must be used within an ObsidianProvider');
  }
  return context;
};
