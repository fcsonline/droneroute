---
name: ui-screenshots
description: Before/after screenshot workflow for UI PRs. Covers capture techniques, annotation, and embedding in PRs and changelogs.
---

## What I do

Guide capturing, annotating, and embedding before/after screenshots in PRs that change UX or UI.

## When to use me

- Any PR that changes UX, UI layout, or visual behavior
- Taking before/after screenshots for changelog entries or PR descriptions
- Before pushing a PR that touches UI components

## Screenshot workflow

### 1. Capture "before" screenshots FIRST

**Before making any code changes**, capture the current state. This is non-negotiable — you cannot recapture the original state after modifying files.

### 2. Implement changes

Make your code changes.

### 3. Capture "after" screenshots

Rebuild and capture the same pages/states.

### 4. Annotate "after" screenshots

Use red arrows and labels to highlight what changed:

- **Arrows**: Red, semi-transparent — `rgba(255, 60, 60, 0.7)` stroke, 3px width
- **Rectangles**: Rounded, semi-transparent border — `rgba(255, 60, 60, 0.55)` stroke, 2-3px width
- **Labels**: White text on `rgba(255, 60, 60, 0.7)` background, 14px bold

### 5. Store screenshots

All screenshots go in:

```
docs/screenshots/
```

Naming convention:

- `before-<feature>.png` — original state
- `after-<feature>.png` — annotated "after" screenshot

### 6. Embed in PR description

Use GitHub raw image URLs pointing to the **commit SHA** (not the branch name):

```markdown
![Before](https://github.com/fcsonline/droneroute/blob/<commit-sha>/docs/screenshots/before-feature.png?raw=true)
![After](https://github.com/fcsonline/droneroute/blob/<commit-sha>/docs/screenshots/after-feature.png?raw=true)
```

## Standard viewport and coordinates

- **Viewport**: 1280x720
- **Map coordinates**: 41.25797725781744, 0.9322907667035154

## Dev server for screenshots

```bash
# Build and start both backend and frontend
npm run build
npm run start &
# Frontend dev server (for hot reload if needed)
npm run dev -w packages/frontend
```

## Checklist for UI PRs

1. [ ] "Before" screenshots captured BEFORE making changes
2. [ ] "After" screenshots captured and annotated
3. [ ] All images stored in `docs/screenshots/`
4. [ ] PR description includes before/after images with commit SHA-based URLs
5. [ ] `npm run build` passes locally before pushing
