# Agent conventions

Rules for AI agents working on this codebase.

<!-- BEGIN:pr-workflow-rules -->

## PR-based workflow — MANDATORY

**NEVER commit to `main`. NEVER push to `main`.** All changes go through feature branches and pull requests.

Before making ANY code change:

1. Run `git branch --show-current` to check the current branch
2. If on `main`, create a feature branch first: `git checkout -b feat/description` (or `fix/`, `refactor/`, `chore/`)
3. If already on a feature branch, proceed

Every PR must include a changelog entry (`changelog/*.md`) unless it's infrastructure-only — in that case add the `skip-changelog` label.

**Formatting and linting are enforced automatically by a lefthook pre-commit hook** — `prettier --check` and `oxlint` run on staged files at commit time. If they fail, the commit is rejected. Fix formatting with `npm run fmt` and re-commit.

**MANDATORY: Run `npm run build` locally BEFORE pushing.** Do not rely on CI as the first build check — catch errors locally first.

**MANDATORY: Wait for CI checks to pass BEFORE merging a PR.** Even if checks are not required by branch protection, always confirm all checks pass before merging.

**MANDATORY: NEVER merge a PR without the user's explicit permission.** Even if the user says "proceed" or "do it", that means implement + push — NOT merge. Only merge when the user explicitly says "merge it" (or equivalent).

Full workflow details are in the `pr-workflow` OpenCode skill.

<!-- END:pr-workflow-rules -->

## Text casing

Use **sentence case** for all user-visible strings: labels, buttons, headings, descriptions, dropdown options, tooltips, and section titles.

- Capitalize only the first word and proper nouns/acronyms.
- Abbreviations like WP, POI, KMZ, RTH, CW, CCW, EGM96, MSL stay uppercase.
- Brand names like DroneRoute and DJI keep their casing.

Good: `"Grid survey"`, `"Heading mode"`, `"Go to first WP"`, `"Above ground level"`
Bad: `"Grid Survey"`, `"Heading Mode"`, `"Go to First WP"`, `"Above Ground Level"`

This applies to both source code and documentation (GUIDE.md, README.md).
Markdown section headings (`## Like This`) may use standard title case since they are structural, not UI text.

## Package versioning

The `droneroute` npm package (`packages/cli`) must always have the same version as the root workspace and the other packages. When bumping the version, update `packages/cli/package.json` to match.

## Public page

The "public page" refers to the GitHub Pages site hosted from the `gh-pages` branch — not the app's AboutDialog or SharedMissionPage. When asked to change the public page, switch to the `gh-pages` branch and edit its static assets.

## Screenshots

All application screenshots are taken at these coordinates: 41.25797725781744, 0.9322907667035154.

<!-- BEGIN:env-safety-rules -->

## Environment variable safety — MANDATORY

- **Never commit `.env` files** — they are in `.gitignore`
- **JWT_SECRET must be cryptographically random** in production — never use default or placeholder values
- **Database paths** should use the `/app/data/` mount in Docker, never a hardcoded host path
- **Before running ANY script that writes to a database**, verify the target. If it contains a remote host, STOP and confirm with the user
- **CORS origins** should be explicitly configured — never `*` in production

<!-- END:env-safety-rules -->

<!-- BEGIN:security-rules -->

## Security — MANDATORY

**Every API route that handles user data MUST validate the JWT token via middleware as its first operation.** All DB queries for user-specific data must be scoped with the authenticated user's ID from the JWT. Never accept a `userId` parameter from the client for authorization purposes.

**Never expose raw errors, stack traces, or internal paths to the client.** Log errors server-side and return generic messages to clients.

**All file uploads (KMZ/WPML) MUST be validated** — check file extension, MIME type, and enforce maximum file size. Never use user-supplied filenames directly on the filesystem.

**SQL queries must always use parameterized statements.** The backend uses `better-sqlite3` — always use `?` placeholders, never string concatenation.

Full security patterns are in the `security` OpenCode skill.

<!-- END:security-rules -->

<!-- BEGIN:github-issues-rules -->

## GitHub Issues tracking

All tasks, features, and bugs are tracked as **GitHub Issues** (not a local TODO file). Use `gh issue list` at the start of every session to understand what's open.

**Issue linking in PRs is mandatory.** Before creating any PR:

1. Check `gh issue list` for related issues
2. If the PR fully resolves an issue, include `Fixes #N` in the PR body
3. If the PR partially addresses an issue, use `Relates to #N` instead
4. GitHub auto-closes issues linked with `Fixes` when the PR merges

<!-- END:github-issues-rules -->

<!-- BEGIN:ui-screenshots-rules -->

## UI/UX PRs require screenshots — MANDATORY

**BEFORE writing ANY code that changes UI**, capture "before" screenshots BEFORE touching any files. This is non-negotiable — you lose the ability to capture the original state after modifying code.

Checklist for any PR touching UI:

1. Capture "before" screenshots of affected pages/components
2. Implement the changes
3. Capture "after" screenshots and annotate them (red arrows/labels)
4. Store all images in `docs/screenshots/`
5. Embed screenshots in the PR description using commit SHA-based GitHub blob URLs

Standard viewport: **1280x720**. Standard map coordinates: **41.25797725781744, 0.9322907667035154**.

Full workflow details are in the `ui-screenshots` OpenCode skill.

<!-- END:ui-screenshots-rules -->

<!-- BEGIN:task-completion-rules -->

## Task completion workflow

When executing a multi-step plan (e.g., the user says "proceed" or "do it"), **always include committing and pushing as the final steps in the todo list**. The user expects code changes to be deployed — don't stop at "build passes".

Final todos should be:

1. ... (all implementation steps)
2. Commit changes with a descriptive message
3. Push to remote

<!-- END:task-completion-rules -->
