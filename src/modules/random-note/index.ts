import { Setting } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { RandomNote } from './components/RandomNote';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export const RandomNoteModule: DashboardModule = {
  id: 'random-note',
  settingsKey: 'randomNote',
  title: i18n.t('modules.settings.randomNote.title'),
  icon: 'dice',
  defaultSettings: DEFAULT_SETTINGS.randomNote,
  component: RandomNote,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.randomNote.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.randomNote.query.name'))
      .setDesc(i18n.t('modules.settings.randomNote.query.desc'))
      .addTextArea(text =>
        text
          .setPlaceholder('(-"SCRIPTS") and (-"TODO")')
          .setValue(settings.randomNote.randomNoteSource)
          .onChange(async value => {
            settings.randomNote.randomNoteSource = value;
            await (plugin as any).saveSettings();
          })
      );
  },
};
