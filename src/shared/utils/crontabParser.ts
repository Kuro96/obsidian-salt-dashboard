import { CrontabExpression, CrontabField } from '../types';
import { moment } from 'obsidian';

export class CrontabParser {
  private static FIELD_RANGES = {
    dayOfMonth: { min: 1, max: 31 },
    month: { min: 1, max: 12 },
    dayOfWeek: { min: 0, max: 6 },
  };

  static parse(expression: string): CrontabExpression | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 3) {
      return null;
    }

    try {
      const dayOfMonth = this.parseField(parts[0], 'dayOfMonth');
      const month = this.parseField(parts[1], 'month');
      const dayOfWeek = this.parseField(parts[2], 'dayOfWeek');

      return {
        raw: expression,
        dayOfMonth,
        month,
        dayOfWeek,
      };
    } catch (e) {
      console.error('Failed to parse crontab expression:', expression, e);
      return null;
    }
  }

  static match(expr: CrontabExpression, date: Date | moment.Moment): boolean {
    const m = moment.isMoment(date) ? date : moment(date);
    const day = m.date(); // 1-31
    const month = m.month() + 1; // 1-12
    const week = m.day(); // 0-6
    const daysInMonth = m.daysInMonth();

    const matchMonth = this.matchField(expr.month, month);

    // Check Day with special handling for 'L' (-1)
    let matchDay = false;
    if (expr.dayOfMonth.values.includes(-1)) {
      if (day === daysInMonth) matchDay = true;
    }
    if (!matchDay) {
      matchDay = this.matchField(expr.dayOfMonth, day);
    }

    const matchWeek = this.matchField(expr.dayOfWeek, week);

    // Logic: Month AND (Day OR Week)
    // If both Day and Week are specified (not all), it's usually OR in standard cron.
    // PRD says: "Day_of_Month 与 Day_of_Week 是 OR (或) 关系（当两者都指定时）"
    // "Month 与其他字段是 AND (且) 关系"

    // If a field is 'all' (*), it matches everything.
    // Standard Cron: if both are restricted, it's OR. If one is *, it's AND?
    // PRD Example: `1 * 1` -> 1st OR Mon.
    // PRD Example: `* * *` -> Daily.

    // My logic implementation:
    // If Month doesn't match, return false.
    if (!matchMonth) return false;

    // Now check Day and Week.
    const dayRestricted = expr.dayOfMonth.type !== 'all';
    const weekRestricted = expr.dayOfWeek.type !== 'all';

    if (dayRestricted && weekRestricted) {
      return matchDay || matchWeek;
    } else if (dayRestricted) {
      return matchDay;
    } else if (weekRestricted) {
      return matchWeek;
    } else {
      // Both are *
      return true;
    }
  }

  static nextTrigger(expr: CrontabExpression, fromDate: Date = new Date()): Date | null {
    // 采用带"月份快进"的步进算法
    const m = moment(fromDate).add(1, 'day');

    // 限制最大查找范围（例如3年，防止 2月29日+特定星期 导致死循环）
    for (let i = 0; i < 1095; i++) {
      // 优化：如果当前月份不匹配，直接跳到下个月1号，大幅减少循环次数
      if (!this.matchField(expr.month, m.month() + 1)) {
        m.add(1, 'month').startOf('month');
        continue;
      }

      if (this.match(expr, m)) {
        return m.toDate();
      }
      m.add(1, 'day');
    }

    return null;
  }

  private static parseField(
    fieldStr: string,
    fieldType: keyof typeof CrontabParser.FIELD_RANGES
  ): CrontabField {
    const { min, max } = this.FIELD_RANGES[fieldType];

    if (fieldStr === '*') {
      return { type: 'all', values: [] };
    }

    // Support for 'L' (Last day of month)
    if (fieldStr === 'L' && fieldType === 'dayOfMonth') {
      return { type: 'value', values: [-1] }; // Using -1 to represent Last Day
    }

    // Step */n or range/n
    if (fieldStr.includes('/')) {
      const [range, stepStr] = fieldStr.split('/');
      const step = parseInt(stepStr, 10);
      let start = min,
        end = max;

      if (range !== '*') {
        if (range.includes('-')) {
          const [s, e] = range.split('-').map(v => parseInt(v, 10));
          start = s;
          end = e;
        } else {
          // 1/2 doesn't make sense usually, standard cron is range/step.
          // If just number, maybe start from there?
          // PRD: "start-end/n" or "*/n".
          // Let's support simple number/step as start-max/step? No, usually not valid.
          // I'll stick to * or range.
        }
      }

      const values = [];
      for (let i = start; i <= end; i += step) {
        values.push(i);
      }
      return { type: 'step', values, step };
    }

    // List 1,3,5
    if (fieldStr.includes(',')) {
      const values = fieldStr.split(',').map(v => parseInt(v, 10));
      return { type: 'list', values };
    }

    // Range 1-5
    if (fieldStr.includes('-')) {
      const [start, end] = fieldStr.split('-').map(v => parseInt(v, 10));
      const values = [];
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
      return { type: 'range', values };
    }

    // Single value
    const val = parseInt(fieldStr, 10);
    if (!isNaN(val)) {
      return { type: 'value', values: [val] };
    }

    throw new Error(`Invalid field: ${fieldStr}`);
  }

  private static matchField(field: CrontabField, value: number): boolean {
    if (field.type === 'all') return true;
    return field.values.includes(value);
  }
}
