import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { moment } from 'obsidian';
import { getMonthsShort, getWeekdaysShort } from '../../../../shared/utils/momentHelper';

// --- 1. 配置常量 ---

// Use moment for localized names
const getMonths = () => getMonthsShort();
const getWeekdays = () => getWeekdaysShort();

// --- 2. 核心解析逻辑 ---

/**
 * 通用解析器
 */
const parsePart = (
  part: string,
  map: string[],
  offset: number,
  unit: string, // "day", "month", "weekday"
  t: TFunction
): string => {
  if (part === '*' || part === '?') return '';

  // 1. Step (步长) "*/2", "1-5/2"
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    const stepVal = parseInt(step);

    if (stepVal === 1) return parsePart(range, map, offset, unit, t);

    // key: "modules.todo.shared.cron.expr.every" -> "Every {{step}} {{unit}}"
    // unit key: "modules.todo.shared.cron.expr.days"
    const unitLabel = t(`modules.todo.shared.cron.expr.${unit}s`);
    const stepLabel = t('modules.todo.shared.cron.expr.every', { step: stepVal, unit: unitLabel });

    if (range === '*' || range === '0-6' || range === '1-12' || range === '1-31') {
      return stepLabel;
    } else {
      // range/step
      // "Every 2 days from X"
      // Simplified: return Step + " " + Range
      return `${stepLabel} ${parsePart(range, map, offset, unit, t)}`;
    }
  }

  // 2. List
  if (part.includes(',')) {
    return part
      .split(',')
      .map(p => parsePart(p, map, offset, unit, t))
      .join(', ');
  }

  // 3. Range
  if (part.includes('-')) {
    const [start, end] = part.split('-');
    const sVal = parseInt(start) + offset;
    const eVal = parseInt(end) + offset;
    const sLabel = map[sVal] || start;
    const eLabel = map[eVal] || end;
    return t('modules.todo.shared.cron.expr.range', { start: sLabel, end: eLabel });
  }

  // 4. Single Value
  const val = parseInt(part);
  if (!isNaN(val)) {
    const idx = val + offset;
    return map[idx] || part;
  }

  return part;
};

// 序数词处理
const getOrdinalDay = (dayStr: string, t: TFunction): string => {
  if (dayStr.includes('/') || dayStr.includes('-') || dayStr === '*') {
    return '';
  }

  const parts = dayStr.split(',');
  const converted = parts.map(p => {
    const n = parseInt(p);
    if (isNaN(n)) return p;
    // Chinese doesn't use st/nd/rd, English does.
    // Using i18n key with suffix
    // For English: 1st, 2nd, 3rd...
    // For Chinese: 1号, 2号...

    // Determine suffix for English
    let suffix = 'th';
    if (moment.locale().startsWith('en')) {
      const v = n % 100;
      const s = ['th', 'st', 'nd', 'rd'];
      suffix = s[(v - 20) % 10] || s[v] || s[0];
    } else {
      // For other languages, let translation handle it or just empty
      // In zh.ts we defined ordinal: "{{val}}号", so suffix is ignored or used as is?
      // Actually {{val}}{{suffix}} in en.ts.
      // In zh.ts {{val}}号.
      // I will pass suffix as param.
      suffix = ''; // In ZH, suffix is hardcoded in the value of the key? No.
      // zh.ts: "{{val}}号". Suffix param is unused.
      // en.ts: "{{val}}{{suffix}}". Suffix param used.
    }

    return t('modules.todo.shared.cron.expr.ordinal', { val: n, suffix });
  });

  return converted.join(', ');
};

export const getCronLabel = (raw: string, t: TFunction) => {
  if (!raw || !raw.trim()) return '';

  // 1. Check Presets
  const preset = PRESET_KEYS.find(p => p.value === raw.trim());
  if (preset) {
    return t(`modules.todo.shared.cron.presets.${preset.key}`);
  }

  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 3) return raw;

  const [day, month, week] = parts;

  // Daily check
  if (day === '*' && month === '*' && week === '*') return t('modules.todo.shared.cron.expr.daily');

  const segments: string[] = [];
  const monthsMap = getMonths();
  const weekdaysMap = getWeekdays();

  // 1. Month
  if (month !== '*') {
    if (month.includes('/')) {
      segments.push(parsePart(month, monthsMap, 0, 'month', t));
    } else {
      const val = parsePart(month, monthsMap, 0, 'month', t);
      segments.push(t('modules.todo.shared.cron.expr.in', { val }));
    }
  }

  // 2. Day
  if (day !== '*') {
    if (day.includes('/')) {
      segments.push(parsePart(day, [], 0, 'day', t));
    } else if (day.includes('-')) {
      segments.push(parsePart(day, [], 0, 'day', t)); // Range handles itself
    } else {
      const val = getOrdinalDay(day, t);
      segments.push(t('modules.todo.shared.cron.expr.on', { val })); // "on the 1st" -> "on 1st"
    }
  }

  // 3. Week
  if (week !== '*') {
    const wLabel = parsePart(week, weekdaysMap, 0, 'weekday', t);
    if (week.includes('/')) {
      segments.push(wLabel);
    } else {
      segments.push(t('modules.todo.shared.cron.expr.on', { val: wLabel }));
    }
  }

  if (segments.length === 0) return t('modules.todo.shared.cron.expr.daily');

  const text = segments.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// --- 3. 增强预设值 ---

const PRESET_KEYS = [
  { key: 'daily', value: '* * *' },
  { key: 'every2daysOdd', value: '*/2 * *' },
  { key: 'every2daysEven', value: '2-31/2 * *' },
  { key: 'every3days', value: '*/3 * *' },
  { key: 'weeklyMon', value: '* * 1' },
  { key: 'weeklyFri', value: '* * 5' },
  { key: 'weekdays', value: '* * 1-5' },
  { key: 'weekends', value: '* * 0,6' },
  { key: 'monthly1st', value: '1 * *' },
  { key: 'monthlyEnd', value: 'L * *' },
  { key: 'monthly15th', value: '15 * *' },
  { key: 'quarterly1st', value: '1 */3 *' },
  { key: 'yearlyJan1st', value: '1 1 *' },
];

// --- 4. 组件 ---

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const CronInput: React.FC<CronInputProps> = ({
  value,
  onChange,
  placeholder,
  onConfirm,
  onCancel,
  autoFocus,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const label = getCronLabel(value, t);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const presets = PRESET_KEYS.map(p => ({
    label: t(`modules.todo.shared.cron.presets.${p.key}`),
    value: p.value,
  }));

  // Update menu position on focus or scroll
  useEffect(() => {
    const updatePosition = () => {
      if (isFocused && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const menuWidth = 240;

        // Vertical Positioning
        let top = rect.bottom + 4;
        if (window.innerHeight - rect.bottom < 200) {
          top = rect.top - 204;
        }

        // Horizontal Positioning
        let left = rect.left;
        if (left + menuWidth > window.innerWidth) {
          left = rect.right - menuWidth;
        }

        setMenuStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${menuWidth}px`,
          zIndex: 9999,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'var(--background-primary)',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        });
      }
    };

    if (isFocused) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onConfirm) {
      e.stopPropagation();
      onConfirm();
    } else if (e.key === 'Escape' && onCancel) {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className="cron-input-wrapper relative">
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
          }, 200);
        }}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder || '* * *'}
        className="cron-input-field"
      />

      {isFocused &&
        createPortal(
          <div className="cron-presets-menu-portal" style={menuStyle}>
            <div
              style={{
                padding: '8px',
                fontSize: '12px',
                backgroundColor: 'var(--background-secondary)',
                color: 'var(--interactive-accent)',
                borderBottom: '1px solid var(--background-modifier-border)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '10px' }}>➜</span>{' '}
              {label || t('modules.todo.shared.cron.invalid')}
            </div>

            {presets.map(preset => (
              <div
                key={preset.value}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--background-modifier-border)',
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(preset.value);
                  setIsFocused(false);
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')
                }
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span>{preset.label}</span>
                <span
                  style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '11px' }}
                >
                  {preset.value}
                </span>
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
