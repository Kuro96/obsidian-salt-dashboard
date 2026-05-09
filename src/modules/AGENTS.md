# MODULES KNOWLEDGE

## OVERVIEW

`src/modules` contains built-in dashboard modules. Each module is a self-contained feature that registers through `DashboardModule` and may include UI, hook, service, and CSS files.

## STRUCTURE

```text
modules/
├── date-progress/
├── contribution-graph/
├── recent-files/
├── random-note/
├── tmp-note/
└── todo/              # nested daily/regular/shared module family
```

## WHERE TO LOOK

| Task               | Location             | Notes                                                                     |
| ------------------ | -------------------- | ------------------------------------------------------------------------- |
| Module definition  | `*/index.ts`         | `DashboardModule` export with `id`, `settingsKey`, component, settings UI |
| Module UI          | `*/components/*.tsx` | React rendering and user interactions                                     |
| Module state       | `*/hooks/*.ts`       | Settings/context/service coordination                                     |
| Vault/data logic   | `*/services/*.ts`    | Obsidian vault, metadata, JSON/Markdown mutations                         |
| Module styles      | `*/styles.css`       | Must be added to `esbuild.config.mjs` CSS concat list                     |
| Todo module family | `todo/`              | Daily + regular modules with shared task base                             |

## CONVENTIONS

- Module IDs are kebab-case; settings slices are camelCase and must match `HomepageSettings`.
- Put module defaults in `DEFAULT_SETTINGS`, then reference them from `index.ts`.
- Keep module hooks as orchestration between settings, Obsidian app, and service classes.
- Keep vault reads/writes in services, not components.
- `renderSettings` receives raw Obsidian DOM APIs; use shared `FileSuggest` and `createHoverInfo` for repeated patterns.
- If a module adds CSS, update `esbuild.config.mjs`; CSS is not auto-discovered.

## ANTI-PATTERNS

- Do not import module internals from external custom plugins.
- Do not let components mutate vault files directly when a service exists.
- Do not duplicate global filters/sorts in local state when settings context already owns them.
- Do not add module-specific shared code to `src/shared` until at least two modules consume it.

## HOTSPOTS

- `contribution-graph/components/ContributionGraph.tsx`: dense UI, tooltip, modal, sizing, task detail behavior.
- `recent-files/components/RecentFiles.tsx`: columns, create/delete/pin, sorting, collapse state.
- `todo/daily/components/CronInput.tsx`: cron parsing UI and popover behavior.
