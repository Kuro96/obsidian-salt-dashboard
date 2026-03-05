import { Setting } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { DateProgress } from './components/DateProgress';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export const DateProgressModule: DashboardModule = {
  id: 'date-progress',
  title: i18n.t('modules.settings.dateProgress.title'),
  icon: 'calendar-clock', // Lucide icon name
  defaultSettings: DEFAULT_SETTINGS.dateProgress,
  component: DateProgress,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.dateProgress.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.dateProgress.stats.name'))
      .setDesc(i18n.t('modules.settings.dateProgress.stats.desc'))
      .addToggle(toggle =>
        toggle.setValue(settings.dateProgress.showStats).onChange(async value => {
          settings.dateProgress.showStats = value;
          await (plugin as any).saveSettings();
        })
      );
  },
};
