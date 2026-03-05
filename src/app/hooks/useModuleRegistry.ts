import { useState, useEffect } from 'react';
import { registry } from '../registry/ModuleRegistry';

export const useModuleRegistry = () => {
  // We use a simple counter to force re-renders
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = registry.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  return {
    getModule: (id: string) => registry.getModule(id),
    getAllModules: () => registry.getAllModules(),
    registryVersion: version,
  };
};
