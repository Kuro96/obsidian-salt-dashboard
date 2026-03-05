import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useRandomNote } from '../hooks/useRandomNote';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { moment } from 'obsidian';
import { getLocalizedMoment } from '../../../shared/utils/momentHelper';
import { MarkdownContent } from '../../../shared/components/MarkdownContent';
import { formatSize } from '../../../shared/utils/formatSize';
import { HeaderActionButton } from '../../../shared/components/HeaderActionButton';

export const RandomNote: React.FC = () => {
  const { t } = useTranslation();
  const app = useObsidianApp();
  const { note, loading, refresh, openNote } = useRandomNote();

  if (loading) return <div>{t('modules.randomNote.loading')}</div>;
  if (!note) return <div>{t('modules.randomNote.notFound')}</div>;

  return (
    <div className="random-note-module">
      <div className="module-header-actions">
        <HeaderActionButton onClick={refresh} title={t('modules.randomNote.refresh')} icon="↻" />
      </div>
      <div className="rn-content">
        <a
          className="rn-title internal-link"
          data-href={note.file.path}
          href={note.file.path}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            openNote();
          }}
          onMouseEnter={e => {
            app.workspace.trigger('hover-link', {
              event: e,
              source: 'preview',
              hoverParent: e.currentTarget,
              targetEl: e.currentTarget,
              linktext: note.file.path,
              sourcePath: '',
            });
          }}
        >
          {note.file.basename}
        </a>
        <div className="rn-preview">
          <MarkdownContent content={note.content} sourcePath={note.file.path} />
        </div>
        <div className="rn-meta">
          {formatSize(note.file.stat.size)} •{' '}
          {t('modules.randomNote.updated', { time: getLocalizedMoment(note.mtime).fromNow() })}
        </div>
      </div>
    </div>
  );
};
