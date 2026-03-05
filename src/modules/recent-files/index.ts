import { Setting, Notice } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { RecentFiles } from './components/RecentFiles';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { FileSuggest } from '../../shared/utils/FileSuggest';

export const RecentFilesModule: DashboardModule = {
  id: 'recent-files',
  title: i18n.t('modules.settings.recentFiles.title'),
  icon: 'file-clock',
  defaultSettings: DEFAULT_SETTINGS.recentFiles,
  component: RecentFiles,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.recentFiles.heading') });

    // --- Show Module Title (Moved from Layout Settings) ---
    // Accessing layout settings for this module specifically
    const rfModule = settings.layout.modules.find(m => m.id === 'recent-files');
    if (rfModule) {
      new Setting(containerEl)
        .setName(i18n.t('modules.settings.recentFiles.showTitle.name'))
        .setDesc(i18n.t('modules.settings.recentFiles.showTitle.desc'))
        .addToggle(toggle =>
          toggle.setValue(rfModule.showTitle !== false).onChange(async value => {
            rfModule.showTitle = value;
            await (plugin as any).saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.recentFiles.limit.name'))
      .setDesc(i18n.t('modules.settings.recentFiles.limit.desc'))
      .addSlider(slider =>
        slider
          .setLimits(3, 20, 1)
          .setValue(settings.recentFiles.defaultFileLimit || 6)
          .setDynamicTooltip()
          .onChange(async value => {
            settings.recentFiles.defaultFileLimit = value;
            await (plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.recentFiles.creationProp.name'))
      .setDesc(i18n.t('modules.settings.recentFiles.creationProp.desc'))
      .addText(text =>
        text
          .setValue(settings.recentFiles.creationDateProperty || 'create_date')
          .onChange(async value => {
            settings.recentFiles.creationDateProperty = value;
            await (plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.recentFiles.modifiedProp.name'))
      .setDesc(i18n.t('modules.settings.recentFiles.modifiedProp.desc'))
      .addText(text =>
        text
          .setValue(settings.recentFiles.modifiedDateProperty || 'modified_date')
          .onChange(async value => {
            settings.recentFiles.modifiedDateProperty = value;
            await (plugin as any).saveSettings();
          })
      );

    // Column Configuration
    containerEl.createEl('h4', { text: i18n.t('modules.settings.recentFiles.columns.heading') });
    containerEl.createEl('p', {
      text: i18n.t('modules.settings.recentFiles.columns.desc'),
      cls: 'setting-item-description',
    }).style.marginBottom = '10px';

    const columnsContainer = containerEl.createDiv('recent-files-columns-container');

    const renderColumns = () => {
      columnsContainer.empty();
      settings.recentFiles.columns.forEach((col, index) => {
        const columnEl = columnsContainer.createDiv('recent-files-column-item');
        columnEl.style.border = '1px solid var(--background-modifier-border)';
        columnEl.style.borderRadius = '8px';
        columnEl.style.padding = '10px';
        columnEl.style.marginBottom = '10px';
        columnEl.style.backgroundColor = 'var(--background-secondary)';

        // Header Row: Title & Actions
        const headerRow = columnEl.createDiv({
          cls: 'rf-col-header',
          attr: { style: 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;' },
        });

        // Title Input
        const titleInput = headerRow.createEl('input', {
          type: 'text',
          value: col.title,
          attr: {
            placeholder: i18n.t('modules.settings.recentFiles.columns.placeholder'),
            style: 'flex: 1; font-weight: bold;',
          },
        });
        titleInput.onchange = async () => {
          col.title = titleInput.value;
          await (plugin as any).saveSettings();
        };

        // Move Up
        const moveUpBtn = headerRow.createEl('button', { text: '↑', cls: 'clickable-icon' });
        moveUpBtn.disabled = index === 0;
        moveUpBtn.onclick = async () => {
          if (index > 0) {
            const temp = settings.recentFiles.columns[index - 1];
            settings.recentFiles.columns[index - 1] = col;
            settings.recentFiles.columns[index] = temp;
            await (plugin as any).saveSettings();
            renderColumns();
          }
        };

        // Move Down
        const moveDownBtn = headerRow.createEl('button', { text: '↓', cls: 'clickable-icon' });
        moveDownBtn.disabled = index === settings.recentFiles.columns.length - 1;
        moveDownBtn.onclick = async () => {
          if (index < settings.recentFiles.columns.length - 1) {
            const temp = settings.recentFiles.columns[index + 1];
            settings.recentFiles.columns[index + 1] = col;
            settings.recentFiles.columns[index] = temp;
            await (plugin as any).saveSettings();
            renderColumns();
          }
        };

        // Delete
        const deleteBtn = headerRow.createEl('button', {
          text: '🗑️',
          cls: 'clickable-icon is-danger',
        });
        deleteBtn.onclick = async () => {
          settings.recentFiles.columns.splice(index, 1);
          await (plugin as any).saveSettings();
          renderColumns();
        };

        // Source Row
        const sourceRow = columnEl.createDiv({
          cls: 'rf-col-source',
          attr: { style: 'display: flex; align-items: flex-start; gap: 10px; margin-top: 8px;' },
        });
        sourceRow.createEl('div', {
          text: i18n.t('modules.settings.recentFiles.columns.sourceLabel'),
          cls: 'setting-item-name',
          attr: {
            style:
              'font-size: 0.9em; color: var(--text-muted); width: 140px; flex-shrink: 0; padding-top: 6px;',
          },
        });

        const sourceInput = sourceRow.createEl('textarea', {
          text: col.source,
          attr: {
            placeholder: i18n.t('modules.settings.recentFiles.columns.sourcePlaceholder'),
            rows: '1',
            style:
              'flex: 1; font-family: monospace; resize: none; overflow: hidden; min-height: 32px;',
          },
        });

        const adjustHeight = (el: HTMLTextAreaElement) => {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        };

        sourceInput.addEventListener('input', () => adjustHeight(sourceInput));
        setTimeout(() => adjustHeight(sourceInput), 0);

        sourceInput.onchange = async () => {
          col.source = sourceInput.value;
          await (plugin as any).saveSettings();
        };

        // Template Path Row
        const templateRow = columnEl.createDiv({
          cls: 'rf-col-template',
          attr: { style: 'display: flex; align-items: center; gap: 10px; margin-top: 8px;' },
        });
        templateRow.createEl('div', {
          text: i18n.t('modules.settings.recentFiles.columns.templateLabel'),
          cls: 'setting-item-name',
          attr: {
            style: 'font-size: 0.9em; color: var(--text-muted); width: 140px; flex-shrink: 0;',
          },
        });

        const templateInput = templateRow.createEl('input', {
          type: 'text',
          value: col.templatePath || '',
          attr: {
            placeholder: i18n.t('modules.settings.recentFiles.columns.templatePlaceholder'),
            style: 'flex: 1; font-family: monospace;',
          },
        });
        new FileSuggest((plugin as any).app, templateInput);

        templateInput.onchange = async () => {
          col.templatePath = templateInput.value;
          await (plugin as any).saveSettings();
        };
      });
    };

    renderColumns();

    // Add Column Button
    const addBtnContainer = containerEl.createDiv({ attr: { style: 'margin-top: 10px;' } });
    new Setting(addBtnContainer).addButton(btn =>
      btn
        .setButtonText(i18n.t('modules.settings.recentFiles.columns.addBtn'))
        .setCta()
        .onClick(async () => {
          settings.recentFiles.columns.push({
            id: `col-${Date.now()}`,
            title: i18n.t('modules.settings.recentFiles.columns.newColumn'),
            source: '',
          });
          await (plugin as any).saveSettings();
          renderColumns();
        })
    );
  },
};
