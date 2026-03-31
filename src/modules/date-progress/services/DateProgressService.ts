import { App } from 'obsidian';
import { DateProgressConfig } from '../../../app/types';
import { moment, getLocalizedMoment } from '../../../shared/utils/momentHelper';
import { getFileMtime, getFileCtime } from '../../../shared/utils/fileTime';

export interface DateInfo {
  date: string;
  weekday: string;
  weekNumber: number;
  quarter: number;
  remainingDays: number;
  yearProgress: number;
}

export interface VaultStats {
  totalNotes: number;
  createdToday: number;
  modifiedToday: number;
  createdThisWeek: number;
  modifiedThisWeek: number;
}

export class DateProgressService {
  private app: App;
  private config: DateProgressConfig;

  constructor(app: App, config: DateProgressConfig) {
    this.app = app;
    this.config = config;
  }

  getDateInfo(): DateInfo {
    const now = moment();
    const startOfYear = moment().startOf('year');
    const endOfYear = moment().endOf('year');
    const endOfMonth = moment().endOf('month');

    // Year progress
    const totalDuration = endOfYear.diff(startOfYear);
    const passedDuration = now.diff(startOfYear);
    const progress = Math.min(100, Math.max(0, (passedDuration / totalDuration) * 100));

    return {
      date: now.format(this.config.dateFormat),
      weekday: getLocalizedMoment().format('dddd'),
      weekNumber: now.week(),
      quarter: now.quarter(),
      remainingDays: endOfMonth.diff(now, 'days'),
      yearProgress: parseFloat(progress.toFixed(2)),
    };
  }

  getStats(): VaultStats {
    const files = this.app.vault.getFiles().filter(f => f.extension === 'md');
    const now = moment();
    const startOfDay = moment().startOf('day');
    const startOfWeek = moment().startOf('week');

    const excludeFolders = this.config.excludeFolders || [];

    const filteredFiles = files.filter(f => {
      return !excludeFolders.some(folder => f.path.startsWith(folder));
    });

    let createdToday = 0;
    let modifiedToday = 0;
    let createdThisWeek = 0;
    let modifiedThisWeek = 0;

    filteredFiles.forEach(f => {
      const ctime = moment(getFileCtime(this.app, f));
      const mtime = moment(getFileMtime(this.app, f));

      if (ctime.isAfter(startOfDay)) createdToday++;
      if (mtime.isAfter(startOfDay)) modifiedToday++;

      if (ctime.isAfter(startOfWeek)) createdThisWeek++;
      if (mtime.isAfter(startOfWeek)) modifiedThisWeek++;
    });

    return {
      totalNotes: filteredFiles.length,
      createdToday,
      modifiedToday,
      createdThisWeek,
      modifiedThisWeek,
    };
  }
}
