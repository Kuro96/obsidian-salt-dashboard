# EXAMPLES KNOWLEDGE

## OVERVIEW

`examples` contains external single-file dashboard modules for users. They demonstrate supported custom plugin boundaries and must stay self-contained.

## WHERE TO LOOK

| Task                          | Location                                | Notes                                                           |
| ----------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| Complete external task module | `jotting-task.jsx`                      | Large metadata/frontmatter-based module; no TODO checkbox files |
| Minimal visual widget         | `weather.jsx`                           | Simple JSX module with local i18n and inline styles             |
| Custom plugin docs            | `../docs/how-to-write-a-gist-plugin.md` | Runtime globals and limitations                                 |
| User-facing README example    | `../README.md`                          | DOs/DON'Ts for custom plugins                                   |

## CONVENTIONS

- Examples export a single CommonJS module object compatible with `DashboardModule`.
- Examples may use globals `React`, `Obsidian`, `require('react')`, and `require('obsidian')`.
- JSX examples are transformed at runtime by Sucrase in `PluginLoader`.
- Keep examples self-contained; define local helpers, i18n resources, and styles in the same file.
- Style similarity should come from stable class names or inline/embedded CSS, not imported internal components.

## ANTI-PATTERNS

- Do not import from `src/` or any internal TypeScript file.
- Do not require arbitrary npm packages unless the runtime shim explicitly supports them.
- Do not assume built-in hooks/components/services are available to external modules.
- Do not use custom plugins to mutate host-rendered `.module-title`; export `title` instead.
- Do not couple example modules to TODO checkbox files unless the example is explicitly a TODO-file example; `jotting-task.jsx` is metadata/frontmatter-based.
