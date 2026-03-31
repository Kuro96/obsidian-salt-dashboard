import { App, TFile, Notice, getAllTags } from 'obsidian';
import { RecentFilesConfig, ColumnConfig } from '../../../app/types';
import { moment } from 'obsidian';
import { SourceParser } from '../../../shared/utils/SourceParser';
import { formatSize } from '../../../shared/utils/formatSize';
import { getFileMtime, getFileCtime } from '../../../shared/utils/fileTime';

type FrontmatterValue = string | string[] | undefined;

type FrontmatterData = {
  tags?: FrontmatterValue;
};

type TemplaterPlugin = {
  templater: {
    create_new_note_from_template: (
      templateFile: TFile,
      folder: unknown,
      title: string
    ) => Promise<unknown>;
  };
};

function normalizeFrontmatterTags(value: FrontmatterValue): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string');
  }

  return [];
}

export interface FileInfo {
  file: TFile;
  name: string;
  path: string;
  extension: string;
  stat: TFile['stat'];
  mtime: number;
  ctime: number;
  tags: string[];
  sizeStr: string; // Pre-calculated size string
  isPinned: boolean;
}

export class RecentFilesService {
  private app: App;
  private config: RecentFilesConfig;
  private parser: SourceParser;

  constructor(app: App, config: RecentFilesConfig) {
    this.app = app;
    this.config = config;
    this.parser = new SourceParser(app);
  }

  private getTemplaterPlugin(): TemplaterPlugin | null {
    const plugins = (this.app as App & { plugins?: { plugins?: Record<string, unknown> } }).plugins;
    const templater = plugins?.plugins?.['templater-obsidian'];

    if (
      templater &&
      typeof templater === 'object' &&
      'templater' in templater &&
      templater.templater &&
      typeof templater.templater === 'object' &&
      'create_new_note_from_template' in templater.templater &&
      typeof templater.templater.create_new_note_from_template === 'function'
    ) {
      return templater as TemplaterPlugin;
    }

    return null;
  }

  private getTags(file: TFile): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    return getAllTags(cache) || [];
  }

  private isPinned(file: TFile): boolean {
    const tags = this.getTags(file);
    // getAllTags returns tags starting with #, so we check both for compatibility
    return tags.some(t => {
      const lower = t.toLowerCase();
      return lower === '#pinned' || lower === 'pinned';
    });
  }

  getRecentFiles(
    column: ColumnConfig,
    globalFilter: string,
    limit: number,
    sortBy = 'mtime',
    sortOrder = 'desc'
  ): FileInfo[] {
    const files = this.app.vault.getFiles();

    const validExtensions = ['md', 'canvas', 'base'];
    const filesWithExt = files.filter(f => validExtensions.includes(f.extension));

    // Parse global filter
    const globalFilterFn = this.parser.parse(globalFilter);

    // Parse source string
    const source = column.source || '';
    const filterFn = this.parser.parse(source);

    const filteredFiles = filesWithExt.filter(file => globalFilterFn(file) && filterFn(file));

    // Map to FileInfo first so we calculate mtime/ctime once
    const fileInfos: FileInfo[] = filteredFiles.map(file => ({
      file,
      name: file.basename,
      path: file.path,
      extension: file.extension,
      stat: file.stat,
      mtime: getFileMtime(this.app, file, this.config.modifiedDateProperty || 'modified_date'),
      ctime: getFileCtime(this.app, file, this.config.creationDateProperty || 'create_date'),
      tags: this.getTags(file),
      sizeStr: formatSize(file.stat.size),
      isPinned: this.isPinned(file),
    }));

    // Sort
    fileInfos.sort((a, b) => {
      const aPinned = a.isPinned;
      const bPinned = b.isPinned;

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      let valA = 0,
        valB = 0;

      switch (sortBy) {
        case 'name':
          return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        case 'created':
          valA = a.ctime;
          valB = b.ctime;
          break;
        case 'size':
          valA = a.stat.size;
          valB = b.stat.size;
          break;
        case 'mtime':
        default:
          valA = a.mtime;
          valB = b.mtime;
          break;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return fileInfos.slice(0, limit);
  }

  private extractTargetFolder(source: string): string | null {
    if (!source || !source.trim()) return null;
    let cleanSource = source.trim();
    if (/^FROM\s+/i.test(cleanSource)) {
      cleanSource = cleanSource.replace(/^FROM\s+/i, '').trim();
    }

    const match = cleanSource.match(/"([^"]+)"|'([^']+)'|([a-zA-Z0-9_\-/]+)/);
    if (match) {
      const possiblePath = match[1] || match[2] || match[3];
      if (possiblePath && !['AND', 'OR', 'NOT'].includes(possiblePath.toUpperCase())) {
        return possiblePath;
      }
    }
    return null;
  }

  public async createNewNote(column: ColumnConfig, title: string): Promise<boolean> {
    const templatePath = column.templatePath;
    if (templatePath) {
      const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
      if (!(templateFile instanceof TFile)) {
        new Notice(`[Dashboard] Template file not found: ${templatePath}`);
        return false;
      }
      const templater = this.getTemplaterPlugin();
      if (templater) {
        try {
          await templater.templater.create_new_note_from_template(
            templateFile,
            this.app.vault.getRoot(),
            title
          );
          return true;
        } catch (e) {
          console.error('Templater creation failed', e);
          new Notice('Failed to create note using Templater.');
          return false;
        }
      } else {
        new Notice('Templater plugin is not enabled.');
        return false;
      }
    } else {
      const folderPath = this.extractTargetFolder(column.source);
      if (!folderPath) {
        new Notice(`[Dashboard] Cannot determine target folder from source: ${column.source}`);
        return false;
      }

      const folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        new Notice(`[Dashboard] Target folder does not exist: ${folderPath}`);
        return false;
      }

      const filePath = `${folder.path}/${title}.md`;
      if (this.app.vault.getAbstractFileByPath(filePath)) {
        new Notice(`[Dashboard] File already exists: ${filePath}`);
        return false;
      }
      await this.app.vault.create(filePath, '');
      return true;
    }
  }

  public async deleteNote(path: string): Promise<boolean> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      try {
        await this.app.fileManager.trashFile(file);
        return true;
      } catch (e) {
        console.error('Failed to delete file', e);
        new Notice(`Failed to delete note: ${path}`);
        return false;
      }
    }
    return false;
  }

  public async togglePin(path: string): Promise<boolean> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      try {
        await this.app.fileManager.processFrontMatter(file, (fm: FrontmatterData) => {
          const tags = normalizeFrontmatterTags(fm.tags);

          if (tags.length === 0) {
            fm.tags = ['pinned'];
            return;
          }

          const hasPinned = tags.some(tag => {
            const normalizedTag = tag.toLowerCase();
            return normalizedTag === 'pinned' || normalizedTag === '#pinned';
          });

          if (hasPinned) {
            fm.tags = tags.filter(tag => {
              const normalizedTag = tag.toLowerCase();
              return normalizedTag !== 'pinned' && normalizedTag !== '#pinned';
            });
          } else {
            fm.tags = [...tags, 'pinned'];
          }
        });
        return true;
      } catch (e) {
        console.error('Failed to toggle pin', e);
        new Notice(`Failed to toggle pin for: ${path}`);
        return false;
      }
    }
    return false;
  }
}
