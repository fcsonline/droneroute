## Summary

Fix numeric input fields in template config panel snapping back to default values while the user is still typing.

## Changes

- Created a reusable `NumericInput` component that validates only on blur instead of every keystroke
- Replaced all inline numeric inputs in `TemplateConfigPanel` (orbit, grid, facade, pencil) with the new component
- Users can now freely clear and retype values without the field resetting mid-edit
