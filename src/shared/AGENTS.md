# SHARED KNOWLEDGE

## OVERVIEW

`src/shared` is the internal shared layer for built-in modules only: constants, file/query utilities, date helpers, markdown rendering, action controls, and form widgets.

## WHERE TO LOOK

| Task                    | Location                                                                | Notes                                         |
| ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Defaults/view type      | `constants.ts`                                                          | `DEFAULT_SETTINGS`, `VIEW_TYPE_HOMEPAGE`      |
| Query parsing           | `utils/SourceParser.ts`                                                 | Used by Recent Files and Random Note filters  |
| Cron parsing            | `utils/crontabParser.ts`                                                | 3-field daily todo schedule parser            |
| Localized dates         | `utils/momentHelper.ts`                                                 | Normalizes `zh`/`zh-meme` to `zh-cn`          |
| Vault time fields       | `utils/fileTime.ts`                                                     | Frontmatter-aware ctime/mtime helpers         |
| File/folder inputs      | `utils/FileSuggest.ts`                                                  | Obsidian `Scope` + Popper suggestion UI       |
| Markdown preview        | `components/MarkdownContent.tsx`                                        | Obsidian `MarkdownRenderer` lifecycle wrapper |
| Shared actions          | `components/HeaderActionButton.tsx`, `components/ItemActionButtons.tsx` | Class-name driven styling contracts           |
| Sorting/filter controls | `components/SortControls.tsx`, `components/MultiSelect.tsx`             | Reused by todo/recent modules                 |

## CONVENTIONS

- This directory is internal to compiled source; external custom plugins must not import from it.
- Keep shared components generic and style through existing stable class names rather than module-specific assumptions.
- `SourceParser.parse('')` returns an always-true predicate; invalid expressions return always-false after logging.
- `SourceParser` supports path strings, tags, `AND`/`OR`/`NOT`, `!`/`-`, property existence, null checks, and property value expressions.
- `CrontabParser` supports `*`, `L`, comma lists, ranges, and steps across day/month/week only.
- `MarkdownContent` owns Obsidian `Component` lifecycle; unload old components when changing render behavior.

## ANTI-PATTERNS

- Do not expose `src/shared` as a supported external plugin API.
- Do not rename CSS class contracts such as `rf-control-select`, `module-header-actions`, or task action classes without checking all module consumers and docs.
- Do not attach parent click handlers that swallow markdown internal link clicks; `MarkdownContent` already stops link propagation.
- Do not forget to release Obsidian scopes or detached DOM when modifying suggestion-style utilities.
