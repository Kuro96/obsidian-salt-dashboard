import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { useSettings } from '../../../app/context/SettingsContext';
import { RandomNoteService, RandomNoteData } from '../services/RandomNoteService';
import { moment } from 'obsidian';
import { getFileMtime } from '../../../shared/utils/fileTime';

export const useRandomNote = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  const service = useMemo(() => {
    return new RandomNoteService(app, settings.randomNote);
  }, [app, settings.randomNote]);

  const [note, setNote] = useState<RandomNoteData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomNote = useCallback(
    async (force = false) => {
      const today = moment().format('YYYY-MM-DD');
      const cacheKey = `homepage-random-note-${today}`;

      if (!force) {
        const cachedPath = localStorage.getItem(cacheKey);
        if (cachedPath) {
          const file = app.vault.getAbstractFileByPath(cachedPath);
          if (file) {
            const content = await app.vault.read(file as any);
            const contentBody = content.replace(/^---[\s\S]+?---\n/, '');
            setNote({
              file: file as any,
              content: contentBody.substring(0, 500) + (contentBody.length > 500 ? '...' : ''),
              mtime: getFileMtime(app, file as any),
            });
            return;
          }
        }
      }

      setLoading(true);
      const data = await service.getRandomNote(settings.globalFilter || '');
      if (data) {
        setNote(data);
        localStorage.setItem(cacheKey, data.file.path);
      }
      setLoading(false);
    },
    [service, app.vault, settings.globalFilter]
  );

  useEffect(() => {
    fetchRandomNote();
  }, [fetchRandomNote]);

  const refresh = () => fetchRandomNote(true);

  const openNote = () => {
    if (note) {
      app.workspace.getLeaf(false).openFile(note.file);
    }
  };

  return { note, loading, refresh, openNote };
};
