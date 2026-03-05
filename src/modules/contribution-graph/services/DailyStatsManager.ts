import { App, TFile } from 'obsidian';

export class DailyStatsManager {
  private app: App;
  private statsFile: string;

  constructor(app: App, statsFile: string) {
    this.app = app;
    this.statsFile = statsFile;
  }

  async getTasks(date: string): Promise<string[]> {
    const data = await this.readStatsFile();
    return data[date] || [];
  }

  async toggleTask(date: string, taskText: string): Promise<void> {
    const data = await this.readStatsFile();
    const tasks = data[date] || [];

    if (tasks.includes(taskText)) {
      data[date] = tasks.filter((t: string) => t !== taskText);
    } else {
      data[date] = [...tasks, taskText];
    }

    await this.writeStatsFile(data);
  }

  async getAllStats(): Promise<Record<string, string[]>> {
    return await this.readStatsFile();
  }

  private async readStatsFile(): Promise<Record<string, string[]>> {
    try {
      const file = this.app.vault.getAbstractFileByPath(this.statsFile);
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to read stats file', e);
    }
    return {};
  }

  private async writeStatsFile(data: Record<string, string[]>): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.statsFile);
    const content = JSON.stringify(data, null, 2);

    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      // Create file if it doesn't exist
      // Need to ensure folders exist
      await this.ensureFolderExists(this.statsFile);
      await this.app.vault.create(this.statsFile, content);
    }
  }

  private async ensureFolderExists(path: string) {
    const folders = path.split('/').slice(0, -1);
    if (folders.length === 0) return;

    let currentPath = '';
    for (const folder of folders) {
      currentPath = currentPath === '' ? folder : `${currentPath}/${folder}`;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);
      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }
}
