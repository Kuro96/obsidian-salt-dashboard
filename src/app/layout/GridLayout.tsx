import * as React from 'react';
import { Responsive } from 'react-grid-layout';
import { useLayout } from '../hooks/useLayout';
import { useModuleRegistry } from '../hooks/useModuleRegistry';
import { DraggableModule } from './DraggableModule';

export const GridLayout: React.FC = () => {
  const { modules, saveLayout } = useLayout();
  const { getModule } = useModuleRegistry();

  // Use ResizeObserver to track container width
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0); // Start with 0 to indicate unmeasured
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        if (newWidth > 0) {
          setWidth(newWidth);
          setIsReady(true);
        }
      }
    };

    // Initial measure with a slight delay to ensure DOM is painted
    // requestAnimationFrame helps with obtaining correct dimensions after mount
    window.requestAnimationFrame(updateWidth);

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateWidth);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<string>('lg');

  const onBreakpointChange = (newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint);
  };

  // Helper to generate compact layouts for smaller screens
  const generateResponsiveLayout = (currentModules: any[], cols: number) => {
    // Sort by visual order (y then x) to ensure natural flow re-ordering
    const sorted = [...currentModules].sort((a, b) => {
      if ((a.y || 0) === (b.y || 0)) return (a.x || 0) - (b.x || 0);
      return (a.y || 0) - (b.y || 0);
    });

    const layout: any[] = [];
    // Simple grid tracker to find next available slot
    // grid[y][x] = true if occupied
    const grid: Record<number, Record<number, boolean>> = {};

    const checkCollision = (x: number, y: number, w: number, h: number) => {
      for (let i = y; i < y + h; i++) {
        if (!grid[i]) continue;
        for (let j = x; j < x + w; j++) {
          if (grid[i][j]) return true;
        }
      }
      return false;
    };

    const markOccupied = (x: number, y: number, w: number, h: number) => {
      for (let i = y; i < y + h; i++) {
        if (!grid[i]) grid[i] = {};
        for (let j = x; j < x + w; j++) {
          grid[i][j] = true;
        }
      }
    };

    for (const m of sorted) {
      let w = m.w || 6;
      const h = m.h || 8;

      // Adaptive Width Logic
      if (cols <= 4) {
        // Mobile: Force full width to avoid gaps and tiny columns
        w = cols;
      } else if (cols === 6) {
        // Tablet (sm):
        // If original was > 1/3 (4 cols), make it full width (6) or half (3).
        // original 12 -> 6 (Full)
        // original 8 -> 6 (Full) or 4 (2/3)? Let's prefer 6 for cleaner stacking.
        // original 6 -> 6 (Full) or 3 (Half). 3 is good for 2-col layout.
        // original 4 -> 3 (Half). Upgrading from 1/3 to 1/2.

        if (w >= 8) w = 6;
        else if (w >= 4) w = 3;
        else w = 3; // Minimum half width
      }

      // Ensure w doesn't exceed cols
      if (w > cols) w = cols;

      // Find first available position (Next Fit / First Fit)
      let x = 0;
      let y = 0;
      let found = false;

      // Limit y search to avoid infinite loop, though unlikely
      while (!found && y < 1000) {
        for (let tryX = 0; tryX <= cols - w; tryX++) {
          if (!checkCollision(tryX, y, w, h)) {
            x = tryX;
            found = true;
            break;
          }
        }
        if (!found) y++;
      }

      markOccupied(x, y, w, h);
      layout.push({ i: m.id, x, y, w, h });
    }
    return layout;
  };

  const layoutLg = modules.map(m => ({
    i: m.id,
    x: m.x || 0,
    y: m.y || 0,
    w: m.w || 6,
    h: m.h || 8,
  }));

  // md (12 cols) - same as lg
  const layoutMd = layoutLg;

  // sm (6 cols) - adaptive
  const layoutSm = React.useMemo(() => generateResponsiveLayout(modules, 6), [modules]);

  // xs (4 cols) - full width stack
  const layoutXs = React.useMemo(() => generateResponsiveLayout(modules, 4), [modules]);

  // xxs (2 cols) - full width stack
  const layoutXxs = React.useMemo(() => generateResponsiveLayout(modules, 2), [modules]);

  const onLayoutChange = (currentLayout: any[]) => {
    if (width >= 996) {
      saveLayout(currentLayout);
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '100px' }}>
      {isReady && width > 0 ? (
        <Responsive
          className="layout"
          width={width}
          layouts={{ lg: layoutLg, md: layoutMd, sm: layoutSm, xs: layoutXs, xxs: layoutXxs }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
          onBreakpointChange={onBreakpointChange}
          margin={[16, 16]}
          dragConfig={{ handle: '.module-handle' }}
          resizeConfig={{ handles: ['sw', 'se'] }}
        >
          {modules.map(moduleLayout => {
            const dashboardModule = getModule(moduleLayout.id);

            // Fix: Reserve space for async loaded plugins
            if (!dashboardModule && moduleLayout.enabled) {
              return (
                <DraggableModule key={moduleLayout.id} module={moduleLayout}>
                  <div
                    className="loading-state"
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--background-secondary)',
                      borderRadius: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                      Loading {moduleLayout.title || moduleLayout.id}...
                    </span>
                  </div>
                </DraggableModule>
              );
            }

            if (!dashboardModule || !moduleLayout.enabled) return null;
            const Component = dashboardModule.component;

            return (
              <DraggableModule key={moduleLayout.id} module={moduleLayout}>
                <Component />
              </DraggableModule>
            );
          })}
        </Responsive>
      ) : (
        <div className="loading-state">Loading layout...</div>
      )}
    </div>
  );
};
