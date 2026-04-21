---
name: pr-workflow
description: PR-based development workflow for droneroute. Use when implementing features, fixing bugs, or making any code changes. Covers branch creation, CI checks, changelog entries, and PR creation.
---

## What I do

Enforce the PR-based development workflow. All code changes go through pull requests — never push directly to main.

## When to use me

- Starting any implementation task (feature, bug fix, refactor, etc.)
- Creating a branch for new work
- Writing changelog entries for PRs
- Creating pull requests
- Checking CI status on PRs

## Critical rules

1. **NEVER commit to main.** NEVER push to main. All changes go through feature branches and PRs.
2. **ALWAYS check the current branch** before making any changes. If on `main`, create a feature branch first.
3. **Every PR must include a changelog entry** unless it's purely infrastructure (CI config, skill files, etc.) — in that case, add the `skip-changelog` label to the PR.

## Workflow

### 1. Start work — create a feature branch

```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

Branch naming conventions:

- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — refactoring
- `chore/<short-description>` — infrastructure, CI, deps, etc.

### 2. Implement the changes

- Make commits on the feature branch
- **Formatting and linting are enforced automatically by a lefthook pre-commit hook** — `prettier --check` and `oxlint` run on staged files at commit time. If they fail, the commit is rejected. Fix formatting with `npm run fmt` and re-commit.
- **MANDATORY: Run `npm run build` locally before every push.** Do NOT rely on CI as the first build check — catch errors locally.

### 3. Write a changelog entry

Create a markdown file in the `changelog/` directory:

```
changelog/YYYY-MM-DD-slug.md
```

Format:

```markdown
## Summary

Brief description of what changed and why.

## Changes

- Change 1
- Change 2
```

If the PR is purely infrastructure (CI, skills, config) and has no user-facing changes, skip the changelog and add the `skip-changelog` label to the PR instead.

### 4. Push and create PR

```bash
git push -u origin <branch-name>
```

Create the PR with `gh pr create`. The PR body should follow this format:

```markdown
## Summary

- Brief description of changes

Fixes #N

## Changelog

- What changed for users
```

**Issue linking is mandatory.** Before creating a PR, check `gh issue list` for related issues.

### 5. CI checks

These checks run automatically on every PR to `main`:

| Check         | What it catches                      |
| ------------- | ------------------------------------ |
| **Typecheck** | Type errors across all packages      |
| **Lint**      | Code quality via oxlint              |
| **Format**    | Formatting consistency               |
| **Build**     | Compilation errors                   |
| **Docker**    | Dockerfile builds successfully       |
| **Changelog** | Missing changelog entry              |
| **Audit**     | npm vulnerabilities (on dep changes) |

All checks must pass before merging.

### 6. Merge

**MANDATORY: NEVER merge a PR without the user's explicit permission.** Even if the user says "proceed" or "do it", that means implement + push — NOT merge. Only merge when the user explicitly says "merge it".

**MANDATORY: Wait for CI checks to pass BEFORE merging.**

## Common scenarios

### Quick fix (1 commit)

```bash
git checkout main && git pull
git checkout -b fix/description
# make changes
npm run build
git add -A && git commit -m "fix: description"
git push -u origin fix/description
gh pr create --title "fix: description" --body "..."
```

### Infrastructure change (no changelog)

```bash
git checkout main && git pull
git checkout -b chore/description
# make changes
npm run build
git push -u origin chore/description
gh pr create --title "chore: description" --body "..." --label skip-changelog
```
