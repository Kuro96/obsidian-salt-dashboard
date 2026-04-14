import { useState, useEffect, useMemo, useCallback } from 'react';
import { useObsidianApp } from '../../../app/context/ObsidianContext';
import { useSettings } from '../../../app/context/SettingsContext';
import { ContributionGraphService } from '../services/ContributionGraphService';

export const useContributionGraph = () => {
  const app = useObsidianApp();
  const { settings, updateSettings } = useSettings();

  const service = useMemo(() => {
    return new ContributionGraphService(app, settings);
  }, [app, settings]);

  const [data, setData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const map = await service.getYearData();
        setData(map);
      } catch (e) {
        console.error('Failed to fetch contribution data', e);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [service]
  );

  useEffect(() => {
    fetchData(true);

    let debounceTimer: NodeJS.Timeout;

    const handleModify = (file: any) => {
      if (file.extension === 'md') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchData(false); // Background update
        }, 1000);
      }
    };

    // Listen to changes
    // We listen to all markdown files because tasks can be in Daily Notes or Todo folder
    const ref = app.vault.on('modify', handleModify);

    return () => {
      app.vault.offref(ref);
      clearTimeout(debounceTimer);
    };
  }, [fetchData, app.vault]);

  const getTaskDetails = async (date: string) => {
    return await service.getCompletedTasksByDate(date);
  };

  const updateConfig = async (newConfig: Partial<typeof settings.contributionGraph>) => {
    await updateSettings({
      contributionGraph: {
        ...settings.contributionGraph,
        ...newConfig,
      },
    });
  };

  return {
    data,
    loading,
    getTaskDetails,
    updateConfig,
    config: settings.contributionGraph,
  };
};
