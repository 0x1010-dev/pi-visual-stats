# pi-visual-stats

Pi extension: turns the prompt box's bottom border into a live context progress bar, and cleans up the footer below it.

## What it looks like

```
┌────────────────────────────────────────────────────────────────┐
│ type your prompt...
├───────────·──────────────────────────────── 42k/200k ┤
  ~/Code/path (branch)                        gpt-5.1 · high
```

- **Bottom border** of the prompt box: a quiet solid `─` line from column 0
  - `─` filled (`success` green) = context used, `─` in the editor's live border color = headroom (the same live color pi paints the top separator with: thinking-level aware, e.g. violet at `high`, bash-mode green in bash mode)
  - `·` (inline middle dot) marks the auto-compaction threshold (window − compaction reserveTokens), in the line's own color
  - line ends in ` used/total` dimmed (unknown usage: `?/total`)
- **Bottom status**: lines hidden below the editor render Pi's native border instead of the bar — solid line, centered ` ↓ N more `, all in the border color
- **Footer**: cwd + git branch (+ extension statuses) left; `model · effort` right. Both parts dimmed via `theme.fg("dim")` per part, exactly like pi's original footer (token/cache/cost stats removed; context usage lives in the border bar)

## Installing

The repo is a [pi package](https://pi.dev/packages):

```bash
pi install git:github.com/0x1010-dev/pi-visual-stats   # or npm:0x1010-dev/pi-visual-stats
pi install ./pi-visual-stats                       # local path
```

No runtime dependencies: pi's own packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`) are declared as `*` peerDependencies and supplied by the host.

## Layout

```
package.json                   # pi manifest (pi.extensions), peerDependencies, scripts
bunfig.toml                    # autoInstallPeers = false — pi packages come from the host
src/
  index.ts                     # extension entry: session_start wiring + /vstat toggle
  status-bar.ts                # pure bar renderer (unit tested)
  editor.ts                    # CustomEditor subclass overriding the bottom border
  footer.ts                    # custom footer component factory
test/status-bar.test.ts
scripts/dev-link.sh            # re-link node_modules/@earendil-works/* for local tsc
.pi/extensions/pi-visual-stats -> .   # dev-only symlink so pi loads it in-tree
```

## Dev

```bash
git clone … && cd pi-visual-stats
bun install
bun run dev:link     # symlink local pi packages (re-run after a pi upgrade)

bun test             # bar rendering tests
bun run typecheck    # tsc --noEmit
```

`node_modules/@earendil-works/*` must be symlinks to the installed pi packages: pi aliases these imports at load time, and a physical copy would break its extension module mapping — `bunfig.toml` keeps bun from auto-installing the peers.

## Disable

`/vstat` toggles the whole extension on/off per session.
