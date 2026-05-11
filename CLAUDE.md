# Project CLAUDE.md — Extensions to Global Protocol

The 5-agent closed-loop pipeline, role definitions, file conventions, loop counter, RLS / hook / config-driven principles, and absolute rules are inherited from the global `~/.claude/CLAUDE.md`. **This file only documents project-specific extensions and overrides.** Where this file is silent, follow the global protocol.

---

## 1. Two-Tier Checklist Convention (spec format)

`/docs/optimized_spec.md` MUST track every feature and acceptance criterion as a nested checklist so that implementation and verification are tracked independently:

```markdown
- Feature Name / Criteria
  - [ ] Implemented (Generator)
  - [ ] Tested (Evaluator 2)
```

**Write-permission extension to global §4.2:**

| Box | Who may toggle | When |
|:---|:---|:---|
| `[ ] Implemented` → `[x]` | Generator (Fixer) | End of Step 3, immediately after code edit |
| `[ ] Tested` → `[x]` | Evaluator 2 | End of Step 4, only on PASS |
| Spec body text | Planner / Change Request only | (unchanged from global) |

Generator and Evaluator 2 may **only** flip their respective checkboxes — they must not edit any other part of the spec.

## 2. Multi-Reporter Playwright Workflow

In Step 2 (Evaluator) and Step 4 (Evaluator 2), Playwright MUST be invoked with both a human-readable reporter and a JSON reporter so AI parsing runs in parallel with IDE streaming:

```bash
npx playwright test --workers=auto --reporter=line,json --output=/tmp/pw-results
```

- The JSON report is parsed with `jq` / `grep` to extract failing assertions.
- Paste only the **20–30 lines** of relevant stack trace / failing assertion into `/docs/feedback/eval_report.md`. Never dump full logs.
- **Do NOT pipe stdout to files** — IDE integrations such as Console Ninja consume stdout in real time. Use the JSON reporter's *file output* for AI parsing; keep stdout intact for the IDE.

## 3. Non-Interactive Shell Enforcement

All CLI commands MUST run with auto-confirm / non-interactive flags to prevent TTY hangs in the agent loop:

- npm: `npm ci --no-audit --no-fund`, `npm install -y`
- Supabase: `supabase ... --yes`, `supabase db reset --yes`
- Generic: `CI=true`, `-y`, `--yes`, `--force` where supported
- Forbidden flags: `git rebase -i`, `git add -i`, any prompt-driven mode

## 4. Autonomous Compaction (override of global §4.4)

The pipeline **never halts to request `/compact` or ask permission to continue.** Loop count limit (3) from global §4.3 remains the **only** human-intervention trigger.

End of Step 3 procedure:
1. Write a compressed state snapshot (what was tried, why it failed, what changed) to `/docs/progress.md`.
2. Internally drop all prior raw logs, intermediate drafts, and failure traces from active reasoning.
3. Proceed to Step 4 immediately based solely on the `progress.md` snapshot.
