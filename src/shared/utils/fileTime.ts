import { App, TFile } from 'obsidian';
import { moment } from './momentHelper';

/**
 * Gets the modification time of a file, preferring the frontmatter property over the file system stat.
 */
export function getFileMtime(app: App, file: TFile, propName = 'modified_date'): number {
  const cache = app.metadataCache.getFileCache(file);
  if (cache?.frontmatter && cache.frontmatter[propName]) {
    const m = moment(cache.frontmatter[propName]);
    if (m.isValid()) return m.valueOf();
  }
  return file.stat.mtime;
}

/**
 * Gets the creation time of a file, preferring the frontmatter property over the file system stat.
 */
export function getFileCtime(app: App, file: TFile, propName = 'create_date'): number {
  const cache = app.metadataCache.getFileCache(file);
  if (cache?.frontmatter && cache.frontmatter[propName]) {
    const m = moment(cache.frontmatter[propName]);
    if (m.isValid()) return m.valueOf();
  }
  return file.stat.ctime;
}
