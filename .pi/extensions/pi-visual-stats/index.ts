import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { createEditorFactory } from "./src/editor.js";
import { createFooter } from "./src/footer.js";

/**
 * pi-visual-stats
 *
 * - Bottom border of the prompt box = context progress bar:
 *   ────┸────── 60k/128k
 *   (fill = context used in `success` green; idle line in the editor's
 *   live border color = top separator; ┸ = auto-compaction threshold in
 *   the line's own color; then ` used/total` dimmed)
 * - Hidden lines below the editor fall back to Pi's original
 *   border (solid, centered "↓ N more", border color).
 * - Footer: cwd/branch/statuses left; `model · effort` right; both dimmed
 *   via theme.fg("dim") per part, like pi's original footer.
 */
export default function (pi: ExtensionAPI) {
	let activeCtx: ExtensionContext | undefined;

	const apply = (ctx: ExtensionContext) => {
		activeCtx = ctx;
		ctx.ui.setEditorComponent(createEditorFactory({ pi, ctx }));
		ctx.ui.setFooter(
			createFooter(ctx, () => {
				const level = pi.getThinkingLevel();
				return level && level !== "off" ? level : null;
			}),
		);
	};

	const restore = (ctx: ExtensionContext) => {
		ctx.ui.setEditorComponent(undefined);
		ctx.ui.setFooter(undefined);
	};

	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		apply(ctx);
	});

	pi.registerCommand("vstat", {
		description: "Toggle the visual stats bar (off/on)",
		handler: async (_args, ctx) => {
			const on = ctx.ui.getEditorComponent() === undefined;
			if (on) apply(ctx);
			else restore(ctx);
			ctx.ui.notify(`pi-visual-stats ${on ? "on" : "off"}`, "info");
		},
	});
}
