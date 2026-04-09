import { Setting } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { RandomNote } from './components/RandomNote';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { createHoverInfo } from '../../shared/utils/createHoverInfo';

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
      .addText(text =>
        text
          .setPlaceholder(i18n.t('modules.settings.randomNote.query.placeholder'))
          .setValue(settings.randomNote.randomNoteSource)
          .onChange(async value => {
            settings.randomNote.randomNoteSource = value;
            await (plugin as any).saveSettings();
          })
      )
      .settingEl.addClass('sd-full-width-setting');

    const queryHintRow = containerEl.createDiv('sd-hover-info-row');
    queryHintRow.createSpan({
      cls: 'setting-item-description',
      text: i18n.t('modules.settings.randomNote.query.syntaxHelp.label'),
    });
    createHoverInfo(queryHintRow, {
      label: i18n.t('modules.settings.randomNote.query.syntaxHelp.ariaLabel'),
      content: [
        i18n.t('modules.settings.randomNote.query.syntaxHelp.intro'),
        i18n.t('modules.settings.randomNote.query.syntaxHelp.exampleExclude'),
        i18n.t('modules.settings.randomNote.query.syntaxHelp.exampleTag'),
        i18n.t('modules.settings.randomNote.query.syntaxHelp.exampleProperty'),
        i18n.t('modules.settings.randomNote.query.syntaxHelp.exampleFileProperty'),
        i18n.t('modules.settings.randomNote.query.syntaxHelp.exampleCombined'),
      ],
      iconText: 'i',
    });
  },
};
