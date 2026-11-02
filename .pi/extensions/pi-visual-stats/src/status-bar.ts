import { visibleWidth } from "@earendil-works/pi-tui";

/** Styling surface the bar needs: pi's Theme. */
import type { Theme as BarTheme } from "@earendil-works/pi-coding-agent";
export type { BarTheme };

export interface BarState {
	/** Used context tokens, null when unknown (e.g. just after compaction). */
	usedTokens: number | null;
	contextWindow: number;
	/** Fraction of the window at which auto-compaction triggers, 0..1; null when unknown. */
	thresholdFraction: number | null;
}

const LINE = "─";
/** Compaction threshold marker (box drawing), rendered in the line's own color. */
const MARKER = "\u2538";

export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

/**
 * Render the middle bar segment (solid line):
 *   used = green fill, rest = live border color, ┸ = compaction threshold
 *   (same color as the line itself).
 */
function renderBar(
	theme: BarTheme,
	border: (text: string) => string,
	s: BarState,
	mid: number,
): string {
	if (mid <= 0) return "";
	const usageKnown = s.usedTokens !== null && s.contextWindow > 0;
	const usedFrac = usageKnown ? (s.usedTokens as number) / s.contextWindow : 0;
	const fill = Math.min(mid, Math.round(mid * Math.min(1, Math.max(0, usedFrac))));
	const near = s.thresholdFraction !== null && usedFrac >= s.thresholdFraction;
	const markerPos =
		s.thresholdFraction !== null && s.thresholdFraction > 0 && s.thresholdFraction < 1
			? Math.min(mid - 1, Math.round(mid * s.thresholdFraction))
			: -1;

	const run = (n: number, offset: number): string => {
		if (n <= 0) return "";
		const cFill = Math.min(Math.max(0, fill - offset), n);
		const rest = n - cFill;
		return (
			(cFill > 0 ? theme.fg("success", LINE.repeat(cFill)) : "") +
			(rest > 0 ? border(LINE.repeat(rest)) : "")
		);
	};

	if (markerPos < 0) return run(mid, 0);
	return (
		run(markerPos, 0) +
		border(MARKER) +
		run(mid - markerPos - 1, markerPos + 1)
	);
}

/**
 * Render the bottom bar:
 *   ──────┸──────── 60k/128k
 * (fill = context used in `success` green; idle line in the editor's live
 * border color; ┸ = auto-compaction threshold, in the line's own color;
 * then ` used/total` dimmed. Model + effort live in the footer.)
 * Returns null when unknown or too narrow (caller falls back to the
 * default border).
 */
export function buildBottomBar(
	width: number,
	theme: BarTheme,
	border: (text: string) => string,
	s: BarState,
): string | null {
	const usageKnown = s.usedTokens !== null && s.contextWindow > 0;
	const stats = usageKnown
		? `${formatTokens(s.usedTokens as number)}/${formatTokens(s.contextWindow)}`
		: s.contextWindow > 0
			? `?/${formatTokens(s.contextWindow)}`
			: "";
	if (!stats) return null;

	const rightW = visibleWidth(stats) + 1; // " stats"
	if (rightW + 1 > width) return null;

	const mid = width - rightW;
	return renderBar(theme, border, s, mid) + theme.fg("dim", ` ${stats}`);
}
