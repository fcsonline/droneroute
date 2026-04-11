# Agent conventions

Rules for AI agents working on this codebase.

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
