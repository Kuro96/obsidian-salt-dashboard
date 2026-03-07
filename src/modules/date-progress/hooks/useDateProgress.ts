import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { useSettings } from '../../../app/context/SettingsContext';
import { DateProgressService, DateInfo, VaultStats } from '../services/DateProgressService';

export const useDateProgress = () => {
  const app = useObsidianApp();
  const { settings } = useSettings();

  const service = useMemo(() => {
    return new DateProgressService(app, settings.dateProgress);
  }, [app, settings.dateProgress]);

  const [dateInfo, setDateInfo] = useState<DateInfo | null>(() => service.getDateInfo());
  const [stats, setStats] = useState<VaultStats | null>(() =>
    settings.dateProgress.showStats ? service.getStats() : null
  );

  const refresh = useCallback(() => {
    setDateInfo(service.getDateInfo());
    if (settings.dateProgress.showStats) {
      setStats(service.getStats());
    }
  }, [service, settings.dateProgress.showStats]);

  useEffect(() => {
    // We already fetch state on mount via lazy init.
    const interval = setInterval(() => {
      setDateInfo(service.getDateInfo());
    }, 60000);

    // Refresh stats on vault changes
    const onVaultChange = () => refresh();

    // We bind to general events. Ideally debounce this.
    const refModify = app.vault.on('modify', onVaultChange);
    const refCreate = app.vault.on('create', onVaultChange);
    const refDelete = app.vault.on('delete', onVaultChange);

    return () => {
      clearInterval(interval);
      app.vault.offref(refModify);
      app.vault.offref(refCreate);
      app.vault.offref(refDelete);
    };
  }, [refresh, app.vault, service]);

  return { dateInfo, stats };
};
