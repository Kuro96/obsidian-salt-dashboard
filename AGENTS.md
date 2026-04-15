## Interaction

- Always reply in **Chinese** and address the user as 'SaltP'.
- Always refer to `PRD.md`, update when feature changed
- Always explain your intent before apply changes.

## Memory & Self-Correction Protocol (HIGHEST PRIORITY)

1. **READ FIRST**: Before generating any code or plans, you **MUST** read `lessons.md` to check if the current task involves known pitfalls.
2. **CHECKLIST**: If the user's request touches on a topic listed in `lessons.md`, explicitly confirm in your thought process: "I see a known risk in lessons.md regarding [Topic], I will ensure to avoid [Specific Error]."
3. **UPDATE LOOP**: If you make a mistake during this session (e.g., build fails, linter errors, or user correction) and then fix it:
   - You **MUST** determine if this is a repeatable pattern or a "gotcha".
   - If yes, **IMMEDIATELY** append a concise rule to `lessons.md` in the format: `- [Context] Action/Constraint to prevent error.`
   - Do not ask for permission to update the file; just do it as part of the fix.

## Error Handling Style

- When fixing a bug, do not just apply the patch. Analyze **why** it happened.
- If the error was caused by hallucinating a non-existent API or forgetting a project convention, log it in `lessons.md`.
