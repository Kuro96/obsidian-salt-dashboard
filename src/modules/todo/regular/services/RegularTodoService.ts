import { TodoBaseService } from '../../shared/services/TodoBaseService';
import { App, TFile } from 'obsidian';
import { RegularTodoConfig, Task } from '../../../../app/types';
import { moment } from '../../../../shared/utils/momentHelper';
import type { Moment } from 'moment';

export class RegularTodoService extends TodoBaseService {
  protected config: RegularTodoConfig;

  constructor(app: App, config: RegularTodoConfig) {
    super(app, config);
    this.config = config;
  }

  protected async fetchRawTasks(date?: string): Promise<Task[]> {
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const excludedFiles = this.config.excludedFiles || [];
    const jottingsFolder = this.config.jottingsFolder || 'jottings';

    const files = this.app.vault
      .getFiles()
      .filter(
        f =>
          f.path.startsWith(folderPath) && f.extension === 'md' && !excludedFiles.includes(f.name)
      );

    const tasks: Task[] = [];

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^- \[(.)\] (.*)$/);

        if (match) {
          const statusChar = match[1];
          const text = match[2];

          const jottingsPrefixStr = `${jottingsFolder}/`;
          const linkRegex = new RegExp(`\\[\\[${jottingsPrefixStr}.*?\\]\\]`);
          if (linkRegex.test(text)) {
            return;
          }

          const isCompleted = statusChar === 'x';
          const isAbandoned = statusChar === '-';
          const isPinned = statusChar === '!';

          let completedDate = undefined;
          let abandonedDate = undefined;

          const doneMatch = text.match(/✅ (\d{4}-\d{2}-\d{2})/);
          if (doneMatch) {
            completedDate = doneMatch[1];
          }

          const abandonMatch = text.match(/❌ (\d{4}-\d{2}-\d{2})/);
          if (abandonMatch) {
            abandonedDate = abandonMatch[1];
          }

          tasks.push({
            id: `regular-${file.basename}-${index}`,
            text: text,
            completed: isCompleted,
            isAbandoned: isAbandoned,
            isPinned: isPinned,
            isDaily: false,
            isJottings: false,
            sourceFile: file,
            sourcePath: file.path,
            lineNumber: index,
            completedDate,
            abandonedDate,
            tags: [],
          });
        }
      });
    }

    return tasks;
  }

  async getCompletedTasks(date: string): Promise<Task[]> {
    const dateFormat = this.config.dateFormat || 'YYMMDD';
    const targetMoment = moment(date);
    const fileName = `${targetMoment.format(dateFormat)}.md`;
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const path = `${folderPath}/${fileName}`;

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return [];

    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const tasks: Task[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [x]')) {
        const text = trimmed.substring(5).trim();
        if (text.includes(`✅ ${date}`)) {
          tasks.push({
            id: `regular-hist-${date}-${index}`,
            text: text,
            completed: true,
            isAbandoned: false,
            isPinned: false,
            isDaily: false,
            isJottings: false,
            sourceFile: file,
            sourcePath: file.path,
            lineNumber: index,
            completedDate: date,
            tags: [],
          });
        }
      }
    });
    return tasks;
  }

  async addTask(text: string, date?: string): Promise<void> {
    const targetDate = moment();
    const file = await this.getFileForDate(targetDate, true);
    if (!file) return;

    await this.app.vault.append(file, `\n- [ ] ${text}`);
  }

  async updateTask(task: Task, newText: string): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const match = line.match(/^(- \[[ x!-]\s?\] )(.*)$/);
      if (match) {
        lines[idx] = `${match[1]}${newText}`;
      }
    });
  }

  async toggleComplete(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');

      if (line.includes('- [ ]')) {
        lines[idx] = line.replace('- [ ]', '- [x]') + ` ✅ ${today}`;
      } else if (line.includes('- [!]')) {
        lines[idx] = line.replace('- [!]', '- [x]') + ` ✅ ${today}`;
      } else if (line.includes('- [x]')) {
        lines[idx] = line.replace('- [x]', '- [ ]').replace(/ ✅ \d{4}-\d{2}-\d{2}/, '');
      }
    });
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
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');

      // Use stricter matching to avoid partial matches
      if (/^- \[[ !]\]/.test(line)) {
        lines[idx] = line.replace(/^- \[[ !]\]/, '- [-]') + ` ❌ ${today}`;
      } else if (/^- \[-]/.test(line)) {
        lines[idx] = line.replace(/^- \[-]/, '- [ ]').replace(/ ❌ \d{4}-\d{2}-\d{2}/, '');
      }
    });
  }

  async deleteTask(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      lines.splice(idx, 1);
    });
  }

  private async getFileForDate(date: Moment, create = false): Promise<TFile | null> {
    const dateFormat = this.config.dateFormat || 'YYMMDD';
    const fileName = `${date.format(dateFormat)}.md`;
    const folderPath = this.config.todoSourceFolder || 'TODO';
    const path = `${folderPath}/${fileName}`;

    let file = this.app.vault.getAbstractFileByPath(path);

    if (!file && create && this.config.autoCreateFile) {
      if (!this.app.vault.getAbstractFileByPath(folderPath)) {
        await this.app.vault.createFolder(folderPath);
      }
      file = await this.app.vault.create(path, '');
    }

    if (file instanceof TFile) return file;
    return null;
  }
}
