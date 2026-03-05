import { App, TFile } from 'obsidian';
import { TmpNoteConfig } from '../../../app/types';
import { getFileMtime } from '../../../shared/utils/fileTime';

export interface TmpNoteData {
  content: string;
  mtime: number;
  size: number;
  lines: number;
  file: TFile;
}

export class TmpNoteService {
  private app: App;
  private config: TmpNoteConfig;

  constructor(app: App, config: TmpNoteConfig) {
    this.app = app;
    this.config = config;
  }

  async getTmpNote(): Promise<TmpNoteData | null> {
    const path = this.config.tmpNotePath || 'works/tmp/tmp.md';
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!(file instanceof TFile)) return null;

    const content = await this.app.vault.read(file);
    const lines = content.split('\n').length;

    // Remove frontmatter
    const contentBody = content.replace(/^---[\s\S]+?---\n/, '');

    return {
      content: contentBody,
      mtime: getFileMtime(this.app, file),
      size: file.stat.size,
      lines,
      file,
    };
  }
}
