import { App, TFile } from 'obsidian';
import { ContributionGraphConfig, HomepageSettings } from '../../../app/types';
import { DailyStatsManager } from './DailyStatsManager';
import { moment } from '../../../shared/utils/momentHelper';

export class ContributionGraphService {
  private app: App;
  private config: ContributionGraphConfig;
  private settings: HomepageSettings;
  private dailyStatsManager: DailyStatsManager;

  constructor(app: App, settings: HomepageSettings) {
    this.app = app;
    this.settings = settings;
    this.config = settings.contributionGraph;
    this.dailyStatsManager = new DailyStatsManager(app, settings.dailyTodo.statsFile);
  }

  async getYearData(): Promise<Map<string, number>> {
    const data = new Map<string, number>();
    const today = moment();
    const startDate = moment().subtract(1, 'year');

    if (this.config.enableDailyTodo) {
      const dailyStats = await this.dailyStatsManager.getAllStats();
      Object.entries(dailyStats).forEach(([date, tasks]) => {
        if (moment(date).isAfter(startDate)) {
          const count = tasks.length;
          data.set(date, (data.get(date) || 0) + count);
        }
      });
    }

    if (this.config.enableRegularTodo || this.config.enableJottingsTodo) {
      const folderPath = this.settings.todoSourceFolder || 'TODO';
      const files = this.app.vault
        .getFiles()
        .filter(f => f.path.startsWith(folderPath) && f.extension === 'md');

      for (const file of files) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');

        lines.forEach(line => {
          // Match completed tasks with date
          const match = line.match(/- \[[x!]\] .*✅ (\d{4}-\d{2}-\d{2})/);
          if (match) {
            const date = match[1];
            if (moment(date).isAfter(startDate)) {
              const isJottings = line.includes('[[jottings/');

              let shouldCount = false;
              if (isJottings && this.config.enableJottingsTodo) {
                shouldCount = true;
              } else if (!isJottings && this.config.enableRegularTodo) {
                shouldCount = true;
              }

              if (shouldCount) {
                data.set(date, (data.get(date) || 0) + 1);
              }
            }
          }
        });
      }
    }

    return data;
  }

  async getCompletedTasksByDate(
    date: string
  ): Promise<{ daily: any[]; regular: any[]; jottings: any[] }> {
    const result: { daily: any[]; regular: any[]; jottings: any[] } = {
      daily: [],
      regular: [],
      jottings: [],
    };

    if (this.config.enableDailyTodo) {
      const dailyTasks = await this.dailyStatsManager.getTasks(date);
      result.daily = dailyTasks.map(t => ({ text: t, completed: true }));
    }

    if (this.config.enableRegularTodo || this.config.enableJottingsTodo) {
      const folderPath = this.settings.todoSourceFolder || 'TODO';
      const files = this.app.vault
        .getFiles()
        .filter(f => f.path.startsWith(folderPath) && f.extension === 'md');

      for (const file of files) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        lines.forEach(line => {
          if (line.includes(`✅ ${date}`)) {
            const isJottings = line.includes('[[jottings/');

            const task = {
              text: line.replace(/- \[[x!]\] /, '').replace(/ ✅ \d{4}-\d{2}-\d{2}/, ''),
              completed: true,
              sourcePath: file.path,
            };

            if (isJottings && this.config.enableJottingsTodo) {
              result.jottings.push(task);
            } else if (!isJottings && this.config.enableRegularTodo) {
              result.regular.push(task);
            }
          }
        });
      }
    }

    return result;
  }
}
