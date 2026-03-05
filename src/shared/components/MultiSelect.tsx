import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { HeaderActionButton } from './HeaderActionButton';

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label?: string; // Optional trigger button label
  icon?: React.ReactNode; // Optional trigger icon
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  label = 'Select',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <HeaderActionButton
        className={isOpen ? 'multi-select-open' : ''}
        onClick={() => setIsOpen(!isOpen)}
        title={label}
        icon={
          icon || (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          )
        }
      />
      {isOpen && (
        <div
          className="multi-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '140px',
            padding: '4px 0',
            textAlign: 'left',
            cursor: 'default',
          }}
          onClick={e => e.stopPropagation()}
        >
          {options.map(option => (
            <label
              key={option.value}
              className="multi-select-option"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--text-normal)',
                gap: '8px',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)')
              }
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                style={{ margin: 0 }}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
