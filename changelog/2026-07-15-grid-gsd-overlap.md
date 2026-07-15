# Grid survey: overlap %/GSD calculator + along-track photo spacing

The Grid template previously only placed photos at the two endpoints of
each flight line — never in between — so a long pass produced no usable
overlap along its own length, unlike the Solar template which already had
a proper "photo spacing" field for this.

## What changed

- **Along-track photo placement fixed**: `generateGrid` now places photos
  every `photoSpacingM` along each pass, mirroring how the Solar template
  already worked. A new "Photo spacing" field controls this distance.
  Missions/presets saved before this field existed fall back to the
  existing row spacing, which still places interior photos — a strict
  improvement over the old endpoints-only behavior, no migration needed.
- **Overlap %/GSD calculator**: the Grid config panel now has "Front
  overlap (%)" and "Side overlap (%)" inputs (75%/65% defaults, typical
  photogrammetry values). Given the mission's selected camera and current
  altitude, it recommends the exact row spacing and photo spacing needed
  to hit those overlap percentages, plus the resulting ground sample
  distance (GSD, cm/pixel) when the camera's photo resolution is known,
  with a one-click "Use" button — the same UX pattern the Solar template
  already used for its fixed 20% overlap recommendation.

## Implementation notes

- Added photo resolution (`imageHeightPx`) to most `WIDE_CAMERA_FOV`
  entries in `solarCamera.ts`, sourced from DJI's published spec sheets.
  Omitted for H30/H30T, whose exact resolution isn't confidently known —
  GSD helpers return `null` there rather than guessing, and the panel
  falls back to "resolution unknown" messaging while still showing the
  FOV-based spacing recommendation.
- `WIDE_CAMERA_FOV` only ever stored vertical FOV (all Orbit-framing
  needed). GSD/overlap math also needs horizontal FOV, so a new
  `deriveHfovFromVfov` helper derives it from VFOV using the same 4:3
  sensor aspect ratio these VFOV values were themselves derived from.
