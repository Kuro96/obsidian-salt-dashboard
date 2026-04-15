import { Plugin } from 'obsidian';
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
   * Optional display title used in settings UI.
   */
  settingsTitle?: string;

  /**
   * Icon for the module (Lucide icon name or SVG string).
   */
  icon: string;

  /**
   * The key under which this module's settings are stored in HomepageSettings.
   * When provided, getAllDefaultSettings() wraps defaultSettings under this key.
   * External modules that manage their own top-level key should omit this field
   * and pass a pre-wrapped defaultSettings object instead.
   */
  settingsKey?: string;

  /**
   * Default settings for this module (the config slice, not the full settings object).
   * Built-in modules should pair this with settingsKey so the registry can wrap it correctly.
   */
  defaultSettings: object;

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
  component: React.ComponentType;

  /**
   * Function to render settings UI for this module.
   * @param containerEl The container element in the settings tab.
   * @param plugin The main plugin instance (to access saveSettings, etc.).
   */
  renderSettings: (containerEl: HTMLElement, plugin: Plugin, settings: HomepageSettings) => void;
}
