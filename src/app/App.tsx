import * as React from 'react';
import { HomepageSettings } from './types';
import { App as ObsidianApp } from 'obsidian';
import { GridLayout } from './layout/GridLayout';

interface AppProps {
  app: ObsidianApp;
  settings: HomepageSettings;
}

export const App: React.FC<AppProps> = ({ app, settings }) => {
  return (
    <div className="dashboard-container">
      <GridLayout />
    </div>
  );
};
