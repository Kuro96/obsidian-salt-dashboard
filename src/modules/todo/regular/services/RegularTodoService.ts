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
        const match = this.parseTaskLine(trimmed);

        if (match) {
          const { statusChar, text } = match;

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
      const match = line.match(/^(\s*- \[[^\]]\]\s+)(.*)$/);
      if (match) {
        lines[idx] = `${match[1]}${newText}`;
      }
    });
  }

  async toggleComplete(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');
      const parsed = this.parseTaskLine(line);
      if (!parsed) return false;

      const statusKind = this.getTaskStatusKind(parsed.statusChar);
      const cleanedLine = this.stripTaskDateMarkers(line);

      if (statusKind === 'completed') {
        lines[idx] = this.replaceTaskStatus(cleanedLine, ' ');
      } else if (statusKind !== 'abandoned') {
        lines[idx] = `${this.replaceTaskStatus(cleanedLine, 'x')} ✅ ${today}`;
      }
    });
  }

  async togglePin(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const parsed = this.parseTaskLine(line);
      if (!parsed) return false;

      const statusKind = this.getTaskStatusKind(parsed.statusChar);
      if (statusKind === 'pinned') {
        lines[idx] = this.replaceTaskStatus(line, ' ');
      } else if (statusKind === 'active') {
        lines[idx] = this.replaceTaskStatus(line, '!');
      }
    });
  }

  async abandonTask(task: Task): Promise<void> {
    await this.modifyTaskFile(task, (lines, idx) => {
      const line = lines[idx];
      const today = moment().format('YYYY-MM-DD');
      const parsed = this.parseTaskLine(line);
      if (!parsed) return false;

      const statusKind = this.getTaskStatusKind(parsed.statusChar);
      const cleanedLine = this.stripTaskDateMarkers(line);

      if (statusKind === 'abandoned') {
        lines[idx] = this.replaceTaskStatus(cleanedLine, ' ');
      } else if (statusKind !== 'completed') {
        lines[idx] = `${this.replaceTaskStatus(cleanedLine, '-')} ❌ ${today}`;
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
