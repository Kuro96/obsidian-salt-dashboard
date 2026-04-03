import { Setting } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { TmpNote } from './components/TmpNote';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { FileSuggest } from '../../shared/utils/FileSuggest';

export const TmpNoteModule: DashboardModule = {
  id: 'tmp-note',
  settingsKey: 'tmpNote',
  title: i18n.t('modules.settings.tmpNote.title'),
  icon: 'sticky-note',
  defaultSettings: DEFAULT_SETTINGS.tmpNote,
  component: TmpNote,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.tmpNote.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.tmpNote.path.name'))
      .setDesc(i18n.t('modules.settings.tmpNote.path.desc'))
      .addText(text => {
        text.setValue(settings.tmpNote.tmpNotePath).onChange(async value => {
          settings.tmpNote.tmpNotePath = value;
          await (plugin as any).saveSettings();
        });
        new FileSuggest((plugin as any).app, text.inputEl);
      })
      .settingEl.addClass('sd-full-width-setting');
  },
};
