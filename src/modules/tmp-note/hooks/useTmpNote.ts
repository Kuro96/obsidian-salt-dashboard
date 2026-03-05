import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { useSettings } from '../../../app/context/SettingsContext';
import { TmpNoteService, TmpNoteData } from '../services/TmpNoteService';

export const useTmpNote = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  const service = useMemo(() => {
    return new TmpNoteService(app, settings.tmpNote);
  }, [app, settings.tmpNote]);

  const [note, setNote] = useState<TmpNoteData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await service.getTmpNote();
    setNote(data);
    setLoading(false);
  }, [service]);

  useEffect(() => {
    refresh();

    const ref = app.vault.on('modify', file => {
      if (file.path === (settings.tmpNote.tmpNotePath || 'works/tmp/tmp.md')) {
        refresh();
      }
    });

    return () => {
      app.vault.offref(ref);
    };
  }, [refresh, app.vault, settings.tmpNote.tmpNotePath]);

  const openNote = () => {
    if (note) {
      app.workspace.getLeaf(false).openFile(note.file);
    }
  };

  return { note, loading, openNote };
};
