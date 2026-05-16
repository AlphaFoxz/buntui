---
name: create-issue
description: Create bilingual GitHub issues with labels and milestones. Use when creating new issues via gh CLI.
---

# Create Issue

Create a bilingual GitHub issue with appropriate labels.

## Steps

1. Ask the user to describe the issue (or use their current message as context).

2. Determine labels:
    - Priority: `P0` (blocking), `P1` (architecture), `P2` (code quality), `P3` (test coverage)
    - Scope: `native` (Zig), `lib` (TypeScript packages), `roadmap`
    - Type: `bug`, `enhancement`, `documentation`

3. Determine milestone (ask user if unclear):
    - Phase 0 — Make the core work
    - Phase 1 — Cross-platform support
    - Phase 2 — Widget library
    - Phase 3 — Reactive binding layer
    - Phase 4 — Declarative API (SFC)
    - Phase 5 — Ecosystem
    - Triage — Issues to prioritize

4. Draft the issue body in **bilingual format**:

    ```
    [English description]

    ---

    [Chinese description]
    ```

5. Confirm the draft with the user, then create:

    ```bash
    gh issue create --title "<title>" --label "<labels>" --milestone "<milestone>" --body "<body>"
    ```

6. Report the created issue number and URL back to the user.
