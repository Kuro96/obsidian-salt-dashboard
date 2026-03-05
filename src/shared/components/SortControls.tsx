import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { HeaderActionButton } from './HeaderActionButton';

export type SortOption = 'default' | 'name' | 'mtime';
export type SortOrder = 'asc' | 'desc';

interface SortControlsProps {
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortOption) => void;
  onOrderChange: (sortOrder: SortOrder) => void;
  options?: { label: string; value: string }[]; // Relaxed type for flexibility
}

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  sortOrder,
  onSortChange,
  onOrderChange,
  options,
}) => {
  const { t } = useTranslation();

  const effectiveOptions = options || [
    { label: t('modules.todo.shared.sort.default'), value: 'default' },
    { label: t('modules.todo.shared.sort.name'), value: 'name' },
    { label: t('shared.sort.time'), value: 'mtime' },
  ];

  return (
    <div className="sort-controls" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <select
        className="rf-control-select" // Reusing RecentFiles class for styling
        value={sortBy}
        onChange={e => onSortChange(e.target.value as SortOption)}
        style={{
          padding: '0 4px',
          fontSize: '11px',
          height: '24px',
          borderRadius: '4px',
          border: '1px solid var(--background-modifier-border)',
          background: 'var(--background-primary)',
          color: 'var(--text-muted)',
        }}
      >
        {effectiveOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <HeaderActionButton
        onClick={() => onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        title={sortOrder === 'asc' ? t('shared.sort.ascending') : t('shared.sort.descending')}
        icon={sortOrder === 'asc' ? '↑' : '↓'}
      />
    </div>
  );
};
