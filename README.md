# pi-visual-stats

Pi extension: turns the prompt box's bottom border into a live context progress bar, and cleans up the footer below it.

## What it looks like

```
┌────────────────────────────────────────────────────────────────┐
│ type your prompt...
├───────────┸──────────────────────────────── 42k/200k ┤
  ~/Code/path (branch)                        gpt-5.1 · high
```

- **Bottom border** of the prompt box: a quiet solid `─` line from column 0
  - `─` filled (`success` green) = context used, `─` in the editor's live border color = headroom (the same live color pi paints the top separator with: thinking-level aware, e.g. violet at `high`, bash-mode green in bash mode)
  - `┸` marks the auto-compaction threshold (window − compaction reserveTokens), in the line's own color
  - line ends in ` used/total` dimmed (unknown usage: `?/total`)
- **Bottom status**: lines hidden below the editor render Pi's native border instead of the bar — solid line, centered ` ↓ N more `, all in the border color
- **Footer**: cwd + git branch (+ extension statuses) left; `model · effort` right. Both parts dimmed via `theme.fg("dim")` per part, exactly like pi's original footer (token/cache/cost stats removed; context usage lives in the border bar)

## Layout

```
.pi/extensions/pi-visual-stats/
  index.ts      # extension: session_start wiring + /vstat toggle
  src/status-bar.ts  # pure bar renderer (unit-tested)
  src/editor.ts      # CustomEditor subclass overriding the bottom border
  src/footer.ts      # custom footer component factory
test/status-bar.test.ts
```

## Dev

```bash
bun test        # bar rendering tests
bunx tsc --noEmit
```

`node_modules/@earendil-works/*` are local symlinks to the installed pi packages (for dev tooling; pi itself aliases these imports at load time).

## Disable

`/vstat` toggles the whole extension on/off per session.
