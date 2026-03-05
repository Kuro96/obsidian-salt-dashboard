import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { App } from '../App';
import { VIEW_TYPE_HOMEPAGE } from '../../shared/constants';
import HomepagePlugin from '../main';
import { ObsidianProvider } from '../context/ObsidianContext';
import { SettingsProvider } from '../context/SettingsContext';

export class HomepageView extends ItemView {
  private root: Root | null = null;
  plugin: HomepagePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: HomepagePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_HOMEPAGE;
  }

  getDisplayText() {
    return i18n.t('commands.viewTitle');
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    const container = contentEl.createDiv({ cls: 'homepage-dashboard-view' });

    this.root = createRoot(container);
    this.root.render(
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>
          <ObsidianProvider app={this.app}>
            <SettingsProvider settings={this.plugin.settings} plugin={this.plugin}>
              <App app={this.app} settings={this.plugin.settings} />
            </SettingsProvider>
          </ObsidianProvider>
        </I18nextProvider>
      </React.StrictMode>
    );
  }

  async onClose() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
