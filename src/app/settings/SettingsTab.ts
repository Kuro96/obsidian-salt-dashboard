import { App, PluginSettingTab, Setting, Notice, moment } from 'obsidian';
import HomepagePlugin from '../main';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { HomepageSettings } from '../types';
import { registry } from '../registry/ModuleRegistry';
import { LayoutManager } from '../services/LayoutManager';
import { PluginLoader } from '../services/PluginLoader';
import i18n from '../../i18n';
import { createHoverInfo } from '../../shared/utils/createHoverInfo';
import { FileSuggest } from '../../shared/utils/FileSuggest';

export class HomepageSettingTab extends PluginSettingTab {
  plugin: HomepagePlugin;
  private backupSettings: HomepageSettings | null = null;
  private layoutBackupSettings: HomepageSettings | null = null;
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

            let newLng = value;
            if (value === 'system') {
              newLng = moment.locale();
              if (newLng === 'en') {
                const saved = window.localStorage.getItem('language');
                if (saved) newLng = saved;
              }
            }
            await i18n.changeLanguage(newLng);

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
      .setName(i18n.t('settings.general.globalFilter.name'))
      .setDesc(i18n.t('settings.general.globalFilter.desc'))
      .addText(text =>
        text
          .setPlaceholder('(-"SCRIPTS") and (-"TODO")')
          .setValue(this.plugin.settings.globalFilter)
          .onChange(async value => {
            this.plugin.settings.globalFilter = value;
            await this.plugin.saveSettings();
          })
      )
      .settingEl.addClass('sd-full-width-setting');

    const filterHintRow = containerEl.createDiv('sd-hover-info-row');
    filterHintRow.createSpan({
      cls: 'setting-item-description',
      text: i18n.t('settings.general.globalFilter.syntaxHelp.label'),
    });
    createHoverInfo(filterHintRow, {
      label: i18n.t('settings.general.globalFilter.syntaxHelp.ariaLabel'),
      content: [
        i18n.t('settings.general.globalFilter.syntaxHelp.intro'),
        i18n.t('settings.general.globalFilter.syntaxHelp.exampleExclude'),
        i18n.t('settings.general.globalFilter.syntaxHelp.exampleTag'),
        i18n.t('settings.general.globalFilter.syntaxHelp.exampleProperty'),
        i18n.t('settings.general.globalFilter.syntaxHelp.exampleCombined'),
      ],
      iconText: 'i',
    });

    // --- TODO Common Settings ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.todo.heading'));

    new Setting(containerEl)
      .setName(i18n.t('settings.todo.sourceFolder.name'))
      .setDesc(i18n.t('settings.todo.sourceFolder.desc'))
      .addText(text => {
        text
          .setPlaceholder('TODO')
          .setValue(this.plugin.settings.todoSourceFolder)
          .onChange(async value => {
            this.plugin.settings.todoSourceFolder = value;
            await this.plugin.saveSettings();
          });
        new FileSuggest(this.app, text.inputEl, { mode: 'folder' });
      });

    new Setting(containerEl)
      .setName(i18n.t('settings.todo.statsFile.name'))
      .setDesc(i18n.t('settings.todo.statsFile.desc'))
      .addText(text => {
        text
          .setPlaceholder('SCRIPTS/data/daily_stats.json')
          .setValue(this.plugin.settings.todoStatsFile)
          .onChange(async value => {
            this.plugin.settings.todoStatsFile = value;
            await this.plugin.saveSettings();
          });
        new FileSuggest(this.app, text.inputEl, { extensions: ['json'] });
      })
      .settingEl.addClass('sd-full-width-setting');

    new Setting(containerEl)
      .setName(i18n.t('settings.todo.weekStart.name'))
      .setDesc(i18n.t('settings.todo.weekStart.desc'))
      .addDropdown(dropdown =>
        dropdown
          .addOption('0', i18n.t('settings.todo.weekStart.sunday'))
          .addOption('1', i18n.t('settings.todo.weekStart.monday'))
          .setValue(String(this.plugin.settings.weekStart ?? 0))
          .onChange(async value => {
            this.plugin.settings.weekStart = Number(value);
            await this.plugin.saveSettings();
          })
      );

    // --- Plugin Loader ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.extensions.heading'));

    new Setting(containerEl)
      .setName(i18n.t('settings.extensions.customPluginFolder.name'))
      .setDesc(i18n.t('settings.extensions.customPluginFolder.desc'))
      .addText(text => {
        text.setValue(this.plugin.settings.customPluginFolder).onChange(async value => {
          this.plugin.settings.customPluginFolder = value;
          await this.plugin.saveSettings();
        });
        new FileSuggest(this.app, text.inputEl, { mode: 'folder' });
      })
      .addButton(btn =>
        btn.setButtonText(i18n.t('settings.extensions.buttons.reload')).onClick(async () => {
          const loader = new PluginLoader(this.app, this.plugin.settings);
          await loader.reload();
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
      )
      .settingEl.addClass('sd-full-width-setting');

    // --- Active Modules Management ---
    new Setting(containerEl).setHeading().setName(i18n.t('settings.activeModules.heading'));
    new Setting(containerEl).setDesc(i18n.t('settings.activeModules.desc'));

    const activeModulesContainer = containerEl.createDiv('active-modules-container');

    const allRegistered = registry.getAllModules();

    allRegistered.forEach(mod => {
      const layoutItem = this.plugin.settings.layout.modules.find(m => m.id === mod.id);
      const isEnabled = layoutItem ? layoutItem.enabled : false;

      new Setting(activeModulesContainer)
        .setName(mod.title)
        .setDesc(mod.id)
        .addToggle(toggle =>
          toggle.setValue(isEnabled).onChange(async val => {
            const success = LayoutManager.toggleModule(this.plugin.settings, mod.id, val);

            if (!success) {
              LayoutManager.syncLayout(this.plugin.settings);
              LayoutManager.toggleModule(this.plugin.settings, mod.id, val);
            }

            // Bidirectional sync with ContributionGraph data source toggles
            if (mod.id === 'daily-todo') {
              this.plugin.settings.contributionGraph.enableDailyTodo = val;
            }
            if (mod.id === 'regular-todo') {
              this.plugin.settings.contributionGraph.enableRegularTodo = val;
            }
            if (mod.id === 'jottings-todo') {
              this.plugin.settings.contributionGraph.enableJottingsTodo = val;
            }

            await this.plugin.saveSettings();
            this.display();
          })
        );
    });

    // --- Dynamic Module Settings ---
    const modules = registry.getAllModules();
    modules.forEach(module => {
      const layoutItem = this.plugin.settings.layout.modules.find(m => m.id === module.id);
      if (layoutItem && !layoutItem.enabled) return;

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

    if (this.layoutBackupSettings) {
      new Setting(containerEl)
        .setName(i18n.t('settings.layout.undo.name'))
        .setDesc(i18n.t('settings.layout.undo.desc'))
        .addButton(btn =>
          btn
            .setButtonText(i18n.t('settings.layout.undo.button'))
            .setCta()
            .onClick(async () => {
              if (this.layoutBackupSettings) {
                this.plugin.settings.layout = JSON.parse(
                  JSON.stringify(this.layoutBackupSettings.layout)
                );
                this.layoutBackupSettings = null;
                await this.plugin.saveSettings();
                new Notice(i18n.t('settings.layout.undo.notice'));
                this.display();
              }
            })
        );
    }

    new Setting(containerEl)
      .setName(i18n.t('settings.layout.reset.name'))
      .setDesc(i18n.t('settings.layout.reset.desc'))
      .addButton(btn =>
        btn
          .setButtonText(i18n.t('settings.layout.reset.button'))
          .setWarning()
          .onClick(async () => {
            this.layoutBackupSettings = JSON.parse(JSON.stringify(this.plugin.settings));
            this.plugin.settings.layout = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.layout));
            await this.plugin.saveSettings();
            new Notice(i18n.t('settings.layout.reset.notice'));
            this.display();
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
            .setCta()
            .onClick(async () => {
              if (this.backupSettings) {
                this.plugin.settings = JSON.parse(JSON.stringify(this.backupSettings));
                this.backupSettings = null;
                await this.plugin.saveSettings();
                new Notice(i18n.t('settings.dangerZone.undo.notice'));
                this.display();
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
              setTimeout(() => {
                if (this.confirmingReset) {
                  this.confirmingReset = false;
                  btn.setButtonText(i18n.t('settings.dangerZone.restore.button'));
                }
              }, 5000);
            } else {
              this.backupSettings = JSON.parse(JSON.stringify(this.plugin.settings));

              const moduleDefaults = registry.getAllDefaultSettings();
              this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, moduleDefaults);

              await this.plugin.saveSettings();

              this.confirmingReset = false;
              new Notice(i18n.t('settings.dangerZone.restore.notice'));
              this.display();
            }
          })
      );
  }
}
