---
description: Code review — local uncommitted changes or GitHub PR (pass PR number/URL for PR mode)
argument-hint: [pr-number | pr-url | blank for local review]
---

# /code-review

**Input**: $ARGUMENTS

## Mode Selection

If `$ARGUMENTS` contains a PR number, PR URL, or `--pr` → **PR Review Mode**.

Otherwise → **Local Review Mode**.

---

## Local Review Mode

### Phase 1 — GATHER

```bash
git diff --name-only HEAD
```

If no changed files, stop: "Nothing to review."

Read `CLAUDE.md` (if present) for project conventions.
Read each changed file **in full**.

### Phase 2 — REVIEW

Spawn the `code-reviewer` agent with:
- Full file contents of each changed file
- CLAUDE.md contents (if present)
- Recent context: `git log --oneline -5`

### Phase 3 — VALIDATE

Detect the project stack and run the appropriate build + test commands:

```bash
# .NET
dotnet build --no-restore -q && dotnet test

# Node / TypeScript
npm run build && npm test

# Python
python -m pytest

# Or use task runner if present (Makefile, Taskfile, package.json scripts)
```

Report pass/fail for build and tests separately.

### Phase 4 — SECURITY & PERFORMANCE REVIEW

## Security Review (Mandatory — Every PR)

Run these checks regardless of whether /security was invoked:

**🔴 BLOCK immediately if:**
- [ ] Token/password/API key hardcoded in source code
- [ ] `AsyncStorage` used to store `accessToken` or `refreshToken`
- [ ] HTTP (not HTTPS) in any API URL config
- [ ] `console.log` printing token, password, or user PII outside `if (__DEV__)`
- [ ] User-facing error shows raw `error.message` or server stack trace
- [ ] Form input submitted to API without Zod validation

**🟠 WARNING if:**
- [ ] Sensitive data sent via query params instead of body/path
- [ ] Missing `enabled: !!id` guard on detail queries (unnecessary API calls)
- [ ] 401 response not handled (user stays logged in with expired token)
- [ ] Image upload without MIME type + file size validation

## Performance Review (Mandatory — Every PR)

**🔴 BLOCK if:**
- [ ] `setState` or `set()` called inside Reanimated `useAnimatedStyle` callback
- [ ] Heavy computation (sort, filter, transform) inside render without `useMemo`
- [ ] FlatList `renderItem` uses inline arrow function without `React.memo` on item component
- [ ] `useAuthStore()` without selector (subscribes to entire store)

**🟡 WARNING if:**
- [ ] List item component missing `React.memo`
- [ ] Event handlers passed to list items not wrapped in `useCallback`
- [ ] `expo-image` not used (RN `Image` has no caching/blurhash)
- [ ] `getItemLayout` missing on FlatList with fixed-height items
- [ ] Search input calls API on every keystroke (no 300ms debounce)

### Phase 5 — REPORT

Present the agent's findings plus build/test results:

```
---
## Review Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 1     |
| MEDIUM   | 2     |
| LOW      | 0     |

Build: PASS / FAIL
Tests: PASS / FAIL

Verdict: APPROVE | WARNING | BLOCK
```

Decision rules:
- **APPROVE** — no CRITICAL/HIGH, build + tests pass
- **WARNING** — HIGH issues only (can merge with caution)
- **BLOCK** — any CRITICAL issue or build failure

---

## PR Review Mode

### Phase 1 — FETCH

| Input | Action |
|-------|--------|
| Number (`42`) | Use as PR number |
| URL (`github.com/.../pull/42`) | Extract PR number |

```bash
gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions
gh pr diff <NUMBER>
```

### Phase 2 — CONTEXT

1. Read `CLAUDE.md` for project constraints
2. Parse PR description for goals and linked issues
3. Read each changed file in full

### Phase 3 — REVIEW

Spawn the `code-reviewer` agent with full file contents and CLAUDE.md.

Additionally check:
- **Migration safety** — new NOT NULL columns must have defaults or be nullable
- **No missing migration** — if entity/schema changed, check for matching migration file
- **Breaking changes** — public API changes that could break consumers

### Phase 4 — VALIDATE

Run build + test commands as in Local Review Mode.

### Phase 5 — SECURITY & PERFORMANCE REVIEW

Run the mandatory Security Review and Performance Review checklists defined in Local Review Mode Phase 4. Both checklists are required for every PR — BLOCK conditions must be resolved before approval.

### Phase 6 — PUBLISH

```bash
# Approve
gh pr review <NUMBER> --approve --body "<summary>"

# Request changes
gh pr review <NUMBER> --request-changes --body "<summary with required fixes>"

# Comment only (draft PR)
gh pr review <NUMBER> --comment --body "<summary>"
```

For inline comments:
```bash
gh api "repos/{owner}/{repo}/pulls/<NUMBER>/comments" \
  -f body="<comment>" \
  -f path="<file>" \
  -F line=<line-number> \
  -f side="RIGHT" \
  -f commit_id="$(gh pr view <NUMBER> --json headRefOid --jq .headRefOid)"
```

### Phase 7 — OUTPUT

```
PR #<NUMBER>: <TITLE>
Decision: APPROVE | REQUEST CHANGES | BLOCK

Issues: <critical> critical, <high> high, <medium> medium, <low> low
Build: PASS / FAIL
Tests: PASS / FAIL

Next steps: <contextual suggestions>
```

## Related Agent

Invokes the `code-reviewer` agent — see `.claude/agents/code-reviewer.md`.
