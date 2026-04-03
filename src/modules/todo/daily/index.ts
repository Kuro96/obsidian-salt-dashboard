import { Setting } from 'obsidian';
import i18n from '../../../i18n';
import { DashboardModule } from '../../../app/architecture/DashboardModule';
import { DailyTodo } from './components/DailyTodo';
import { DEFAULT_SETTINGS } from '../../../shared/constants';

export const DailyTodoModule: DashboardModule = {
  id: 'daily-todo',
  settingsKey: 'dailyTodo',
  title: i18n.t('modules.settings.dailyTodo.title'),
  icon: 'calendar-check',
  defaultSettings: DEFAULT_SETTINGS.dailyTodo,
  component: DailyTodo,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.dailyTodo.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.dailyTodo.fileName.name'))
      .setDesc(i18n.t('modules.settings.dailyTodo.fileName.desc'))
      .addText(text =>
        text.setValue(settings.dailyTodo.dailyFileName).onChange(async value => {
          settings.dailyTodo.dailyFileName = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.dailyTodo.crontab.name'))
      .setDesc(i18n.t('modules.settings.dailyTodo.crontab.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.dailyTodo.enableCrontab).onChange(async value => {
          settings.dailyTodo.enableCrontab = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.dailyTodo.showPinButton.name'))
      .setDesc(i18n.t('modules.settings.dailyTodo.showPinButton.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.dailyTodo.showPinButton ?? true).onChange(async value => {
          settings.dailyTodo.showPinButton = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.dailyTodo.showDeleteButton.name'))
      .setDesc(i18n.t('modules.settings.dailyTodo.showDeleteButton.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.dailyTodo.showDeleteButton ?? true).onChange(async value => {
          settings.dailyTodo.showDeleteButton = value;
          await (plugin as any).saveSettings();
        })
      );
  },
};
