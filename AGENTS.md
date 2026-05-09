# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-09
**Commit:** 7fd9284
**Branch:** master

## OVERVIEW

Obsidian Salt Dashboard is an Obsidian plugin built with React 18, TypeScript, esbuild, and a microkernel-style module registry. Core runtime lives in `src/app`; dashboard features live as self-contained modules under `src/modules`.

## PROJECT WORKFLOW

- Refer to `PRD.md` for feature scope; update it only when feature scope or behavior changes.

## STRUCTURE

```text
obsidian-salt-dashboard/
├── src/app/       # Obsidian plugin lifecycle, settings, layout, registry
├── src/modules/   # Built-in dashboard modules
├── src/shared/    # Internal shared components, utilities, constants
├── src/i18n/      # i18next setup and locale resources
├── examples/      # External single-file JSX/JS module examples
├── docs/          # User/architecture/custom plugin documentation
├── assets/        # README images
└── build/         # Generated plugin bundle artifacts
```

## WHERE TO LOOK

| Task                   | Location                                  | Notes                                                                  |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| Plugin lifecycle       | `src/app/main.tsx`                        | Registers modules, view, command, settings tab, external plugin loader |
| Obsidian view root     | `src/app/view/HomepageView.tsx`           | Hosts the dashboard view lifecycle                                     |
| React root             | `src/app/App.tsx`                         | Thin wrapper around layout                                             |
| Grid behavior          | `src/app/layout/GridLayout.tsx`           | Responsive `react-grid-layout`, drag handle, resize handles            |
| Module contract        | `src/app/architecture/DashboardModule.ts` | `id`, `settingsKey`, defaults, component, settings renderer            |
| Module registry        | `src/app/registry/ModuleRegistry.ts`      | Merges default settings and notifies registry subscribers              |
| Settings UI            | `src/app/settings/SettingsTab.ts`         | Global settings plus each module's `renderSettings`                    |
| Defaults               | `src/shared/constants.ts`                 | `VIEW_TYPE_HOMEPAGE`, `DEFAULT_SETTINGS`, default layout               |
| Query filters          | `src/shared/utils/SourceParser.ts`        | Dataview-style source parser for files/tags/frontmatter                |
| Built-in modules       | `src/modules/*/index.ts`                  | One `DashboardModule` definition per module                            |
| Todo domain            | `src/modules/todo/`                       | Nested daily/regular/shared module family                              |
| Custom plugin examples | `examples/*.jsx`                          | Self-contained external module reference, not importable API           |

## CODE MAP

| Symbol               | Type           | Location                                                  | Role                                                      |
| -------------------- | -------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `HomepagePlugin`     | class          | `src/app/main.tsx`                                        | Obsidian plugin entry and runtime coordinator             |
| `DashboardModule`    | interface      | `src/app/architecture/DashboardModule.ts`                 | Module/public extension shape                             |
| `registry`           | singleton      | `src/app/registry/ModuleRegistry.ts`                      | Built-in/external module registry                         |
| `PluginLoader`       | class          | `src/app/services/PluginLoader.ts`                        | Loads `.js/.cjs/.jsx` dashboard modules from vault folder |
| `LayoutManager`      | class          | `src/app/services/LayoutManager.ts`                       | Syncs layout entries with registered modules              |
| `SourceParser`       | class          | `src/shared/utils/SourceParser.ts`                        | Parses source strings for recent/random file filtering    |
| `TodoBaseService`    | abstract class | `src/modules/todo/shared/services/TodoBaseService.ts`     | Shared task parsing/sorting/file mutation base            |
| `DailyTodoService`   | class          | `src/modules/todo/daily/services/DailyTodoService.ts`     | Daily task file + stats JSON coordination                 |
| `RegularTodoService` | class          | `src/modules/todo/regular/services/RegularTodoService.ts` | Markdown checkbox task mutation                           |
| `RecentFilesService` | class          | `src/modules/recent-files/services/RecentFilesService.ts` | Query/filter/sort/pin/create/delete recent files          |

## CONVENTIONS

- Package manager is npm; `package-lock.json`, CI, Release, and scripts all use npm.
- Node version is `>=20.0.0`; CI uses Node 20.
- TypeScript uses `baseUrl: "."`, `allowJs`, `isolatedModules`, `strictNullChecks`, `noImplicitAny`, `jsx: react-jsx`; no `paths` aliases.
- Module directories normally expose `index.ts` with a `DashboardModule`, plus optional `components/`, `hooks/`, `services/`, and `styles.css`.
- Built-in module IDs use kebab-case; `settingsKey` uses camelCase and must match a `HomepageSettings` slice.
- Default module settings belong in `src/shared/constants.ts`, not scattered through components.
- Styling is concatenated in fixed order by `esbuild.config.mjs`; add module CSS there when creating a new built-in module stylesheet.
- Prettier: semicolons, 2 spaces, `printWidth=100`, single quotes, trailing commas where valid in ES5.
- ESLint `no-explicit-any` and unused vars are warnings; `_`-prefixed args are ignored for unused checks.

## ANTI-PATTERNS

- Do not import `src/` internals from external custom plugins; examples should stay self-contained.
- Do not treat visual class reuse as API compatibility for custom plugins.
- Do not rely on undocumented `PluginLoader` runtime injection beyond documented globals: `React`, `Obsidian`, `require('react')`, `require('obsidian')`.
- Do not type structured config slices as `Record<string, unknown>`; use concrete interfaces.
- Do not duplicate settings-derived sort/filter state into local state when the settings context is the source of truth.
- Do not reset `loading` to `true` for background refreshes; reserve it for first load.
- Do not attach broad click handlers to text-selectable content containers; bind only actual action targets.
- Do not mutate host-rendered `.module-title` from external JSX plugins; export a stable `title`.

## COMMANDS

```bash
npm run dev       # esbuild watch mode
npm run build     # production bundle to build/main.js + build/styles.css
npm run test      # Jest via ts-jest; currently no test files are present
npm run lint      # ESLint with --fix
npm run format    # Prettier over repository
```

CI runs `npm install`, installs `pre-commit`, runs `pre-commit run --all-files`, then `npm run build`. Release runs on tag push, builds, copies `build/main.js`, `build/styles.css`, and `manifest.json`, zips them, and publishes a GitHub Release.

## NOTES

- Jest is configured with `tests/__mocks__/obsidian.ts`, but that file and actual test files are currently absent.
- `SourceParser` accepts `FROM`, path strings, `#tag`, `AND`/`OR`/`NOT`, `!`/`-` negation, `[property]`, `[property:null]`, and `[property:expr]`; empty source returns true, parse failure returns false.
- `CrontabParser` is a 3-field parser, not standard 5-field cron.
- Custom plugin docs in `README.md` and `docs/how-to-write-a-gist-plugin.md` define extension boundaries more strictly than source examples.
