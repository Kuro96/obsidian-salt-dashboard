import { HomepageSettings, ModuleLayout } from '../types';
import { registry } from '../registry/ModuleRegistry';

export class LayoutManager {
  /**
   * Synchronizes the user's saved layout settings with the currently registered modules.
   * 1. Adds missing modules (newly registered) to the layout configuration.
   * 2. (Optional) Removes modules that are no longer registered (cleanup).
   *
   * @param settings The current settings object.
   * @returns A boolean indicating if changes were made.
   */
  static syncLayout(settings: HomepageSettings): boolean {
    let changed = false;
    const registeredModules = registry.getAllModules();
    const layoutModules = settings.layout.modules;

    // 1. Check for new modules
    registeredModules.forEach(regMod => {
      const exists = layoutModules.find(m => m.id === regMod.id);
      if (!exists) {
        console.log(`[LayoutManager] New module detected: ${regMod.id}. Adding to layout.`);
        // Determine next available position (simple append)
        // We'll put it at y=infinity to let the Grid packer sort it out, or below the last one.
        const maxY = layoutModules.reduce((max, m) => Math.max(max, (m.y || 0) + (m.h || 0)), 0);

        const newLayoutItem: ModuleLayout = {
          id: regMod.id,
          enabled: true, // Auto-enable new modules by default? Or false? Let's say true so user sees it.
          title: regMod.title,
          x: 0,
          y: maxY,
          w: regMod.defaultLayout?.w ?? 6, // Use default width if available
          h: regMod.defaultLayout?.h ?? 8, // Use default height if available
          showTitle: regMod.defaultLayout?.showTitle ?? true, // Use default title visibility
        };
        layoutModules.push(newLayoutItem);
        changed = true;
      }
    });

    // 2. Check for removed modules (Optional: keep them as ghosts or remove?)
    // Currently, we keep them to preserve config if the plugin fails to load temporarily.
    // But for cleanup, we might want a flag. For now, we only ADD.

    return changed;
  }

  static toggleModule(settings: HomepageSettings, moduleId: string, enabled: boolean): boolean {
    const module = settings.layout.modules.find(m => m.id === moduleId);
    if (module) {
      module.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Removes layout entries for modules that are no longer registered.
   * @param settings The settings object to modify.
   * @returns The number of removed items.
   */
  static cleanLayout(settings: HomepageSettings): number {
    const registeredIds = new Set(registry.getAllModules().map(m => m.id));
    const originalLength = settings.layout.modules.length;

    settings.layout.modules = settings.layout.modules.filter(m => registeredIds.has(m.id));

    return originalLength - settings.layout.modules.length;
  }
}
