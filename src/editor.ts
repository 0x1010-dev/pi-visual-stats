import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import type { EditorTheme, TUI } from "@earendil-works/pi-tui";

import { buildBottomBar, type BarState, type BarTheme } from "./status-bar.js";

interface BarContext {
	pi: ExtensionAPI;
	ctx: ExtensionContext;
}

function resolveThresholdFraction(pi: ExtensionAPI, ctx: ExtensionContext): number | null {
	const model = ctx.model;
	const window = model?.contextWindow ?? 0;
	if (!model || window <= 0) return null;
	try {
		const compaction = pi.getSettings().compaction;
		const key = `${model.provider}/${model.id}`;
		const reserve =
			compaction?.modelOverrides?.[key]?.reserveTokens ??
			compaction?.reserveTokens ??
			20000;
		const frac = 1 - reserve / window;
		return Number.isFinite(frac) ? Math.min(1, Math.max(0, frac)) : null;
	} catch {
		return null;
	}
}

function readState(pi: ExtensionAPI, ctx: ExtensionContext): BarState {
	const usage = ctx.getContextUsage();
	return {
		usedTokens: usage?.tokens ?? null,
		contextWindow: usage?.contextWindow ?? ctx.model?.contextWindow ?? 0,
		thresholdFraction: resolveThresholdFraction(pi, ctx),
	};
}

/** Editor whose bottom border is the context progress bar. */
export class ProgressEditor extends CustomEditor {
	private getBarState: () => BarState;
	private getBarTheme: () => BarTheme;

	constructor(
		tui: TUI,
		theme: EditorTheme,
		keybindings: KeybindingsManager,
		options: { paddingX?: number },
		getBarState: () => BarState,
		getBarTheme: () => BarTheme,
	) {
		super(tui, theme, keybindings, options);
		this.getBarState = getBarState;
		this.getBarTheme = getBarTheme;
	}

	override renderBottomBorder(width: number, hiddenLineCount: number): string {
		if (hiddenLineCount > 0) {
			// Scroll status: exactly Pi's original — solid border with a
			// centered " ↓ N more " in the border color.
			return super.renderBottomBorder(width, hiddenLineCount);
		}
		const line = buildBottomBar(
			width,
			this.getBarTheme(),
			// Live editor border color (thinking-level / bash-mode aware) —
			// the same function pi paints the top separator with.
			this.borderColor ?? ((t: string) => t),
			this.getBarState(),
		);
		if (line !== null) return line;
		return super.renderBottomBorder(width, 0);
	}
}

export function createEditorFactory({ pi, ctx }: BarContext) {
	return (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) =>
		new ProgressEditor(
			tui,
			theme,
			keybindings,
			{ paddingX: 0 },
			() => readState(pi, ctx),
			() => ctx.ui.theme,
		);
}
