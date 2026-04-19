---
description: Plan a feature or system with auto-detected complexity. Modes: --fast (quick plan → execute), --hard (research + red-team + validate), --parallel (hard + file ownership per phase), --two (hard + 2 approaches, user selects). Always starts with Scope Challenge.
---

# /plan — Structured Planning Pipeline

## Usage

```
/plan [--fast | --hard | --parallel | --two] <description>
```

Auto-detect mode if no flag given:

- **Fast** — single-file change, familiar pattern, ≤ 2 components
- **Hard** — multi-file, unfamiliar domain, security-sensitive, or ≥ 3 phases
- **Parallel** — Hard + per-phase file ownership map
- **Two** — Hard + 2 approaches for user to select

---

### Step 0 — Scope Challenge

Before spawning any agents, challenge scope inline:

```
# Scope Challenge (Step 0):
#   Exists? → [does this feature already exist in the codebase?]
#   Minimum? → [smallest impl that satisfies requirements]
#   Complexity? → [Fast | Hard] — reasons: multi-file? unfamiliar? security?
#
# Mode: [Fast | Hard | Parallel | Two]
```

If scope is too large: suggest splitting and **wait for user confirmation**.

---

### Step 1 — Research (Hard / Parallel / Two only)

Spawn **2 `researcher` agents in parallel**:

- **Instance A** — primary approach and best practices
- **Instance B** — alternative approach and tradeoffs

Each researcher agent must also complete the following mandatory tasks:

**Security Threat Model (Research Agent Task):**
For the planned feature, identify:
- What sensitive data will this feature handle? (tokens, location, PII, images)
- What input surfaces exist? (forms, URL params, file uploads) → need Zod schema
- What API endpoints are involved? → check auth requirements
- Can this feature be abused? (rate limiting, spam reports, fake locations)

**Performance Planning (Research Agent Task):**
- Will this feature render lists? → plan FlatList optimization upfront
- Will this feature have animations? → confirm Reanimated UI thread approach
- What's the expected data size? → plan pagination/virtualization if > 20 items
- Any heavy computation? → plan useMemo / background processing

```
// spawning 2 researcher agents in parallel
//
// Researcher A: [approach] → [verdict]
// Researcher B: [approach] → [verdict]
```

---

### Step 2 — Plan Creation

Spawn the **`planner` agent** with feature description + mode + research reports.

Agent writes:

```
plans/YYMMDD-{slug}/
  plan.md
  phase-01-{name}.md
  phase-02-{name}.md
  ...
```

**Two mode**: `planner` produces `plan-a.md` and `plan-b.md` — show a summary of both, then **wait for user to choose** before continuing to Step 3.

```
// spawning planner agent
//
// Created:
//   plans/{date}-{slug}/plan.md
//   plans/{date}-{slug}/phase-01-{name}.md
//   plans/{date}-{slug}/phase-02-{name}.md

// [Two mode only] → show plan-a and plan-b summaries
// [Review Gate] → "Which approach do you prefer — A or B?" — waiting...
```

---

### Step 3 — Red-Team Review (Hard / Parallel / Two only)

Spawn the **`plan-reviewer` agent** with paths to all plan files.

Adjudicate each finding:

- `ACCEPTED` → edit the relevant plan file immediately
- `NOTED` → append to Risks section of `plan.md`
- `REJECTED` → document reason

```
// spawning plan-reviewer agent
//
// Security:    "{finding}" → ACCEPTED → phase-02 updated
// Assumption:  "{finding}" → NOTED    → added to risks
// Failure:     "{finding}" → ACCEPTED → plan.md updated
// Verdict: WARN — 0 CRITICAL, 1 HIGH resolved
```

If `plan-reviewer` returns `BLOCK`: revise the flagged phase and re-run before proceeding.

---

### Step 4 — Validation + execute

Ask 3–5 targeted questions about the plan's riskiest points. **Wait for user answers.**

Then hydrate tasks via TodoWrite:

```
// T1: {Phase 1} (no blockers)
// T2: {Phase 2} (blocked by T1)
// T3: {Phase 3} (blocked by T2)
```

Output the exact execute command:

```
Ready to execute:
/execute /abs/path/plans/{date}-{slug}/plan.md
```

---

## Agents

| Agent           | Step                       | Modes               |
| --------------- | -------------------------- | ------------------- |
| `researcher`    | 1 — research (×2 parallel) | Hard, Parallel, Two |
| `planner`       | 2 — creates plan files     | All                 |
| `plan-reviewer` | 3 — red-team review        | Hard, Parallel, Two |

---

## Integration

- `/execute <plan-file>` — implement phase by phase
- `/code-review` — review implementation after executing
- `/fix --quick` — fix build errors during executing
