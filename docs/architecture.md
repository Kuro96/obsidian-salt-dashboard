# Obsidian Homepage Dashboard - Technical Architecture

## Overview

This project follows a **Microkernel + Plugin** architecture to ensure modularity, extensibility, and maintainability.

### Core Principles

1.  **Core (Microkernel)**: Manages the lifecycle, configuration, and layout of the application. It knows _nothing_ about specific features (like "Date Progress" or "Todo").
2.  **Modules (Plugins)**: Self-contained units of functionality that register themselves with the Core. They encapsulate their own UI, logic, state, and styles.
3.  **Shared**: Common utilities and UI components used across modules.

## Directory Structure

```
src/
├── app/                        # Application Core
│   ├── main.tsx                # Entry Point (Plugin Lifecycle)
│   ├── App.tsx                 # Root React Component
│   ├── architecture/           # Core Interfaces (DashboardModule)
│   ├── registry/               # Module Registry Service
│   ├── settings/               # Global Settings Logic
│   ├── view/                   # Obsidian View Integration
│   ├── context/                # Global React Contexts (App, Settings)
│   ├── layout/                 # Grid Layout Engine
│   └── styles/                 # Global CSS (Base, Layout)
│
├── modules/                    # Feature Modules
│   ├── date-progress/          # [Module] Date Progress
│   │   ├── index.ts            # Module Definition
│   │   ├── components/         # React Components
│   │   ├── hooks/              # Business Logic Hooks
│   │   ├── services/           # Data Services
│   │   └── styles.css          # Module-specific Styles
│   ├── contribution-graph/     # [Module] Contribution Graph
│   ├── recent-files/           # [Module] Recent Files
│   ├── random-note/            # [Module] Random Note
│   ├── tmp-note/               # [Module] Tmp Note
│   └── todo/                   # [Domain] Todo Management
│       ├── daily/              # [Module] Daily Todo
│       ├── regular/            # [Module] Regular Todo
│       ├── shared/             # Shared Todo Logic
│       └── styles.css          # Shared Todo Styles
│
└── shared/                     # Shared Resources
    ├── components/             # Common UI (MarkdownContent, etc.)
    ├── utils/                  # Helper Functions
    ├── hooks/                  # Common Hooks
    └── constants.ts            # Global Constants
```

## Module Interface

Every module must implement the `DashboardModule` interface:

```typescript
interface DashboardModule {
  id: string;
  title: string;
  icon: string;
  defaultSettings: Record<string, any>;
  component: React.ComponentType<any>;
  renderSettings: (container: HTMLElement, plugin: Plugin, settings: any) => void;
}
```

## Data Flow

1.  **Registration**: Modules register with `ModuleRegistry` at plugin startup.
2.  **Configuration**: Settings are merged from Core defaults and Module defaults.
3.  **Rendering**: `GridLayout` iterates over the user's layout config, looking up components in `ModuleRegistry` by ID.
4.  **State**: Each module manages its own state via Hooks, optionally using the global `ObsidianContext` for API access.

## Styling

- **Global Styles**: Defined in `src/app/styles/`.
- **Module Styles**: Co-located with modules and bundled by the build system.
