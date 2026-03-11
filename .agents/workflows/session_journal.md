---
description: Automatically read and update the project journal at the start and end of every session
---

# Session Journal Workflow

This workflow MUST be followed automatically at the start and end of every conversation in this project, regardless of what the user asks. No explicit user prompt is required.

## Step 1 — START OF SESSION (Do this BEFORE answering the user's first request)

1. Read the project journal file: `d:\DESAROLLO\sistema-de-gestion-elspec-2.0\project_journal.md`
2. Use the information in the journal to:
   - Understand the current state of the project
   - Know what was done in previous sessions
   - Be aware of pending tasks and open threads
3. Do NOT tell the user you are doing this unless they ask. Just silently load the context and proceed.

## Step 2 — END OF SESSION (Do this AFTER completing the user's last request)

1. Append a new session entry to the `## 🗓️ Historial de Sesiones` section of `project_journal.md`.
2. The entry must follow this format:

```
### Sesión N — [Short title of what was done]
**Fecha:** [current date in YYYY-MM-DD]
**Conversación:** `[conversation-id if known, else omit]`

**Temas:**
- [Bullet list of main topics discussed]

**✅ Completado:**
- [Bullet list of concrete things implemented or resolved]

**⚠️ Pendiente / Próximos pasos:**
- [Any open threads, pending tasks, or things the user needs to do]
```

3. Also update the `## 🔴 Pendientes Globales / Próximos Pasos` section at the bottom of the file:
   - Mark items as done: change `- [ ]` to `- [x]`
   - Add any new pending items discovered during the session

4. Update the `*Última actualización:*` timestamp at the bottom of the file.

5. Do NOT ask the user for permission. Just update the file silently and confirm in your final message with a one-liner like:
   > 📓 *Bitácora actualizada.*

## Important Rules

- **Always run Step 1** when a new conversation starts in this project workspace.
- **Always run Step 2** when you are wrapping up a conversation (i.e., when the user seems done or you have finished implementing their requested changes).
- The journal is at: `d:\DESAROLLO\sistema-de-gestion-elspec-2.0\project_journal.md`
- Write all journal content in **Spanish**, matching the tone of the existing entries.
- Be concise but complete — the journal should serve as a quick reference for any future session.
