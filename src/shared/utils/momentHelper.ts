import { moment } from 'obsidian';
import i18n from '../../i18n';

export const getLocalizedMoment = (input?: any) => {
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
  return moment.localeData(lng).monthsShort();
};

export const getWeekdaysShort = () => {
  let lng = i18n.language;
  if (lng === 'zh-meme' || lng === 'zh') {
    lng = 'zh-cn';
  }
  return moment.localeData(lng).weekdaysMin();
};
