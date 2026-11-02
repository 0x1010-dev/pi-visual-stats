import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { relative, resolve } from "node:path";

interface FooterData {
	getGitBranch(): string | null;
	getExtensionStatuses(): ReadonlyMap<string, string>;
	onBranchChange(callback: () => void): () => void;
}

function formatCwd(cwd: string, home: string | undefined): string {
	if (!home) return cwd;
	const rel = relative(resolve(home), resolve(cwd));
	if (rel !== "" && !rel.startsWith("..") && !rel.startsWith("/")) {
		return `~/${rel}`;
	}
	return rel === "" ? "~" : cwd;
}

/**
 * Footer: path (+branch, +extension statuses) left;
 * `model · effort` right (moved here from the border bar; token/cache/cost
 * stats removed). Like pi's original footer, every part is dimmed via
 * `theme.fg("dim")` per part (a reset inside one part would clear an outer
 * wrapped dim), context used/total lives in the editor's bottom bar.
 */
export function createFooter(
	ctx: ExtensionContext,
	getEffort: () => string | null,
) {
	return (tui: TUI, theme: Theme, footerData: FooterData): { render: (w: number) => string[]; invalidate: () => void; dispose: () => void } => {
		const unsubBranch = footerData.onBranchChange(() => tui.requestRender());

		// `truncateToWidth` appends a trailing SGR reset — strip it before
		// dimming, else the reset clears the dim partway through the part.
		const trunc = (text: string, w: number, ellipsis: string) =>
			truncateToWidth(text, w, ellipsis).replace(/\x1b\[0m$/u, "");

		return {
			invalidate() {},
			dispose() {
				unsubBranch();
			},
			render(width: number): string[] {
				let left = formatCwd(ctx.cwd, process.env.HOME || process.env.USERPROFILE);
				const branch = footerData.getGitBranch();
				if (branch) left += ` (${branch})`;
				const statuses = footerData.getExtensionStatuses();
				if (statuses.size > 0) {
					left += "  " + Array.from(statuses.values()).join("  ");
				}

				const model = ctx.model?.id ?? "";
				const effort = getEffort();
				let right = model && effort ? `${model} · ${effort}` : effort ?? model;

				if (visibleWidth(left) + visibleWidth(right) > width - 2) {
					// Keep the right label intact; truncate the path first.
					const keepLeft = width - visibleWidth(right) - 2;
					if (keepLeft < 1) {
						left = "";
						right = trunc(right, width, "");
					} else if (visibleWidth(left) > keepLeft) {
						left = trunc(left, keepLeft, "…");
					}
				}

				// Dim each part separately — pi's way (resets would break one outer wrapper).
				const spaced =
					left && right
						? " ".repeat(width - visibleWidth(left) - visibleWidth(right))
						: "";
				return [theme.fg("dim", left) + spaced + theme.fg("dim", right)];
			},
		};
	};
}
