---
name: sync-rules
description: Sync documentation rules with current source code. Use ONLY when asked to verify or update .opencode/rules/*.md files against the actual codebase.
---

# Sync Rules

Sync `.opencode/rules/*.md` documentation with the current state of the source code.

## Steps

1. List all rule files in `.opencode/rules/*.md` and read each one.

2. For each rule file, identify all **verifiable claims** — concrete references to the source code that could go stale:
    - File paths (e.g. `packages/native/src/core/event_bus.zig`)
    - Function/type/variable names (e.g. `event_bus_emit`, `DrawCmd`)
    - Numeric constants (e.g. slot sizes, queue sizes, byte offsets)
    - Enum values and IDs (e.g. `KeyboardEvent` = `1`)
    - Type signatures and struct fields
    - Export lists and import paths

3. Cross-check each claim against the actual source code:
    - Verify file paths exist with `Glob` or `Read`
    - Verify symbol names with `Grep`
    - Verify constants/values by reading the relevant source
    - Verify type signatures and struct layouts by reading the actual definitions

4. When a discrepancy is found, decide the appropriate action:
    - **Content drift** (paths/names/values changed): Read the current source to understand the change, then update the rule file to match. Keep the rule's writing style and level of detail consistent.
    - **Obsolete scope** (the entire subsystem was removed/refactored away): **Delete** the rule file. Confirm with the user before deleting.
    - **Overlapping/merged topics** (two rule files now cover the same thing due to refactoring): **Consolidate** into one file and delete the redundant one. Confirm with the user before deleting.
    - **Renamed subsystem** (the concept still exists but the directory/module was renamed): **Rename** the rule file to match the new naming, update all internal references accordingly.
    - **Stale but partially valid** (some sections still accurate, others obsolete): Rewrite the rule, keeping valid sections and replacing or removing stale ones.
    - **New subsystem without coverage** (a significant module/subsystem exists in the codebase but no rule file covers it, and it has enough complexity to warrant one): **Create** a new rule file with appropriate documentation. Follow the naming and style conventions of existing rule files.

5. After processing all rule files, summarize:
    - What was verified and already in sync
    - What content was updated (and why)
    - What files were created, renamed, deleted, or consolidated (with reasons)
    - Flag anything uncertain for the user to review

## Rules file inventory

| File                    | Key topics                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `zig-coding.md`         | Naming, error handling, FFI export pattern, global state, Win32 API, logging, imports                             |
| `drawlist-rendering.md` | Command buffer format, command categories, rasterizer, clip stack                                                 |
| `event-system.md`       | Ring buffer, event header layout, event types, consumer protocol, binary payloads                                 |
| `ffi-boundary.md`       | Type mapping table, string/pointer transfer, export list, adding new exports                                      |
| `typescript-coding.md`  | XO restrictions, null/undefined, private fields, interfaces, type imports, DrawList widget pattern, event classes |
| `sfc-extensions.md`     | Core vs extension widget resolution, sub-path exports, adding new extension widgets                               |

## Notes

- Rule files can be created, updated, renamed, or deleted — whichever action fits the situation.
- When deleting a rule file, confirm with the user first. When renaming, also update any references to the old filename in AGENTS.md or other files.
- If a referenced file no longer exists and there is no clear replacement, flag it to the user instead of guessing.
