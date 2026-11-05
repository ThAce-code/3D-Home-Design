# Flight Mode: Descent On Shift (Design)

**Goal:** In flight mode, change the descent keybind from `Ctrl` to `Shift`.

**Context:** Current implementation in `src/components/canvas/cameras/FPSControls.tsx` uses:
- `Shift` = sprint speed multiplier
- `Space` = fly up
- `Ctrl` = fly down

## Options Considered

### Option A (Chosen): Contextual remap in flight mode
- Ground: keep `Shift` as sprint (no behavior change)
- Flight: `Space` up, `Shift` down
- Flight sprint: move to `Ctrl` (hold to apply the sprint multiplier)

**Why:** Matches the request while avoiding a global conflict between `Shift`-sprint and `Shift`-descend.

### Option B: Global remap
- Make `Shift` = descend everywhere and move sprint to another key

**Why not:** Changes established ground movement muscle memory and conflicts with existing docs (`Shift` sprint).

### Option C: Split behavior based on movement state
- `Shift` descend only when not pressing WASD; otherwise sprint

**Why not:** Complex, surprising, and easy to mis-trigger.

## Acceptance Criteria

- While flying: holding `Shift` moves the camera downward.
- While flying: holding `Space` moves the camera upward.
- While flying: holding `Ctrl` increases flight movement speed.
- While not flying: `Shift` still acts as sprint.
- Any docs/help text that previously stated `Space/Ctrl` for up/down is updated to `Space/Shift`.
