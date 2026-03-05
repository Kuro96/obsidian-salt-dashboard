import { App, PluginSettingTab, Setting, Notice, moment } from 'obsidian';
import HomepagePlugin from '../main';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { HomepageSettings } from '../types';
import { registry } from '../registry/ModuleRegistry';
import { LayoutManager } from '../services/LayoutManager';
import { PluginLoader } from '../services/PluginLoader';
import i18n from '../../i18n';

export class HomepageSettingTab extends PluginSettingTab {
  plugin: HomepagePlugin;
  private backupSettings: HomepageSettings | null = null;
  private confirmingReset = false;

  constructor(app: App, plugin: HomepagePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: i18n.t('settings.title') });

    // --- General Settings ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.general.heading'));

    new Setting(containerEl)
      .setName(i18n.t('settings.general.language.name'))
      .setDesc(i18n.t('settings.general.language.desc'))
      .addDropdown(dropdown => {
        dropdown
          .addOption('system', i18n.t('settings.general.language.system'))
          .addOption('en', i18n.t('settings.general.language.en'))
          .addOption('zh', i18n.t('settings.general.language.zh'))
          .addOption('zh-meme', i18n.t('settings.general.language.zh-meme'))
          .setValue(this.plugin.settings.language)
          .onChange(async value => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            
            // Reload i18n to take immediate effect if possible
            let newLng = value;
            if (value === 'system') {
              newLng = moment.locale();
              if (newLng === 'en') {
                 const saved = window.localStorage.getItem('language');
                 if (saved) newLng = saved;
              }
            }
            await i18n.changeLanguage(newLng);
            
            // Re-render settings tab to reflect new language immediately
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(i18n.t('settings.general.openOnStartup.name'))
      .setDesc(i18n.t('settings.general.openOnStartup.desc'))
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.openOnStartup).onChange(async value => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('settings.general.todoSource.name'))
      .setDesc(i18n.t('settings.general.todoSource.desc'))
      .addText(text =>
        text
          .setPlaceholder('TODO')
          .setValue(this.plugin.settings.todoSourceFolder)
          .onChange(async value => {
            this.plugin.settings.todoSourceFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.t('settings.general.globalFilter.name'))
      .setDesc(i18n.t('settings.general.globalFilter.desc'))
      .addTextArea(text =>
        text
          .setPlaceholder('(-"SCRIPTS") and (-"TODO")')
          .setValue(this.plugin.settings.globalFilter)
          .onChange(async value => {
            this.plugin.settings.globalFilter = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Plugin Loader ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.extensions.heading'));

    new Setting(containerEl)
      .setName(i18n.t('settings.extensions.customPluginFolder.name'))
      .setDesc(i18n.t('settings.extensions.customPluginFolder.desc'))
      .addText(text =>
        text.setValue(this.plugin.settings.customPluginFolder).onChange(async value => {
          this.plugin.settings.customPluginFolder = value;
          await this.plugin.saveSettings();
        })
      )
      .addButton(btn =>
        btn.setButtonText(i18n.t('settings.extensions.buttons.reload')).onClick(async () => {
          const loader = new PluginLoader(this.app, this.plugin.settings);
          await loader.reload();
          // Refresh settings view to show new modules
          this.display();
        })
      )
      .addButton(btn =>
        btn
          .setButtonText(i18n.t('settings.extensions.buttons.clean'))
          .setTooltip(i18n.t('settings.extensions.buttons.cleanTooltip'))
          .onClick(async () => {
            const removedCount = LayoutManager.cleanLayout(this.plugin.settings);
            if (removedCount > 0) {
              await this.plugin.saveSettings();
              new Notice(
                i18n.t('settings.extensions.notices.orphanedRemoved', { count: removedCount })
              );
              this.display();
            } else {
              new Notice(i18n.t('settings.extensions.notices.noOrphaned'));
            }
          })
      );

    // --- Active Modules Management ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.activeModules.heading'));
    new Setting(containerEl).setDesc(i18n.t('settings.activeModules.desc'));

    const activeModulesContainer = containerEl.createDiv('active-modules-container');

    // Get all registered modules
    const allRegistered = registry.getAllModules();

    allRegistered.forEach(mod => {
      // Find current state in layout
      const layoutItem = this.plugin.settings.layout.modules.find(m => m.id === mod.id);
      const isEnabled = layoutItem ? layoutItem.enabled : false;

      new Setting(activeModulesContainer)
        .setName(mod.title)
        .setDesc(mod.id)
        .addToggle(toggle =>
          toggle.setValue(isEnabled).onChange(async val => {
            // Use LayoutManager to toggle
            const success = LayoutManager.toggleModule(this.plugin.settings, mod.id, val);

            if (!success) {
              // Edge case: Module registered but not in layout (shouldn't happen due to sync)
              // Force a sync then toggle
              LayoutManager.syncLayout(this.plugin.settings);
              LayoutManager.toggleModule(this.plugin.settings, mod.id, val);
            }

            // Sync to Contribution Graph Settings for Todo Modules
            if (!val) {
              // Only auto-disable
              if (mod.id === 'daily-todo')
                this.plugin.settings.contributionGraph.enableDailyTodo = false;
              if (mod.id === 'regular-todo')
                this.plugin.settings.contributionGraph.enableRegularTodo = false;
              if (mod.id === 'jottings-todo')
                this.plugin.settings.contributionGraph.enableJottingsTodo = false;
            } else {
              // Optional: Auto-enable? User asked for "When ... not enabled... directly disable"
              // It's safer not to auto-enable, but for better UX, maybe we should?
              // Let's stick to strict requirement: "When ... not enabled... directly disable"
              // But wait, if I enable "Daily Todo" module, I probably expect it to show up in graph if it was previously enabled.
              // However, checking the requirement again: "When a todo module is disabled... disable corresponding todo".
              // It doesn't say "When enabled... enable".
            }

            await this.plugin.saveSettings();
            // Refresh display to update module settings visibility
            this.display();
          })
        );
    });

    // --- Dynamic Module Settings ---
    const modules = registry.getAllModules();
    modules.forEach(module => {
      // Check if module is enabled in layout
      const layoutItem = this.plugin.settings.layout.modules.find(m => m.id === module.id);
      if (layoutItem && !layoutItem.enabled) return; // Skip rendering settings if disabled

      try {
        module.renderSettings(containerEl, this.plugin, this.plugin.settings);
      } catch (e) {
        console.error(`Error rendering settings for module ${module.id}:`, e);
        containerEl
          .createDiv()
          .setText(i18n.t('settings.activeModules.errorLoading', { title: module.title }));
      }
    });

    // --- Layout ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.layout.heading'));

    new Setting(containerEl)
      .setName(i18n.t('settings.layout.reset.name'))
      .setDesc(i18n.t('settings.layout.reset.desc'))
      .addButton(btn =>
        btn
          .setButtonText(i18n.t('settings.layout.reset.button'))
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.layout = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.layout));
            await this.plugin.saveSettings();
            new Notice(i18n.t('settings.layout.reset.notice'));
          })
      );

    // --- Danger Zone ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.dangerZone.heading'));

    if (this.backupSettings) {
      new Setting(containerEl)
        .setName(i18n.t('settings.dangerZone.undo.name'))
        .setDesc(i18n.t('settings.dangerZone.undo.desc'))
        .addButton(btn =>
          btn
            .setButtonText(i18n.t('settings.dangerZone.undo.button'))
            .setCta() // Call to action style
            .onClick(async () => {
              if (this.backupSettings) {
                this.plugin.settings = JSON.parse(JSON.stringify(this.backupSettings));
                this.backupSettings = null;
                await this.plugin.saveSettings();
                new Notice(i18n.t('settings.dangerZone.undo.notice'));
                this.display(); // Refresh to hide Undo button
              }
            })
        );
    }

    new Setting(containerEl)
      .setName(i18n.t('settings.dangerZone.restore.name'))
      .setDesc(i18n.t('settings.dangerZone.restore.desc'))
      .addButton(btn =>
        btn
          .setButtonText(
            this.confirmingReset
              ? i18n.t('settings.dangerZone.restore.confirm')
              : i18n.t('settings.dangerZone.restore.button')
          )
          .setWarning()
          .onClick(async () => {
            if (!this.confirmingReset) {
              this.confirmingReset = true;
              btn.setButtonText(i18n.t('settings.dangerZone.restore.confirm'));
              // Optional: Reset confirmation after 5 seconds
              setTimeout(() => {
                if (this.confirmingReset) {
                  this.confirmingReset = false;
                  btn.setButtonText(i18n.t('settings.dangerZone.restore.button'));
                }
              }, 5000);
            } else {
              // Execute Reset
              this.backupSettings = JSON.parse(JSON.stringify(this.plugin.settings));

              // Reset to merged defaults (core + modules)
              const moduleDefaults = registry.getAllDefaultSettings();
              this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, moduleDefaults);

              await this.plugin.saveSettings();

              this.confirmingReset = false;
              new Notice(i18n.t('settings.dangerZone.restore.notice'));
              this.display(); // Refresh to show Undo button and update fields
            }
          })
      );
  }
}
