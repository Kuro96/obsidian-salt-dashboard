import { Setting } from 'obsidian';
import i18n from '../../../i18n';
import { DashboardModule } from '../../../app/architecture/DashboardModule';
import { JottingsTodo } from './components/JottingsTodo';
import { DEFAULT_SETTINGS } from '../../../shared/constants';
import { FileSuggest } from '../../../shared/utils/FileSuggest';

export const JottingsTodoModule: DashboardModule = {
  id: 'jottings-todo',
  settingsKey: 'jottingsTodo',
  title: i18n.t('modules.settings.jottingsTodo.title'),
  icon: 'pen-tool',
  defaultSettings: DEFAULT_SETTINGS.jottingsTodo,
  component: JottingsTodo,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.jottingsTodo.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.folder.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.folder.desc'))
      .addText(text =>
        text.setValue(settings.jottingsTodo.jottingsFolder).onChange(async value => {
          settings.jottingsTodo.jottingsFolder = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.pathPattern.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.pathPattern.desc'))
      .addText(text =>
        text
          .setValue(settings.jottingsTodo.jottingsPathPattern || '[jottings]/YYYY/MM')
          .onChange(async value => {
            settings.jottingsTodo.jottingsPathPattern = value;
            await (plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.template.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.template.desc'))
      .addText(text => {
        text.setValue(settings.jottingsTodo.templatePath || '').onChange(async value => {
          settings.jottingsTodo.templatePath = value;
          await (plugin as any).saveSettings();
        });
        new FileSuggest(plugin.app, text.inputEl);
      });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.showPinButton.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.showPinButton.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.jottingsTodo.showPinButton ?? true).onChange(async value => {
          settings.jottingsTodo.showPinButton = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.showAbandonButton.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.showAbandonButton.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.jottingsTodo.showAbandonButton ?? true).onChange(async value => {
          settings.jottingsTodo.showAbandonButton = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.jottingsTodo.showDeleteButton.name'))
      .setDesc(i18n.t('modules.settings.jottingsTodo.showDeleteButton.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.jottingsTodo.showDeleteButton ?? true).onChange(async value => {
          settings.jottingsTodo.showDeleteButton = value;
          await (plugin as any).saveSettings();
        })
      );
  },
};
