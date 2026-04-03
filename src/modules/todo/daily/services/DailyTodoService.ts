import { TodoBaseService } from '../../shared/services/TodoBaseService';
import { App, TFile } from 'obsidian';
import { DailyTodoConfig, Task } from '../../../../app/types';
import { DailyStatsManager } from '../../../contribution-graph/services/DailyStatsManager';
import { CrontabParser } from '../../../../shared/utils/crontabParser';
import { moment } from '../../../../shared/utils/momentHelper';

export class DailyTodoService extends TodoBaseService {
  protected config: DailyTodoConfig;
  private statsManager: DailyStatsManager;

  constructor(app: App, config: DailyTodoConfig) {
    super(app, config);
    this.config = config;
    this.statsManager = new DailyStatsManager(
      app,
      config.statsFile || 'SCRIPTS/data/daily_stats.json'
    );
  }

  protected async fetchRawTasks(date?: string): Promise<Task[]> {
    const file = await this.getDailyFile();
    if (!file) return [];

    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const today = moment().format('YYYY-MM-DD');
    const completedTasks = await this.statsManager.getTasks(today);

    const tasks: Task[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^- \[(.)\] (.*)$/);

      if (match) {
        const statusChar = match[1];
        let text = match[2];
        let crontabExpr = null;

        if (this.config.enableCrontab) {
          // Check for crontab in backticks at the end of string: `* * *`
          const cronMatch = text.match(/`([\d*/,-]+\s+[\d*/,-]+\s+[\d*/,-]+)`$/);
          if (cronMatch) {
            const potentialCron = cronMatch[1];
            const parsed = CrontabParser.parse(potentialCron);
            if (parsed) {
              crontabExpr = parsed;
              // Remove the crontab part from displayed text?
              // Usually clean text is better for display.
              // But we might need to keep it in text for "updateTask" or just strip it for "TodoItem" display?
              // The Task interface has 'text'. If we strip it here, we must ensure we don't lose it when saving back.
              // But wait, 'fetchRawTasks' returns Task objects.
              // If I strip it from 'text', then 'TodoItem' shows clean text.
              // When I 'updateTask', I am editing the clean text?
              // If I edit clean text, I lose the cron if I don't re-append it.
              // Ideally, Task object should have 'text' (clean) and 'rawText' (full)?
              // Or I just strip it for display in TodoItem (via regex)?
              // The prompt says: "对于已添加的任务，在右侧...显示其用户友好的循环周期"
              // This implies the cron is part of the task but maybe hidden/parsed.

              // Let's strip it from 'text' property for cleaner UI,
              // BUT we need to preserve it during updates.
              // Actually, TodoItem editing uses 'task.text'. If I strip it, user won't see it when editing.
              // If user edits, they might want to change schedule?
              // User requirement: "对于已添加的任务，在右侧...显示其用户友好的循环周期"
              // This suggests the cron might NOT be in the main text flow for reading,
              // but for editing?
              // If I strip it, I need to make sure updateTask handles it.
              // Simpler approach: Keep it in 'text', but TodoItem renders it specially?
              // Or: 'text' is clean text. 'crontab' is stored in task.
              // When saving, we reconstruct the line: `- [ ] ${text} \`${cron}\``

              text = text.substring(0, cronMatch.index).trim();
            }
          } else {
            // Fallback to old space-separated syntax if backticks not found?
            // "ensure... can be correctly parsed".
            // Let's keep old parsing as fallback if needed, or replace it?
            // User requirement: "crontab语法应该被反引号包围，且应该在文本最后"
            // So we prioritize that.
            // If not found, maybe check old syntax?
            // Old syntax: `text * * *`
            const parts = text.split(' ');
            if (parts.length >= 3) {
              const potentialCron = parts.slice(-3).join(' ');
              if (/^[\d*/,-]+\s+[\d*/,-]+\s+[\d*/,-]+$/.test(potentialCron)) {
                // This is ambiguous with text ending in numbers.
                // Backticks make it explicit.
                // I will strictly support backticks for new/cleaner logic,
                // but maybe keep old one for backward compat?
                // Let's stick to backticks as primary.
              }
            }
          }
        }

        const isDue = crontabExpr ? CrontabParser.match(crontabExpr, new Date()) : true;
        const nextTriggerDate = crontabExpr
          ? CrontabParser.nextTrigger(crontabExpr, new Date())
          : null;

        const isPinned = statusChar === '!';
        const isCompleted = completedTasks.includes(text) || statusChar === 'x';

        tasks.push({
          id: `daily-${index}`,
          text: text,
          completed: isCompleted,
          isAbandoned: false,
          isPinned: isPinned,
          isDaily: true,
          isJottings: false,
          sourceFile: file,
          sourcePath: file.path,
          lineNumber: index,
          crontab: crontabExpr || undefined,
          isDue: isDue,
          nextTriggerDate: nextTriggerDate,
          tags: [],
        });
      }
    });

    return tasks;
  }

  async getCompletedTasks(date: string): Promise<Task[]> {
    const taskTexts = await this.statsManager.getTasks(date);
    return taskTexts.map((text, i) => ({
      id: `daily-hist-${date}-${i}`,
      text: text,
      completed: true,
      isAbandoned: false,
      isPinned: false,
      isDaily: true,
      isJottings: false,
      sourceFile: null,
      sourcePath: '',
      lineNumber: -1,
      completedDate: date,
      tags: [],
    }));
  }

  async addTask(text: string, date?: string): Promise<void> {
    const file = await this.getDailyFile(true);
    if (!file) {
      return;
    }
    // text might contain the cron part if passed from UI?
    // The UI 'addTask' usually passes the full input string.
    // If the UI constructs "Task text `* * *`", then simple append works.
    await this.app.vault.append(file, `\n- [ ] ${text}`);
  }

  async updateTask(task: Task, newText: string): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const match = line.match(/^(- \[[ x!-]\s?\] )(.*)$/);
      if (match) {
        // We need to preserve the crontab if it exists in the original line?
        // Or does 'newText' come from the UI which might have modified crontab?
        // The UI splits text and cron.
        // If 'updateTask' is called from TodoItem (inline edit), it only sends 'text'.
        // We should preserve the existing cron if we are only updating text.

        let cronSuffix = '';
        if (task.crontab) {
          cronSuffix = ` \`${task.crontab.raw}\``;
        }

        // If newText already contains backticked cron (user typed it manually?), we should respect it?
        // But standard TodoItem edit is just text.
        // So: Prefix + NewText + CronSuffix
        lines[idx] = `${match[1]}${newText}${cronSuffix}`;
      }
    });
  }

  async updateTaskSchedule(task: Task, newCron: string): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      // Replace existing cron or append new one
      // Current line format: "- [ ] Text `* * *`" or "- [ ] Text"
      // We want to replace the `...` part at the end or append it.

      let newLine = line;
      const cronRegex = /`\s*([\d*/,-L]+\s+[\d*/,-]+\s+[\d*/,-]+)\s*`$/;

      if (cronRegex.test(line)) {
        newLine = line.replace(cronRegex, `\`${newCron}\``);
      } else {
        // Append to end
        newLine = `${line.trimEnd()} \`${newCron}\``;
      }

      lines[idx] = newLine;
    });
  }

  async toggleComplete(task: Task): Promise<void> {
    const today = moment().format('YYYY-MM-DD');
    await this.statsManager.toggleTask(today, task.text);
  }

  async togglePin(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      if (line.includes('- [ ]')) {
        lines[idx] = line.replace('- [ ]', '- [!]');
      } else if (line.includes('- [!]')) {
        lines[idx] = line.replace('- [!]', '- [ ]');
      }
    });
  }

  async abandonTask(task: Task): Promise<void> {
    // Daily tasks do not support abandoning.
    // Do nothing or log warning.
    console.warn('Abandoning daily tasks is not supported.');
  }

  async deleteTask(task: Task): Promise<void> {
    // Remove from markdown file ONLY. Do not touch JSON stats.
    await this.modifyTaskFile(task, (lines, idx) => {
      lines.splice(idx, 1);
    });
  }

  private async getDailyFile(create = false): Promise<TFile | null> {
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const path = `${folderPath}/${this.config.dailyFileName}`;

    let file = this.app.vault.getAbstractFileByPath(path);

    if (!file && create) {
      if (!this.app.vault.getAbstractFileByPath(folderPath)) {
        await this.app.vault.createFolder(folderPath);
      }
      file = await this.app.vault.create(path, '');
    }

    if (file instanceof TFile) return file;
    return null;
  }
}
