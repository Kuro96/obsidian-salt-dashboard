import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useTmpNote } from '../hooks/useTmpNote';
import { moment } from 'obsidian';
import { getLocalizedMoment } from '../../../shared/utils/momentHelper';
import { MarkdownContent } from '../../../shared/components/MarkdownContent';
import { formatSize } from '../../../shared/utils/formatSize';
import { HeaderActionButton } from '../../../shared/components/HeaderActionButton';

export const TmpNote: React.FC = () => {
  const { t } = useTranslation();
  const { note, loading, openNote } = useTmpNote();

  if (loading && !note) return <div>{t('modules.tmpNote.loading')}</div>;
  if (!note) return <div>{t('modules.tmpNote.notFound')}</div>;

  return (
    <div className="tmp-note-module">
      <div className="module-header-actions">
        <HeaderActionButton onClick={openNote} title={t('modules.tmpNote.openFile')} icon="↗" />
      </div>

      <div className="tn-header" style={{ padding: '12px 12px 0 12px', flexShrink: 0 }}>
        <h3
          className="tn-title"
          style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-normal)' }}
        >
          {t('modules.settings.tmpNote.title')}
        </h3>
      </div>

      <div className="tn-body">
        <div className="tn-content">
          <MarkdownContent content={note.content} sourcePath={note.file.path} />
        </div>
        <div className="tn-meta">
          {formatSize(note.file.stat.size)} •{' '}
          {t('modules.tmpNote.updated', { time: getLocalizedMoment(note.mtime).fromNow() })}
        </div>
      </div>
    </div>
  );
};
