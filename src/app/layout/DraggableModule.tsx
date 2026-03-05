import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ModuleLayout } from '../types';

export interface DraggableModuleProps extends React.HTMLAttributes<HTMLDivElement> {
  module: ModuleLayout;
  children?: React.ReactNode;
}

export const DraggableModule = React.forwardRef<HTMLDivElement, DraggableModuleProps>(
  ({ module, children, style, className, onMouseDown, onTouchStart, ...props }, ref) => {
    const { t } = useTranslation();

    // Determine the title to display
    // 1. If module.title is explicitly empty string, it might mean "no title" or "use default".
    // 2. However, based on DEFAULT_SETTINGS, some modules have hardcoded titles like "📅 Daily Tasks".
    // 3. To support i18n, we check if the title matches known English defaults and translate them.
    //    Or, simpler: if it matches the *key*, we translate.
    //    But we only have the ID.

    // Strategy:
    // - Define a mapping of Module ID -> Default Title Key
    // - If module.title matches the OLD English default, OR is empty, show the translated default.
    // - If user has customized it to something else, show that.

    const getLocalizedTitle = (id: string, currentTitle: string) => {
      const defaults: Record<string, string> = {
        'daily-todo': '📅 Daily Tasks',
        'regular-todo': '📝 Regular Tasks',
        'jottings-todo': '✍️ Jottings Tasks',
        'contribution-graph': '📈 Activity',
        'recent-files': '🗂️ Recent Files',
        'random-note': '🎲 Random Note',
        'tmp-note': '📝 Tmp Note',
      };

      const keyMap: Record<string, string> = {
        'daily-todo': 'modules.todo.daily.title',
        'regular-todo': 'modules.todo.regular.title',
        'jottings-todo': 'modules.todo.jottings.title',
        'contribution-graph': 'modules.contributionGraph.title',
        'recent-files': 'modules.recentFiles.title',
        'random-note': 'modules.randomNote.title',
        'tmp-note': 'modules.tmpNote.title',
        // DateProgress usually has no title in layout config (title: ""), handled by component
        'date-progress': 'modules.dateProgress.title',
      };

      const defaultEnglish = defaults[id];
      const translationKey = keyMap[id];

      // If current title is empty (and we have a key), return translated default
      if (!currentTitle && translationKey) {
        // Special case: DateProgress typically doesn't show a header title in layout
        if (id === 'date-progress') return '';
        return t(translationKey);
      }

      // If current title matches the hardcoded English default, translate it
      if (currentTitle === defaultEnglish && translationKey) {
        return t(translationKey);
      }

      return currentTitle;
    };

    const displayTitle = getLocalizedTitle(module.id, module.title || '');

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      // Only trigger RGL drag if clicking the handle
      if ((e.target as HTMLElement).closest('.module-handle')) {
        onMouseDown?.(e);
      }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      // Only trigger RGL drag if touching the handle
      if ((e.target as HTMLElement).closest('.module-handle')) {
        onTouchStart?.(e);
      }
    };

    return (
      <div
        ref={ref}
        className={`${className} dashboard-module module-id-${module.id}`}
        style={{ ...style, display: 'flex', flexDirection: 'column' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        {...props}
      >
        <div
          className="module-handle"
          style={{ cursor: 'grab', position: 'absolute', top: 8, right: 8, zIndex: 10 }}
        >
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
            className="lucide lucide-grip-vertical"
          >
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </div>

        {/* Unified Title Rendering if module has title and showTitle is true */}
        {displayTitle && module.showTitle !== false && (
          <div className="module-header" style={{ marginBottom: 8 }}>
            <h3 className="module-title" style={{ margin: 0 }}>
              {displayTitle}
            </h3>
          </div>
        )}

        <div
          className="module-content"
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {children}
        </div>
      </div>
    );
  }
);
