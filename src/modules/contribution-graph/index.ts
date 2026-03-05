import { Setting } from 'obsidian';
import i18n from '../../i18n';
import { DashboardModule } from '../../app/architecture/DashboardModule';
import { ContributionGraph } from './components/ContributionGraph';
import { DEFAULT_SETTINGS } from '../../shared/constants';

export const ContributionGraphModule: DashboardModule = {
  id: 'contribution-graph',
  title: i18n.t('modules.settings.contributionGraph.title'),
  icon: 'activity',
  defaultSettings: DEFAULT_SETTINGS.contributionGraph,
  component: ContributionGraph,
  renderSettings: (containerEl, plugin, settings) => {
    containerEl.createEl('h3', { text: i18n.t('modules.settings.contributionGraph.heading') });

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.contributionGraph.enableDaily'))
      .addToggle(toggle =>
        toggle.setValue(settings.contributionGraph.enableDailyTodo).onChange(async value => {
          settings.contributionGraph.enableDailyTodo = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.contributionGraph.enableRegular'))
      .addToggle(toggle =>
        toggle.setValue(settings.contributionGraph.enableRegularTodo).onChange(async value => {
          settings.contributionGraph.enableRegularTodo = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.contributionGraph.enableJottings'))
      .addToggle(toggle =>
        toggle.setValue(settings.contributionGraph.enableJottingsTodo).onChange(async value => {
          settings.contributionGraph.enableJottingsTodo = value;
          await (plugin as any).saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(i18n.t('modules.settings.contributionGraph.click.name'))
      .setDesc(i18n.t('modules.settings.contributionGraph.click.desc'))
      .addDropdown(drop =>
        drop
          .addOption('modal', i18n.t('modules.settings.contributionGraph.click.options.modal'))
          .addOption('jump', i18n.t('modules.settings.contributionGraph.click.options.jump'))
          .addOption('filter', i18n.t('modules.settings.contributionGraph.click.options.filter'))
          .setValue(settings.contributionGraph.clickBehavior)
          .onChange(async (value: any) => {
            settings.contributionGraph.clickBehavior = value;
            await (plugin as any).saveSettings();
          })
      );
  },
};
