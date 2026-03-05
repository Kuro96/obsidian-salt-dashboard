import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDateProgress } from '../hooks/useDateProgress';
import { useLayout } from '../../../app/hooks/useLayout';
import { moment } from 'obsidian';
import { getLocalizedMoment } from '../../../shared/utils/momentHelper';

export const DateProgress: React.FC = () => {
  const { t } = useTranslation();
  const { dateInfo, stats } = useDateProgress();
  const { getModuleConfig } = useLayout();

  if (!dateInfo) return <div>{t('modules.dateProgress.loading')}</div>;

  const moduleConfig = getModuleConfig('date-progress');
  const w = moduleConfig?.w || 6;
  const h = moduleConfig?.h || 8;

  // Compute size classes based on layout grid units
  const isCompactHeight = h <= 6;
  const isTinyHeight = h <= 4;
  const isCompactWidth = w <= 5;
  const isTinyWidth = w <= 3;
  const isWideWidth = w >= 8;

  const sizeClasses = [
    isCompactHeight ? 'dp-compact-h' : '',
    isTinyHeight ? 'dp-tiny-h' : '',
    isCompactWidth ? 'dp-compact-w' : '',
    isTinyWidth ? 'dp-tiny-w' : '',
    isWideWidth ? 'dp-wide-w' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const now = moment();

  return (
    <div className={`date-progress-module ${sizeClasses}`}>
      <div className="dp-top-section">
        {/* Calendar Section */}
        <div className="dp-calendar-wrapper">
          <div className="dp-calendar">
            <div className="dp-cal-top">{getLocalizedMoment().format('MMM')}</div>
            <div className="dp-cal-body">{getLocalizedMoment().format('DD')}</div>
          </div>
          <div className="dp-date-details">
            <div className="dp-weekday">{dateInfo.weekday}</div>
            <div className="dp-badges">
              <span className="dp-badge">
                📅 Q{dateInfo.quarter} · W{dateInfo.weekNumber}
              </span>
              <span className="dp-badge">
                📆 {t('modules.dateProgress.daysLeft', { days: dateInfo.remainingDays })}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="dp-progress-section">
          <div className="dp-progress-header">
            <span className="dp-ph-title">
              📊 {t('modules.dateProgress.yearProgress', { year: now.year() })}
            </span>
            <span className="dp-ph-detail">
              {t('modules.dateProgress.passedDays', {
                days: Math.floor(now.dayOfYear()),
                total: 365 + (moment().isLeapYear() ? 1 : 0),
              })}
            </span>
          </div>
          <div className="dp-progress-bar-bg">
            <div
              className="dp-progress-bar-fill"
              style={{ width: `${dateInfo.yearProgress}%` }}
            ></div>
            <div
              className={`dp-progress-text ${dateInfo.yearProgress < 20 ? 'outside' : 'inside'}`}
              style={{
                left: dateInfo.yearProgress < 20 ? `${dateInfo.yearProgress}%` : '0',
                width: dateInfo.yearProgress < 20 ? 'auto' : `${dateInfo.yearProgress}%`,
              }}
            >
              {dateInfo.yearProgress}%
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="dp-stats-card">
          <div className="dp-stats-grid">
            <div className="dp-stat-group today">
              <div className="dp-stat-item">
                <span className="dp-stat-val">+{stats.createdToday}</span>
                <span className="dp-stat-label">{t('modules.dateProgress.stats.newDay')}</span>
              </div>
              <div className="dp-stat-item">
                <span className="dp-stat-val">~{stats.modifiedToday}</span>
                <span className="dp-stat-label">{t('modules.dateProgress.stats.modDay')}</span>
              </div>
            </div>
            
            <div className="dp-stat-group week">
              <div className="dp-stat-item">
                <span className="dp-stat-val">+{stats.createdThisWeek}</span>
                <span className="dp-stat-label">{t('modules.dateProgress.stats.newWeek')}</span>
              </div>
              <div className="dp-stat-item">
                <span className="dp-stat-val">~{stats.modifiedThisWeek}</span>
                <span className="dp-stat-label">{t('modules.dateProgress.stats.modWeek')}</span>
              </div>
            </div>

            <div className="dp-stat-group total">
              <div className="dp-stat-item">
                <span className="dp-stat-val">{stats.totalNotes}</span>
                <span className="dp-stat-label">{t('modules.dateProgress.stats.total')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
