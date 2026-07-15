# Templates

Create common flight patterns automatically instead of placing waypoints one by one.

## What you can do

- **Move the template config panel out of the way**: drag anywhere on its title bar (the whole top row — name, waypoint-count badge, and the empty space around them) to reposition it anywhere over the map, instead of having to zoom out to see what's underneath it. The close button still works normally and doesn't start a drag. It stays within the map area and resets to its default position the next time a template panel opens.
- **Orbit**: fly a circular path around a center point. Choose radius, number of waypoints, and direction (clockwise or counter-clockwise). By default it flies a full 360° loop, but you can set a start angle and an end angle below 360° to fly an open arc instead (for example 270°) — the first and last waypoints land exactly on the bearings you asked for.
- **Create an orbit with a single click or tap**: click (or tap) the map once without dragging and a default-radius orbit is placed there immediately, ready to adjust in the config panel — useful on a tablet or touchscreen where a mouse-drag gesture isn't practical. Dragging still works exactly as before for picking the exact radius by hand in one motion.
- **Rotate an orbit by dragging**: once an orbit is placed, drag the handle marker sitting on its first waypoint around the circle to rotate the whole arc — its width stays the same, only where it starts changes. Faster than typing an exact start angle when you just want to visually pick which side of the circle to skip.
- **Center an orbit on an address or coordinates**: type an address or a `lat, lng` pair into the search field at the top of the orbit panel to move the orbit's center there directly, instead of only being able to place it by clicking the map.
- **Nudge the orbit center by dragging**: while the orbit panel is open (before clicking Apply), drag the handle marker on the center point to fine-tune its exact position — handy right after a location search puts you close but not exactly on the spot.
- **POI height and linked framing**: set the real height of the point the camera should look at (e.g. a rooftop) in the orbit panel's POI height field. Radius, flight altitude, POI height, and gimbal pitch stay linked by default — edit any one of them and the others recalculate so the whole object (from the ground up to the POI height) stays framed inside the actual field of view of the mission's selected camera, instead of just recomputing the camera angle. If the selected camera's field of view isn't known, or the requested framing isn't geometrically possible at the given distance, it falls back to recalculating gimbal pitch alone from the radius and POI height. Click the lock icon next to gimbal pitch to freeze all of them apart and edit each independently. Linked fields recalculate live as you type — no need to click elsewhere first.
- **Pre-filled from a building**: place a POI on a drawn [building](buildings.md) and the orbit panel opens automatically with a center, radius, altitude, and gimbal pitch recommended for orbiting that building's footprint and height, framed for the mission's selected camera when its field of view is known — adjust any field before applying, just like a manually placed orbit.
- **Lock the POI separately from the orbit's center**: by default, the camera aims at the flight circle's own center. Check "Uzamknout POI" ("Lock POI") to drop an independent camera target at the current center — a second marker appears for it, fixed in place (not draggable), so it can't be nudged by accident. With it locked, move or resize the flight circle instead (drag the circle's own center handle, which now sits on top of the fixed POI marker when they still overlap right after locking, or change the radius) to fly farther from or closer to the subject without moving what the camera is looking at; gimbal pitch is then recalculated per waypoint since distance to the fixed target varies around the circle.
- **Grid survey**: fly a back-and-forth zigzag pattern over an area. Useful for mapping or photogrammetry.
- **Photo spacing along each row**: a "Photo spacing" field controls how far apart photos are taken _along_ each flight line, not just at its two ends — a long row now gets photographed all the way through, not only at its start and finish.
- **Overlap %/GSD calculator**: set a desired front (along-track) and side (cross-track) overlap percentage — common photogrammetry values are 70-80% front and 60-70% side — and the panel recommends the exact row spacing and photo spacing for the mission's selected camera and altitude, along with the resulting ground sample distance (GSD, in cm/pixel), with a one-click "Use" button to apply them. For cameras whose resolution isn't known, the spacing recommendation still works but GSD isn't shown. For cameras with no known field of view at all, spacing is set manually.
- **Facade scan**: fly a vertical scanning pattern along a building face. Useful for inspections.
- **Pencil path**: draw a freehand path on the map and the app places evenly spaced waypoints along it.
- **Solar panel survey**: trace the outline of a solar panel array (square, rectangle, or any other shape, including L-shaped or otherwise irregular fields) by clicking points on the map, then click near the first point (or double-click) to close the shape. Each edge shows its length on the map as you draw, so you always know how big the traced area actually is. The app generates a lawn-mower flight path clipped exactly to that outline — the drone never flies past the edges you traced.
- **Set the exact row direction by drawing a reference line**: after closing the boundary, click two points along one actual panel row to set the flight-line direction — instead of guessing it from the traced shape's longest edge, which doesn't always match how the panels are really laid out (and can end up running the flight perpendicular to the rows instead of along them). The chosen angle shows in the config panel as "Row angle."
- **Photo spacing along each row**: a "Photo spacing" field controls how far apart photos are taken _along_ each flight line, not just at its two ends — so a long row of panels gets photographed all the way through, not only at its start and finish.
- **Recommended spacing for known DJI thermal cameras**: when the mission's configured camera is a supported DJI thermal payload (H20T, M30T, M3T, M3TD, or Matrice 4T), the panel shows a recommended line spacing and photo spacing computed from that camera's real field of view and the current altitude, with a one-click "Use" button to apply them. For any other camera, spacing is set manually.
- Each waypoint gets a straight-down (nadir) gimbal and a thermal (IR) photo action by default, since this template is built for FVE/PV thermography flights.
- **Photo or video capture**: every template (Orbit, Grid, Facade, Pencil, and Solar) has a "Foto"/"Video" choice in its config panel. Foto takes a photo at every generated waypoint, same as before. Video starts recording at the first waypoint and stops at the last, so the drone flies the whole path — the whole orbit loop, the whole grid, the whole traced line — with the camera rolling instead of stopping for a shot at each point. Useful for a smooth 360° orbit video, or a continuous facade/solar walkthrough.

## How it works

1. Select a template from the toolbar or press its shortcut key (O for orbit, G for grid, F for facade, Z for pencil, S for solar panel survey).
2. Configure the template options in the panel that appears.
3. For Orbit, Grid, and Facade: click-and-drag on the map to place the template. For Solar: click to place each boundary point, click near the first point or double-click to close the shape, then click two more points along a panel row to set the flight direction. For Pencil: click-and-drag to draw a freehand path.
4. The generated waypoints appear in the sidebar and can be edited individually.

## Editing an already-applied template

Realized the orbit's radius was too small only after clicking Apply? You don't have to delete it and start over:

1. Select all the waypoints that came from that template (e.g. Ctrl+A / Cmd+A if they're the only waypoints, or Shift-click to select the range).
2. If the whole selection came from one template application, an **"Edit template"** button appears in the selection toolbar.
3. Click it to reopen that template's settings panel with its original values — adjust radius, spacing, altitude, or any other field, and the preview updates live, just like when you first placed it.
4. Click Apply again to replace the old waypoints with the updated ones (or Cancel to leave them as they were).

This works for Orbit, Grid, Facade, Pencil, and Solar, and survives saving and reloading a mission — reopen a saved mission later and "Edit template" still works on its templates exactly as it did before you saved.

## Reusable template presets

For a template you fly again and again — the same recurring orbit around a fixed site, for example — save its exact settings once and reuse them without redrawing:

1. Configure any template (Orbit, Grid, Facade, Pencil, or Solar) as usual, then click **"Save as preset"** in its config panel before (or instead of) clicking Apply.
2. Give it a name. It's saved to your account under **Template presets** in the sidebar, requires being signed in (same as saving missions).
3. To reuse it later — in this mission or any other — open **Template presets** in the sidebar and click a saved preset (or its folder icon). Its config panel opens pre-filled with every saved value, including its original location/shape, ready to click Apply.
4. Rename a preset by double-clicking its name in the list, or delete it with the **×** button.

Presets are separate from missions — deleting a mission doesn't delete presets you saved from it, and vice versa.

## Good to know

- You can combine templates — for example, use a grid survey and then add an orbit around a specific structure.
- All generated waypoints behave like normal waypoints after placement. You can move, delete, or change their settings.
