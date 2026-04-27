# Cursor Agents (Project)

These agent definitions are mirrored from `.claude/agents` and optimized for Cursor models to reduce token cost.

## Model policy

- Default: `composer-2-fast` (cheap/fast) for implementation and routine tasks.
- Complex reasoning only: `gpt-5.5-medium` for `planner`, `plan-reviewer`, `code-reviewer`, `rn-debugger`.

## Available agents

- api-integrator
- code-reviewer
- docs-manager
- git-manager
- planner
- plan-reviewer
- project-manager
- researcher
- rn-debugger
- screen-builder
- scout
- ui-component-builder

Usage:
- Ask Cursor to follow a definition by file path in `.cursor/agents/`.
- If needed, we can force stricter routing via hook matcher rules.

Natural routing examples:
- "app bị crash khi mở map" -> `rn-debugger`
- "tạo màn report detail" -> `screen-builder`
- "làm component card mới" -> `ui-component-builder`
- "nối API report list" -> `api-integrator`
- "review convention giúp" -> `code-reviewer`
- "so sánh giải pháp trước khi code" -> `researcher`
