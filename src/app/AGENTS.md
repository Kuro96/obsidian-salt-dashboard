# APP CORE KNOWLEDGE

## OVERVIEW

`src/app` is the Obsidian plugin shell: lifecycle, providers, settings, view, registry, layout, and external plugin loading.

## STRUCTURE

```text
app/
├── main.tsx          # Obsidian Plugin subclass and runtime wiring
├── App.tsx           # React dashboard root
├── architecture/     # DashboardModule contract
├── context/          # Obsidian and settings providers
├── hooks/            # registry/layout hooks
├── layout/           # react-grid-layout integration
├── registry/         # singleton module registry
├── services/         # PluginLoader, LayoutManager
├── settings/         # Obsidian setting tab
├── styles/           # global CSS fragments
└── view/             # Obsidian view integration
```

## WHERE TO LOOK

| Task                             | Location                                    | Notes                                                              |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Add built-in module registration | `main.tsx`                                  | Import module and `registry.register(...)` before settings load    |
| Change module interface          | `architecture/DashboardModule.ts`           | Update registry, examples, docs together                           |
| Change default settings merge    | `registry/ModuleRegistry.ts` and `main.tsx` | `settingsKey` wraps module defaults                                |
| Change layout sync               | `services/LayoutManager.ts`                 | Adds missing modules, cleanup only via `cleanLayout`               |
| Change custom plugin loading     | `services/PluginLoader.ts`                  | JSX transformed by Sucrase, CommonJS wrapper, limited require shim |
| Change settings UI               | `settings/SettingsTab.ts`                   | Global sections first, then active modules, then module renderers  |
| Change grid behavior             | `layout/GridLayout.tsx`                     | Persist layout only at `width >= 996`                              |

## CONVENTIONS

- `HomepagePlugin.onload()` registers built-in modules before `loadSettings()` so module defaults can merge.
- `settingsKey` means registry wraps `defaultSettings` under that key; omitting it means the module must provide a pre-wrapped object.
- `SettingsProvider` is the settings source of truth; avoid copying global settings into local state unless the UI is explicitly editing a draft.
- External plugin loading happens after Obsidian `onLayoutReady` to ensure the vault cache is available.
- `PluginLoader` accepts `.js`, `.cjs`, and `.jsx`; JSX is transformed with Sucrase using `React.createElement`.
- `GridLayout` stores large-screen layout only; small breakpoints are generated from saved large layout.

## ANTI-PATTERNS

- Do not register modules after settings are merged unless you also sync layout and defaults deliberately.
- Do not assume `PluginLoader.unloadAll()` unregisters modules; registry currently overwrites by ID and has no unregister API.
- Do not persist responsive/mobile layouts; `GridLayout` intentionally saves only desktop layout.
- Do not add broad settings-side mutations without `saveSettings()`; UI depends on settings update handlers.
