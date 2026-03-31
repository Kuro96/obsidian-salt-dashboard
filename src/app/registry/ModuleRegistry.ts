import { DashboardModule } from '../architecture/DashboardModule';

type RegistryListener = () => void;

/**
 * Singleton registry for managing dashboard modules.
 */
class ModuleRegistry {
  private modules: Map<string, DashboardModule> = new Map();
  private listeners: Set<RegistryListener> = new Set();

  /**
   * Register a new module.
   * @param module The module to register.
   */
  register(module: DashboardModule) {
    if (this.modules.has(module.id)) {
      console.warn(`Module with ID '${module.id}' is already registered. Overwriting.`);
    }
    this.modules.set(module.id, module);
    console.log(`[Homepage] Module registered: ${module.id}`);
    this.notifyListeners();
  }

  /**
   * Get a module by its ID.
   * @param id The module ID.
   */
  getModule(id: string): DashboardModule | undefined {
    return this.modules.get(id);
  }

  /**
   * Get all registered modules.
   */
  getAllModules(): DashboardModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get default settings from all registered modules.
   * Modules with a settingsKey have their defaultSettings nested under that key.
   * Modules without a settingsKey must provide a pre-wrapped object themselves.
   * @returns A merged object of all default settings.
   */
  getAllDefaultSettings(): Record<string, object> {
    const defaults: Record<string, object> = {};
    this.modules.forEach(module => {
      if (module.settingsKey) {
        defaults[module.settingsKey] = module.defaultSettings;
      } else {
        Object.assign(defaults, module.defaultSettings);
      }
    });
    return defaults;
  }

  /**
   * Subscribe to registry changes.
   * @param listener Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const registry = new ModuleRegistry();
