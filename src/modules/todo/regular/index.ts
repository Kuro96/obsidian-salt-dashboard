import { Setting } from 'obsidian';
import i18n from '../../../i18n';
import { DashboardModule } from '../../../app/architecture/DashboardModule';
import { RegularTodo } from './components/RegularTodo';
import { DEFAULT_SETTINGS } from '../../../shared/constants';

export const RegularTodoModule: DashboardModule = {
  id: 'regular-todo',
  settingsKey: 'regularTodo',
  title: i18n.t('modules.settings.regularTodo.title'),
  icon: 'check-square',
  defaultSettings: DEFAULT_SETTINGS.regularTodo,
  component: RegularTodo,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.regularTodo.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.regularTodo.dateFormat.name'))
      .setDesc(i18n.t('modules.settings.regularTodo.dateFormat.desc'))
      .addText(text =>
        text.setValue(settings.regularTodo.dateFormat).onChange(async value => {
          settings.regularTodo.dateFormat = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.regularTodo.autoCreate.name'))
      .setDesc(i18n.t('modules.settings.regularTodo.autoCreate.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.regularTodo.autoCreateFile).onChange(async value => {
          settings.regularTodo.autoCreateFile = value;
          await (plugin as any).saveSettings();
        })
      );
  },
};
