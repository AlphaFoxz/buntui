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

4. Draft the issue with **English title** and **bilingual body**:

    ```
    [English description]

    ---

    [Chinese description]
    ```

5. Confirm the draft with the user, then create. **Always use `--body-file`** — never inline `--body "..."` (see rationale at the bottom).

    a. Write the body to `C:\Users\Wong\AppData\Local\Temp\opencode\issue-body-<slug>.md` via the Write tool.

    b. Create and verify:

       ```bash
       $bodyPath = "C:\Users\Wong\AppData\Local\Temp\opencode\issue-body-<slug>.md"
       $result = gh issue create --title "<title>" --label "<labels>" --milestone "<milestone>" --body-file $bodyPath 2>&1
       "EXIT=$LASTEXITCODE"
       "RESULT=$result"
       ```

       Expect `EXIT=0` and a URL in `RESULT`. If not, debug and retry — `gh issue create` can fail silently.

    c. Delete the temp file with `Remove-Item -LiteralPath $bodyPath`.

6. Report the created issue number and URL back to the user.

## Why not inline `--body`?

On Windows/PowerShell, backticks (`` ` ``), `$`, and `"` in the body are interpreted as escape sequences / variable expansion. Markdown code spans (`` `file.ts` ``), Em-dash milestone names, and CJK characters are all prone. Observed failure: `EXIT=0` with empty stdout and no issue created. `--body-file` sidesteps all of this.
