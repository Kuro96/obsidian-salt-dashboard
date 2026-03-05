import { App, TFile } from 'obsidian';
import { TodoModuleConfig, Task } from '../../../../app/types';
import { getFileMtime, getFileCtime } from '../../../../shared/utils/fileTime';

export abstract class TodoBaseService {
  protected app: App;
  protected config: TodoModuleConfig;

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

  // Helper for modifying task lines in files
  protected async modifyTaskFile(
    task: Task,
    callback: (lines: string[], index: number) => boolean | void
  ): Promise<void> {
    if (!task.sourceFile) return;

    const content = await this.app.vault.read(task.sourceFile);
    const lines = content.split('\n');

    if (task.lineNumber >= 0 && task.lineNumber < lines.length) {
      // Verify we are looking at the right line (simple check)
      // Ideally we check ID, but line number is what we have.

      const result = callback(lines, task.lineNumber);

      // If callback returns false, skip saving
      if (result !== false) {
        await this.app.vault.modify(task.sourceFile, lines.join('\n'));
      }
    }
  }
}
