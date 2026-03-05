import { App, TFile } from 'obsidian';
import { RandomNoteConfig } from '../../../app/types';
import { SourceParser } from '../../../shared/utils/SourceParser';
import { getFileMtime } from '../../../shared/utils/fileTime';

export interface RandomNoteData {
  file: TFile;
  content: string;
  mtime: number;
}

export class RandomNoteService {
  private app: App;
  private config: RandomNoteConfig;
  private parser: SourceParser;

  constructor(app: App, config: RandomNoteConfig) {
    this.app = app;
    this.config = config;
    this.parser = new SourceParser(app);
  }

  async getRandomNote(globalFilter: string): Promise<RandomNoteData | null> {
    const files = this.app.vault.getFiles().filter(f => f.extension === 'md');

    const globalFilterFn = this.parser.parse(globalFilter || '');
    const moduleFilterFn = this.parser.parse(this.config.randomNoteSource || '');

    const validFiles = files.filter(f => globalFilterFn(f) && moduleFilterFn(f));

    if (validFiles.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * validFiles.length);
    const file = validFiles[randomIndex];

    const content = await this.app.vault.read(file);
    const preview = this.processContent(content);

    return {
      file,
      content: preview,
      mtime: getFileMtime(this.app, file),
    };
  }

  private processContent(content: string): string {
    const contentBody = content.replace(/^---[\s\S]+?---\n/, '');

    const limit = 500;
    if (contentBody.length > limit) {
      return contentBody.substring(0, limit) + '...';
    }
    return contentBody;
  }
}
