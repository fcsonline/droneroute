---
name: todo-tracking
description: GitHub Issues tracking workflow for droneroute. Use when managing tasks, features, and bugs.
---

## What I do

Ensure project work is tracked via **GitHub Issues**. All tasks, features, bugs, and improvements are managed as issues in the repository — there is no local TODO file.

## When to use me

- Starting a new work session
- Discovering new bugs or follow-up work during implementation
- Creating or closing issues
- Linking PRs to issues

## Rules

### 1. Check open issues at session start

Before starting any implementation work, run:

```bash
gh issue list
```

This gives you the current backlog and prevents duplicate work.

### 2. Reference issues in PRs

When a PR resolves an issue, include `Fixes #N` in the **PR description body** (not just the title). GitHub will auto-close the issue when the PR merges.

For partial progress, use `Related to #N` instead.

### 3. Create issues for new work

If you discover new work during implementation (bugs, follow-ups, tech debt), create a GitHub Issue:

```bash
gh issue create --title "Brief description" --label "label" --body "Details"
```

### 4. Do NOT maintain a TODO file

There is no `TODO.md` in this repository. All tracking lives in GitHub Issues.

## Files

- `AGENTS.md` — Contains the GitHub Issues tracking rule
