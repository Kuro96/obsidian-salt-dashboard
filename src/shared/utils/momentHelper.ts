import { moment as _moment } from 'obsidian';
import type { Moment, MomentInput, MomentFormatSpecification, Locale } from 'moment';
import i18n from '../../i18n';

// obsidian re-exports moment via `import * as Moment from 'moment'` which strips
// the call signatures from the type under TypeScript strict mode.
// Cast back to the real callable moment factory type.
type CallableMoment = {
  (inp?: MomentInput, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, strict?: boolean): Moment;
  (
    inp?: MomentInput,
    format?: MomentFormatSpecification,
    language?: string,
    strict?: boolean
  ): Moment;
  isMoment(m: any): m is Moment;
  localeData(key?: string | string[]): Locale;
  utc(inp?: MomentInput): Moment;
};

export const moment = _moment as unknown as CallableMoment;

export const getLocalizedMoment = (input?: MomentInput) => {
  const m = moment(input);
  let lng = i18n.language;
  if (lng === 'zh-meme' || lng === 'zh') {
    lng = 'zh-cn';
  }
  return m.locale(lng);
};

export const getMonthsShort = () => {
  let lng = i18n.language;
  if (lng === 'zh-meme' || lng === 'zh') {
    lng = 'zh-cn';
  }
  return _moment.localeData(lng).monthsShort();
};

export const getWeekdaysShort = () => {
  let lng = i18n.language;
  if (lng === 'zh-meme' || lng === 'zh') {
    lng = 'zh-cn';
  }
  return _moment.localeData(lng).weekdaysMin();
};
