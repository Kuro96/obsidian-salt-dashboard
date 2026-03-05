import { App, Plugin } from 'obsidian';
import React from 'react';
import { HomepageSettings } from '../types';

/**
 * Interface defining a Dashboard Module (plugin) for the homepage.
 */
export interface DashboardModule {
  /**
   * Unique identifier for the module (e.g., 'recent-files').
   */
  id: string;

  /**
   * Display title of the module.
   */
  title: string;

  /**
   * Icon for the module (Lucide icon name or SVG string).
   */
  icon: string;

  /**
   * Default settings for this module.
   * These will be merged with user settings on plugin load.
   */
  defaultSettings: Record<string, any>;

  /**
   * Optional default layout configuration.
   * Used when the module is first added to the dashboard.
   */
  defaultLayout?: {
    w?: number;
    h?: number;
    showTitle?: boolean;
  };

  /**
   * The React component to render for this module.
   */
  component: React.ComponentType<any>;

  /**
   * Function to render settings UI for this module.
   * @param containerEl The container element in the settings tab.
   * @param plugin The main plugin instance (to access saveSettings, etc.).
   */
  renderSettings: (containerEl: HTMLElement, plugin: Plugin, settings: HomepageSettings) => void;
}
