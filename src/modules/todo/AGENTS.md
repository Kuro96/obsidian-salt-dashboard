# TODO MODULE KNOWLEDGE

## OVERVIEW

`src/modules/todo` is a module family, not a single module: daily recurring tasks, regular markdown tasks, and shared task UI/service primitives.

## STRUCTURE

```text
todo/
├── daily/       # daily.md + stats JSON + cron schedule behavior
├── regular/     # date-file markdown checkbox tasks
├── shared/      # TodoBaseService, TodoItem, submit guard hook
└── styles.css   # shared todo module styles
```

## WHERE TO LOOK

| Task                | Location                                 | Notes                                                         |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Shared task parsing | `shared/services/TodoBaseService.ts`     | Checkbox parsing, status kind, sorting, guarded file mutation |
| Shared task UI      | `shared/components/TodoItem.tsx`         | Inline edit, markdown rendering, action buttons               |
| Submit guard        | `shared/hooks/useTaskSubmission.ts`      | `isSubmitting` plus synchronous ref lock                      |
| Daily service       | `daily/services/DailyTodoService.ts`     | `daily.md`, cron parsing, stats JSON writes                   |
| Daily hook          | `daily/hooks/useDailyTodo.ts`            | Injects global todo folder/stats into daily config            |
| Cron UI             | `daily/components/CronInput.tsx`         | User-friendly schedule editor                                 |
| Regular service     | `regular/services/RegularTodoService.ts` | Markdown checkbox file scan and mutation                      |
| Regular hook        | `regular/hooks/useRegularTodo.ts`        | Excludes daily file from regular task scan                    |

## CONVENTIONS

- Task status parsing is generic: `- [<any char>] text`; status category maps known chars and treats unknown as active.
- Completed regular tasks use `✅ YYYY-MM-DD`; abandoned tasks use `❌ YYYY-MM-DD`.
- Daily completion state is stored through `DailyStatsManager`, not by rewriting the daily task line to completed.
- Daily cron syntax is backticked at the end of task text, e.g. `` Task `* * 1` ``.
- Hooks inject global settings (`todoSourceFolder`, `todoStatsFile`) into module-specific configs before creating services.
- `TodoBaseService.modifyTaskFile()` verifies target line still contains expected task text before writing.

## ANTI-PATTERNS

- Do not hardcode only `[ ]`, `[!]`, `[x]`, `[-]`; legacy/unknown checkbox markers must still parse as active.
- Do not use `isSubmitting` state alone to prevent duplicate writes; keep synchronous ref locks for same-tick re-entry.
- Do not mutate daily stats and markdown task text as if they were the same data source.
- Do not remove cron suffix when editing daily task text; preserve or intentionally update it.
- Do not scan the daily task file as a regular task source.
