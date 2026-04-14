import { Plugin, WorkspaceLeaf, moment } from 'obsidian';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import '../i18n'; // Initialize i18n
import i18n from '../i18n';
import { HomepageSettings } from './types';
import { DEFAULT_SETTINGS, VIEW_TYPE_HOMEPAGE } from '../shared/constants';
import { HomepageView } from './view/HomepageView';
import { HomepageSettingTab } from './settings/SettingsTab';
import { App } from './App';
import { ObsidianProvider } from './context/ObsidianContext';
import { SettingsProvider } from './context/SettingsContext';
import { LayoutManager } from './services/LayoutManager';
import { PluginLoader } from './services/PluginLoader';

// Module Registry & Modules
import { registry } from './registry/ModuleRegistry';
import { DateProgressModule } from '../modules/date-progress';
import { ContributionGraphModule } from '../modules/contribution-graph';
import { DailyTodoModule } from '../modules/todo/daily';
import { RegularTodoModule } from '../modules/todo/regular';
import { RecentFilesModule } from '../modules/recent-files';
import { RandomNoteModule } from '../modules/random-note';
import { TmpNoteModule } from '../modules/tmp-note';

export default class HomepagePlugin extends Plugin {
  settings: HomepageSettings;

  private settingsHandlers: ((settings: HomepageSettings) => void)[] = [];

  async onload() {
    // Register Modules
    registry.register(DateProgressModule);
    registry.register(ContributionGraphModule);
    registry.register(DailyTodoModule);
    registry.register(RegularTodoModule);
    registry.register(RecentFilesModule);
    registry.register(RandomNoteModule);
    registry.register(TmpNoteModule);

    await this.loadSettings();

    // Register View (Optional backup)
    this.registerView(VIEW_TYPE_HOMEPAGE, leaf => new HomepageView(leaf, this));

    // Register Markdown Code Block Processor
    this.registerMarkdownCodeBlockProcessor('salt-dashboard', (source, el, ctx) => {
      this.renderDashboard(el);
    });

    this.addRibbonIcon('layout-dashboard', i18n.t('commands.ribbonTooltip'), () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-homepage-dashboard',
      name: i18n.t('commands.openDashboard'),
      callback: () => {
        this.activateView();
      },
    });

    this.addSettingTab(new HomepageSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(async () => {
      // Load External Plugins when layout is ready (ensures Vault cache is populated)
      const loader = new PluginLoader(this.app, this.settings);
      await loader.loadPlugins();

      // Sync Layout (Add new modules)
      if (LayoutManager.syncLayout(this.settings)) {
        await this.saveSettings();
      }

      if (this.settings.openOnStartup) {
        this.activateView();
      }
    });
  }

  async onunload() {
    this.settingsHandlers = [];
  }

  async loadSettings() {
    // Merge core defaults, module defaults, and user data
    const moduleDefaults = registry.getAllDefaultSettings();
    const saved = (await this.loadData()) as Record<string, unknown>;

    // ── Migration: remove jottings-todo (extracted to external plugin) ──────
    if (saved) {
      delete saved['jottingsTodo'];
      const layout = saved['layout'] as { modules?: { id: string }[] } | undefined;
      if (layout?.modules) {
        layout.modules = layout.modules.filter((m: { id: string }) => m.id !== 'jottings-todo');
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    this.settings = Object.assign({}, DEFAULT_SETTINGS, moduleDefaults, saved);

    // Apply language setting
    if (this.settings.language && this.settings.language !== 'system') {
      await i18n.changeLanguage(this.settings.language);
    } else {
      // Re-evaluate system language if it's set to 'system'
      let sysLng = moment.locale();
      if (sysLng === 'en') {
        const saved = window.localStorage.getItem('language');
        if (sysLng && saved) sysLng = saved;
      }
      await i18n.changeLanguage(sysLng);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.triggerSettingsUpdate();
  }

  onSettingsChange(handler: (settings: HomepageSettings) => void) {
    this.settingsHandlers.push(handler);
    return () => {
      this.settingsHandlers = this.settingsHandlers.filter(h => h !== handler);
    };
  }

  private triggerSettingsUpdate() {
    this.settingsHandlers.forEach(handler => handler(this.settings));
  }

  renderDashboard(el: HTMLElement) {
    const root = createRoot(el);
    root.render(
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>
          <ObsidianProvider app={this.app}>
            <SettingsProvider settings={this.settings} plugin={this}>
              <App />
            </SettingsProvider>
          </ObsidianProvider>
        </I18nextProvider>
      </React.StrictMode>
    );
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_HOMEPAGE, active: true });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
