import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useContributionGraph } from '../hooks/useContributionGraph';
import { useSettings } from '../../../app/context/SettingsContext';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { moment, getLocalizedMoment } from '../../../shared/utils/momentHelper';
import { TaskDetailModal } from './TaskDetailModal';
import { MarkdownContent } from '../../../shared/components/MarkdownContent';
import { MultiSelect, MultiSelectOption } from '../../../shared/components/MultiSelect';

export const ContributionGraph: React.FC = () => {
  const { t } = useTranslation();
  const { data, loading, getTaskDetails, updateConfig, config } = useContributionGraph();
  const { settings } = useSettings();
  const app = useObsidianApp(); // Get app instance

  // Tooltip State
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    align: 'left' | 'center' | 'right';
    vertical: 'top' | 'bottom';
    date: string;
    count: number;
    tasks: any[];
    loading: boolean;
    pinned: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    align: 'center',
    vertical: 'top',
    date: '',
    count: 0,
    tasks: [],
    loading: false,
    pinned: false,
  });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Handle outside click to close pinned tooltip
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltip.visible && tooltip.pinned) {
        // If click is inside tooltip, do nothing (stopPropagation is handled in tooltip, but safety check here)
        // Actually, since we are using Portal, we can check if target is inside tooltip.
        // But easier: we stopPropagation on tooltip click. So if this fires, it's outside.
        // UNLESS the click was on a day cell which also calls stopPropagation.
        // So this handler fires for clicks on background, other modules, etc.
        setTooltip(prev => ({ ...prev, visible: false, pinned: false }));
      }
    };

    if (tooltip.visible && tooltip.pinned) {
      window.addEventListener('click', handleOutsideClick);
    }

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [tooltip.visible, tooltip.pinned]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSourceChange = (selectedValues: string[]) => {
    updateConfig({
      enableDailyTodo: selectedValues.includes('daily'),
      enableRegularTodo: selectedValues.includes('regular'),
      enableJottingsTodo: selectedValues.includes('jottings'),
    });
  };

  // Prepare selected values
  const selectedSources = [];
  if (config.enableDailyTodo) selectedSources.push('daily');
  if (config.enableRegularTodo) selectedSources.push('regular');
  if (config.enableJottingsTodo) selectedSources.push('jottings');

  const sourceOptions: MultiSelectOption[] = [
    { label: t('modules.contributionGraph.sources.daily'), value: 'daily' },
    { label: t('modules.contributionGraph.sources.regular'), value: 'regular' },
    { label: t('modules.contributionGraph.sources.jottings'), value: 'jottings' },
  ];

  // Calculate max count for dynamic color scaling
  const maxCount = React.useMemo(() => {
    let max = 0;
    for (const val of data.values()) {
      if (val > max) max = val;
    }
    return max;
  }, [data]);

  const getColorLevel = (count: number) => {
    if (count === 0) return 0;
    if (maxCount <= 0) return 0;

    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const handleDayClick = async (e: React.MouseEvent, date: string, count: number) => {
    e.stopPropagation(); // Prevent closing pinned tooltip immediately
    if (count === 0) return;

    // Show tooltip immediately as pinned
    // Reuse showTooltip logic but force pinned
    showTooltip(e, date, count, true);
  };

  const showTooltip = async (
    e: React.MouseEvent,
    date: string,
    count: number,
    forcePin = false
  ) => {
    // If already pinned and not forcing a new pin (i.e. just hovering), ignore
    if (tooltip.pinned && !forcePin) return;

    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenWidth = window.innerWidth;

    // Determine Alignment and Position
    let align: 'left' | 'center' | 'right' = 'center';
    let vertical: 'top' | 'bottom' = 'top';

    // Horizontal
    if (rect.left < 200) align = 'left';
    else if (rect.right > screenWidth - 200) align = 'right';

    // Vertical
    // If close to top (less than 320px space), show below
    if (rect.top < 320) vertical = 'bottom';

    // Coordinates
    let x = rect.left + rect.width / 2; // Default center
    let y = rect.top; // Default top

    if (align === 'left') x = rect.left;
    if (align === 'right') x = rect.right;

    if (vertical === 'bottom') y = rect.bottom;

    setTooltip({
      visible: true,
      x,
      y,
      align,
      vertical,
      date,
      count,
      tasks: [],
      loading: true,
      pinned: forcePin,
    });

    try {
      // If count is 0, we might skip fetching details if we know it's empty,
      // but fetching ensures we have consistent state if there's a discrepancy.
      // However, optimization:
      if (count === 0) {
        setTooltip(prev => {
          if (prev.date !== date) return prev;
          return {
            ...prev,
            loading: false,
            tasks: [],
          };
        });
        return;
      }

      const details = await getTaskDetails(date);
      // Combine all tasks for preview
      const allTasks = [
        ...(details.daily || []),
        ...(details.regular || []),
        ...(details.jottings || []),
      ];

      setTooltip(prev => {
        if (prev.date !== date) return prev; // Mouse moved away (or pinned changed, but date check is safer)
        return {
          ...prev,
          loading: false,
          tasks: allTasks,
        };
      });
    } catch (err) {
      console.error('Failed to load tasks for tooltip', err);
      setTooltip(prev => (prev.date === date ? { ...prev, loading: false } : prev));
    }
  };

  const hideTooltip = () => {
    if (tooltip.pinned) return;

    // Delay hiding to allow moving mouse to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }));
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTooltip();
  };

  const handleTaskClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation(); // Prevent bubbling if necessary
    if (task.sourcePath) {
      // Open file
      const file = app.vault.getAbstractFileByPath(task.sourcePath);
      if (file) {
        app.workspace.getLeaf(false).openFile(file as any);
      } else {
        // If path is not a direct file path (rare in this context), try openLinkText
        // But sourcePath from Service should be full path.
        // Fallback
        app.workspace.openLinkText('', task.sourcePath);
      }
    }
  };

  if (loading && data.size === 0) return <div>{t('modules.contributionGraph.loading')}</div>;

  // Calculate dynamic dimensions
  let blockSize = 10;
  let totalWeeks = 53;
  const gap = 3;
  const monthLabelHeight = 15;
  const weekdaysWidth = 28;

  if (dimensions.height > 0 && dimensions.width > 0) {
    // Calculate blockSize based on height
    // Height = monthLabelHeight + (7 * blockSize) + (6 * gap)
    // blockSize = (Height - monthLabelHeight - (6 * gap)) / 7
    const calculatedBlockSize = Math.floor((dimensions.height - monthLabelHeight - 6 * gap) / 7);
    blockSize = Math.max(10, calculatedBlockSize); // Min 10px

    // Calculate weeks based on width
    // Width = weekdaysWidth + (totalWeeks * blockSize) + ((totalWeeks - 1) * gap)
    // Width - weekdaysWidth = totalWeeks * (blockSize + gap) - gap
    // (Width - weekdaysWidth + gap) / (blockSize + gap) = totalWeeks
    const calculatedWeeks = Math.floor(
      (dimensions.width - weekdaysWidth + gap) / (blockSize + gap)
    );
    totalWeeks = Math.max(10, calculatedWeeks); // Min 10 weeks
  }

  // Generate grid
  const today = moment();
  const oneYearAgo = today.clone().subtract(1, 'year');

  // To match GitHub: The graph ends at the current week.
  // The last column represents the current week.
  const startOfCurrentWeek = today.clone().startOf('week');
  const startDate = startOfCurrentWeek.clone().subtract(totalWeeks - 1, 'weeks');

  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = startDate.clone().add(w, 'weeks');
    const days = [];
    let isOneYearAgoWeek = false;

    // Month labels logic
    // GitHub puts the label on the first week that has the 1st day of the month
    // OR mostly on the first week of the month.
    const firstDayOfWeek = weekStart;
    const month = firstDayOfWeek.month();

    // If month changed, or if it's the first column
    if (month !== lastMonth) {
      // Check if this week contains the 1st of the month, or is the first full week
      // Simple heuristic: if the week start is early in the month?
      // GitHub logic: Label appears above the column where the month starts.
      // If the month started on Sunday, it's this col. If Wed, it's this col.
      // We can just label every time the month index changes for the first week of that month shown.

      // Avoid labeling if it's too close to the end (last couple weeks) to prevent overflow
      if (w < totalWeeks - 2) {
        monthLabels.push({
          text: firstDayOfWeek.format('MMM'),
          left: w * (blockSize + gap),
        });
      }
      lastMonth = month;
    }

    for (let d = 0; d < 7; d++) {
      const currentDay = weekStart.clone().add(d, 'days');
      const dateStr = currentDay.format('YYYY-MM-DD');
      const count = data.get(dateStr) || 0;
      const isFuture = currentDay.isAfter(today, 'day');
      const level = isFuture ? 0 : getColorLevel(count); // Force level 0 if future
      const isOneYearAgo = currentDay.isSame(oneYearAgo, 'day');

      if (isOneYearAgo) {
        isOneYearAgoWeek = true;
      }

      days.push({
        date: dateStr,
        count,
        level,
        isFuture,
        isOneYearAgo,
      });
    }
    weeks.push({ days, isOneYearAgoWeek });
  }

  return (
    <div
      className="contribution-graph-module"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    >
      <div className="module-header-actions">
        <MultiSelect
          options={sourceOptions}
          selectedValues={selectedSources}
          onChange={handleSourceChange}
          label={t('modules.contributionGraph.dataSources')}
          // No icon prop = use default Gear SVG
        />
      </div>
      <div className="cg-graph-container" style={{ width: '100%', height: '100%' }}>
        {/* Month Labels */}
        <div
          className="cg-months"
          style={{ marginLeft: `${weekdaysWidth + 4}px`, height: `${monthLabelHeight}px` }}
        >
          {monthLabels.map((label, i) => (
            <div key={i} className="cg-month-label" style={{ left: `${label.left}px` }}>
              {label.text}
            </div>
          ))}
        </div>

        <div className="cg-body">
          {/* Weekday Labels */}
          <div
            className="cg-weekdays"
            style={{
              width: `${weekdaysWidth}px`,
              gridTemplateRows: `repeat(7, ${blockSize}px)`,
              fontSize: Math.max(9, blockSize * 0.7) + 'px', // Scale font slightly
            }}
          >
            <div style={{ lineHeight: `${blockSize}px` }}></div>
            <div style={{ lineHeight: `${blockSize}px` }}>
              {t('modules.contributionGraph.weekdays.mon')}
            </div>
            <div style={{ lineHeight: `${blockSize}px` }}></div>
            <div style={{ lineHeight: `${blockSize}px` }}>
              {t('modules.contributionGraph.weekdays.wed')}
            </div>
            <div style={{ lineHeight: `${blockSize}px` }}></div>
            <div style={{ lineHeight: `${blockSize}px` }}>
              {t('modules.contributionGraph.weekdays.fri')}
            </div>
            <div style={{ lineHeight: `${blockSize}px` }}></div>
          </div>

          {/* Grid */}
          <div className="cg-grid">
            {weeks.map((weekData, wIndex) => (
              <div
                key={wIndex}
                className={`cg-week-col ${weekData.isOneYearAgoWeek ? 'one-year-mark-week' : ''}`}
                style={{ gridTemplateRows: `repeat(7, ${blockSize}px)` }}
              >
                {weekData.days.map((day, dIndex) => (
                  <div
                    key={day.date}
                    className={`cg-day ${!day.isFuture ? `level-${day.level}` : 'future'} ${day.isOneYearAgo ? 'one-year-mark-day' : ''}`}
                    onClick={e => !day.isFuture && handleDayClick(e, day.date, day.count)}
                    onMouseEnter={e => !day.isFuture && showTooltip(e, day.date, day.count)}
                    onMouseLeave={hideTooltip}
                    style={{ width: `${blockSize}px`, height: `${blockSize}px` }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Tooltip via Portal */}
      {tooltip.visible &&
        createPortal(
          <div
            className={`cg-tooltip align-${tooltip.align} vertical-${tooltip.vertical}`}
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside tooltip
          >
            <div className="cg-tooltip-header">
              <span className="cg-tooltip-date">{tooltip.date}</span>
              <span className="cg-tooltip-count">
                {t('modules.contributionGraph.tooltip.tasks', { count: tooltip.count })}
              </span>
            </div>
            <div className="cg-tooltip-content">
              {tooltip.loading ? (
                <div className="cg-tooltip-loading">
                  {t('modules.contributionGraph.tooltip.loading')}
                </div>
              ) : (
                <div className="cg-tooltip-list">
                  {tooltip.tasks.slice(0, 15).map((task, i) => (
                    <div
                      key={i}
                      className="cg-tooltip-item"
                      onClick={e => handleTaskClick(e, task)}
                    >
                      <MarkdownContent content={task.text} sourcePath={task.sourcePath} />
                    </div>
                  ))}
                  {tooltip.tasks.length > 15 && (
                    <div className="cg-tooltip-more">
                      {t('modules.contributionGraph.tooltip.more', {
                        count: tooltip.tasks.length - 15,
                      })}
                    </div>
                  )}
                  {tooltip.tasks.length === 0 && (
                    <div className="cg-tooltip-empty">
                      {t('modules.contributionGraph.tooltip.empty')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
