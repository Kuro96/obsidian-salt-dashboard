import { App, TFile, Notice } from 'obsidian';
import * as React from 'react';
import * as Obsidian from 'obsidian';
import { transform } from 'sucrase';
import { registry } from '../registry/ModuleRegistry';
import { LayoutManager } from './LayoutManager';
import { HomepageSettings } from '../types';

export class PluginLoader {
  private app: App;
  private settings: HomepageSettings;
  private loadedPlugins: Set<string> = new Set();

  constructor(app: App, settings: HomepageSettings) {
    this.app = app;
    this.settings = settings;
  }

  async loadPlugins() {
    const folderPath = this.settings.customPluginFolder;
    if (!folderPath) return;

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      console.log(`[PluginLoader] Folder not found: ${folderPath}`);
      return;
    }

    if (!(folder instanceof Obsidian.TFolder)) {
      console.error(`[PluginLoader] Path is not a folder: ${folderPath}`);
      return;
    }

    // Iterate files
    for (const file of folder.children) {
      if (
        file instanceof TFile &&
        (file.extension === 'js' || file.extension === 'cjs' || file.extension === 'jsx')
      ) {
        await this.loadPluginFile(file);
      }
    }

    // Sync layout after loading
    LayoutManager.syncLayout(this.settings);
  }

  async loadPluginFile(file: TFile) {
    try {
      console.log(`[PluginLoader] Loading ${file.name}...`);
      let content = await this.app.vault.read(file);

      // Transpile if JSX
      if (file.extension === 'jsx') {
        try {
          const result = transform(content, {
            transforms: ['jsx', 'imports'],
            jsxPragma: 'React.createElement',
            jsxFragmentPragma: 'React.Fragment',
            production: true,
          });
          content = result.code;
        } catch (transformErr) {
          console.error(`[PluginLoader] JSX Transform failed for ${file.name}`, transformErr);
          new Notice(`JSX Syntax Error in ${file.name}`);
          return;
        }
      }

      // Prepare CommonJS-like environment
      const module = { exports: {} as any };
      const exports = module.exports;

      // Shim require
      const requireShim = (id: string) => {
        if (id === 'react') return React;
        if (id === 'obsidian') return Obsidian;
        return null;
      };

      // Wrap in function to execute
      const wrapper = new Function('module', 'exports', 'require', 'React', 'Obsidian', content);

      wrapper(module, exports, requireShim, React, Obsidian);

      // Expect module.exports to be the DashboardModule object
      // or module.exports.default
      const pluginModule = module.exports.default || module.exports;

      if (pluginModule && pluginModule.id && pluginModule.component) {
        registry.register(pluginModule);
        this.loadedPlugins.add(pluginModule.id);
        new Notice(`Loaded plugin: ${pluginModule.title}`);
      } else {
        console.error(`[PluginLoader] Invalid module exports in ${file.name}`);
      }
    } catch (e) {
      console.error(`[PluginLoader] Failed to load ${file.name}`, e);
      new Notice(`Failed to load plugin: ${file.name}`);
    }
  }

  unloadAll() {
    // Registry doesn't support unregistering yet,
    // but we can just clear the list in a real implementation.
    // For now, this is a placeholder or we restart the app.
    // Since `registry` is a singleton map, we can effectively "reload" by overwriting.
    this.loadedPlugins.clear();
  }

  // Helper to reload manually
  async reload() {
    // Ideally we unregister first, but since map overwrites, it's okay for updates.
    await this.loadPlugins();
  }
}
