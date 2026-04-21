---
name: accessibility
description: WCAG 2.1 AA accessibility patterns for droneroute — color contrast, ARIA, keyboard navigation, Leaflet map a11y, and Radix UI component checklist.
---

## What I do

Guide writing accessible UI components and fixing accessibility violations in the droneroute codebase. This skill covers WCAG 2.1 AA compliance patterns specific to the Leaflet map interface, Radix UI primitives, and Tailwind CSS v4.

## When to use me

- Adding new interactive components or pages
- Fixing accessibility violations
- Reviewing color contrast for new color tokens
- Adding form controls, modals, or custom interactive elements
- Auditing keyboard navigation
- Making the Leaflet map more accessible

## Target standard

**WCAG 2.1 AA** — the mid-tier accessibility standard. Key requirements:

| Criterion                    | Requirement                                        |
| ---------------------------- | -------------------------------------------------- |
| 1.4.3 Contrast (Minimum)     | Text: 4.5:1, Large text (18px+ bold or 24px+): 3:1 |
| 1.4.11 Non-text Contrast     | UI components and graphical objects: 3:1           |
| 2.1.1 Keyboard               | All functionality available via keyboard           |
| 2.4.1 Bypass Blocks          | Skip navigation link to bypass repeated content    |
| 2.4.7 Focus Visible          | Keyboard focus indicator is visible                |
| 1.3.1 Info and Relationships | Semantic HTML structure                            |

## Leaflet map accessibility

The map (`react-leaflet`) is the primary UI element. Maps are inherently challenging for accessibility.

### Keyboard navigation

- Leaflet supports keyboard navigation natively: arrow keys to pan, `+`/`-` to zoom
- Ensure the map container is focusable (`tabIndex={0}`)
- Markers should be keyboard-accessible — Leaflet markers are focusable by default

### Screen reader support

- Add `aria-label` to the map container describing its purpose:
  ```tsx
  <MapContainer aria-label="Mission planning map">
  ```
- Waypoint markers should have descriptive tooltips that double as `aria-label`:
  ```tsx
  <Marker position={pos} title={`Waypoint ${index + 1}: ${lat.toFixed(5)}, ${lng.toFixed(5)}`}>
  ```
- Provide a text summary of mission data outside the map for screen reader users (waypoint count, total distance, etc.)

### Color considerations

- Mission path colors must have sufficient contrast against both map tiles and each other
- Do not rely solely on color to convey information (e.g., waypoint status) — add icons or text labels

## Radix UI component patterns

This app uses `@radix-ui/react-*` components. Most handle accessibility automatically, but some need attention.

### Dialog

Radix Dialog handles focus trapping and `aria-*` attributes automatically. Ensure:

- Dialog has a descriptive title via `DialogTitle`
- Close button has `aria-label="Close"` if icon-only

### Select

```tsx
<Select>
  <SelectTrigger aria-label="Select mission type">
    <SelectValue placeholder="Choose type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="orbit">Orbit</SelectItem>
  </SelectContent>
</Select>
```

### Tooltip

Always add tooltips to icon-only buttons:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Delete waypoint">
      <Trash2 className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Delete waypoint</TooltipContent>
</Tooltip>
```

### Slider

Radix Slider needs an accessible label:

```tsx
<div>
  <Label htmlFor="altitude">Altitude (m)</Label>
  <Slider id="altitude" aria-label="Altitude in meters" value={[altitude]} />
</div>
```

## ARIA patterns

### Icon-only buttons

Every button with only an icon and no visible text MUST have `aria-label`:

```tsx
<Button variant="ghost" size="icon" aria-label="Close panel">
  <X className="h-4 w-4" />
</Button>
```

### Form inputs

Every input must have an associated label:

```tsx
// Option 1: visible label
<Label htmlFor="speed">Speed (m/s)</Label>
<Input id="speed" type="number" />

// Option 2: aria-label (when no visible label)
<Input aria-label="Search waypoints" placeholder="Search..." />
```

### Status indicators

Don't rely on color alone. Use both color and text/icons:

```tsx
// BAD — color only
<div className={mission.synced ? "text-green-500" : "text-red-500"}>●</div>

// GOOD — color + text
<div className={mission.synced ? "text-green-500" : "text-red-500"}>
  {mission.synced ? "Synced" : "Not synced"}
</div>
```

## Keyboard navigation

### Focus indicators

- All interactive elements must have visible focus indicators
- Radix UI components include focus styles by default
- Custom interactive elements need explicit `focus-visible` styles:
  ```css
  .custom-button:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  ```

### Tab order

- Never use positive `tabIndex` values (disrupts natural order)
- `tabIndex={0}` is fine for making non-interactive elements focusable when adding `role` and keyboard handlers
- **Prefer semantic HTML** (`<button>`, `<a>`) over `role="button"` on divs/spans

### Sidebar and panel navigation

- Panels should be navigable via Tab key
- Collapsible sections should use `aria-expanded`
- The mission list should support arrow key navigation

## New component checklist

When adding a new interactive component:

1. [ ] Icon-only buttons have `aria-label`
2. [ ] Form inputs have associated `<label>` (or `aria-label` / `aria-labelledby`)
3. [ ] Color contrast meets 4.5:1 for normal text, 3:1 for large text
4. [ ] Component is keyboard-operable (Tab to focus, Enter/Space to activate)
5. [ ] Focus indicator is visible
6. [ ] Custom interactive elements use semantic HTML (`<button>`, `<a>`) — avoid `role="button"` on divs
7. [ ] Images have `alt` text (decorative images use `alt=""`)
8. [ ] Don't rely on color alone to convey information
9. [ ] Tooltips provided for icon-only controls
10. [ ] Run `npm run lint` — oxlint includes jsx-a11y rules

## Future: automated a11y testing

Consider adding `@axe-core/playwright` to the project for automated WCAG scanning:

```typescript
import AxeBuilder from "@axe-core/playwright";

const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  .analyze();

expect(results.violations).toEqual([]);
```

This would catch violations automatically in CI. Track this via a GitHub Issue when ready to implement.
