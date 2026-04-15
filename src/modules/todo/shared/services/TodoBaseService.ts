import { App, TFile } from 'obsidian';
import { TodoModuleConfig, Task } from '../../../../app/types';
import { getFileMtime, getFileCtime } from '../../../../shared/utils/fileTime';

export abstract class TodoBaseService {
  protected app: App;
  protected config: TodoModuleConfig;

  protected static readonly TASK_LINE_PATTERN = /^(\s*- \[)(.)\](\s+)(.*)$/;

  constructor(app: App, config: TodoModuleConfig) {
    this.app = app;
    this.config = config;
  }

  // Abstract methods that subclasses must implement
  protected abstract fetchRawTasks(date?: string): Promise<Task[]>;
  abstract getCompletedTasks(date: string): Promise<Task[]>;
  abstract addTask(text: string, date?: string): Promise<void>;
  abstract updateTask(task: Task, newText: string): Promise<void>;
  abstract toggleComplete(task: Task): Promise<void>;
  abstract togglePin(task: Task): Promise<void>;
  abstract abandonTask(task: Task): Promise<void>;
  abstract deleteTask(task: Task): Promise<void>;

  // Common public method
  async getTasks(
    date?: string,
    sortBy: 'default' | 'name' | 'modified' | 'created' = 'default',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<Task[]> {
    const tasks = await this.fetchRawTasks(date);
    return this.sortTasks(tasks, sortBy, sortOrder);
  }

  protected sortTasks(
    tasks: Task[],
    sortBy: 'default' | 'name' | 'modified' | 'created',
    sortOrder: 'asc' | 'desc'
  ): Task[] {
    return tasks.sort((a, b) => {
      // Pinned always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.text.localeCompare(b.text);
          break;
        case 'modified':
          comparison =
            (a.sourceFile ? getFileMtime(this.app, a.sourceFile) : 0) -
            (b.sourceFile ? getFileMtime(this.app, b.sourceFile) : 0);
          break;
        case 'created':
          comparison =
            (a.sourceFile ? getFileCtime(this.app, a.sourceFile) : 0) -
            (b.sourceFile ? getFileCtime(this.app, b.sourceFile) : 0);
          break;
        case 'default':
        default:
          if (a.sourcePath !== b.sourcePath) {
            comparison = (a.sourcePath || '').localeCompare(b.sourcePath || '');
          } else {
            comparison = (a.lineNumber || 0) - (b.lineNumber || 0);
          }
          break;
      }

      if (comparison === 0 && sortBy !== 'default') {
        if (a.sourcePath !== b.sourcePath) {
          comparison = (a.sourcePath || '').localeCompare(b.sourcePath || '');
        } else {
          comparison = (a.lineNumber || 0) - (b.lineNumber || 0);
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  protected parseTaskLine(line: string): { statusChar: string; text: string } | null {
    const match = line.match(TodoBaseService.TASK_LINE_PATTERN);
    if (!match) return null;

    return {
      statusChar: match[2],
      text: match[4],
    };
  }

  protected getTaskStatusKind(statusChar: string): 'active' | 'pinned' | 'completed' | 'abandoned' {
    if (statusChar === 'x') return 'completed';
    if (statusChar === '-') return 'abandoned';
    if (statusChar === '!') return 'pinned';
    return 'active';
  }

  protected replaceTaskStatus(line: string, statusChar: string): string {
    return line.replace(TodoBaseService.TASK_LINE_PATTERN, `$1${statusChar}]$3$4`);
  }

  protected stripTaskDateMarkers(line: string): string {
    return line.replace(/ (?:✅|❌) \d{4}-\d{2}-\d{2}/g, '');
  }

  // Helper for modifying task lines in files
  protected async modifyTaskFile(
    task: Task,
    callback: (lines: string[], index: number) => boolean | void
  ): Promise<void> {
    if (!task.sourceFile) return;

    const content = await this.app.vault.read(task.sourceFile);
    const lines = content.split('\n');

    if (task.lineNumber >= 0 && task.lineNumber < lines.length) {
      // Verify the target line still contains the expected task text before modifying.
      // This guards against concurrent edits between read and write.
      const line = lines[task.lineNumber];
      if (task.text && !line.includes(task.text)) {
        console.warn(
          `[TodoBaseService] Line ${task.lineNumber} in "${task.sourcePath}" no longer matches task text. Skipping write to avoid data corruption.`
        );
        return;
      }

      const result = callback(lines, task.lineNumber);

      // If callback returns false, skip saving
      if (result !== false) {
        await this.app.vault.modify(task.sourceFile, lines.join('\n'));
      }
    }
  }
}
