import { test } from "node:test";
import * as assert from "node:assert/strict";

import { buildBottomBar, formatTokens, type BarState, type BarTheme } from "../src/status-bar.js";
import { visibleWidth } from "@earendil-works/pi-tui";

interface Spans {
	color: string;
	text: string;
}

function fakeTheme(): BarTheme & { spans: Spans[] } {
	const spans: Spans[] = [];
	const fake = {
		spans,
		fg: (color: string, text: string) => {
			spans.push({ color, text });
			return text;
		},
		style: (text: string) => text,
	};
	return fake as unknown as BarTheme & { spans: Spans[] };
}

function borderFn(t: BarTheme & { spans: Spans[] }): (text: string) => string {
	return (text: string) => {
		t.spans.push({ color: "border", text });
		return text;
	};
}

const base: BarState = {
	usedTokens: 60000,
	contextWindow: 128000,
	thresholdFraction: 0.88,
};

test("formatTokens", () => {
	assert.equal(formatTokens(999), "999");
	assert.equal(formatTokens(4200), "4.2k");
	assert.equal(formatTokens(172000), "172k");
	assert.equal(formatTokens(1500000), "1.5M");
});

test("line + ' stats' at the right end, no glyphs beyond bar chars", () => {
	const t = fakeTheme();
	const line = String(buildBottomBar(100, t, borderFn(t), base) as string);
	assert.ok(visibleWidth(line) === 100);
	assert.ok(line.endsWith(` 60k/128k`), `end: ${JSON.stringify(line.slice(-12))}`);
	assert.ok(!line.endsWith(" "), "no trailing space after stats");
	assert.ok(line.startsWith("─"), `start: ${JSON.stringify(line.slice(0, 8))}`);
	assert.ok(!line.includes("\uE0B0"), "no powerline arrow");
	assert.ok(t.spans.some((s) => s.color === "dim" && s.text === ` 60k/128k`), "stats dimmed, leading space, no trailing space");
	// every span is border (line+marker), success (fill) or dim (stats)
	const colors = new Set(t.spans.map((s) => s.color));
	assert.deepEqual([...colors].sort(), ["border", "dim", "success"]);
});

test("solid line: fill = success, idle = border, no panels", () => {
	const t = fakeTheme();
	const width = 120;
	const stats = "60k/128k";
	const mid = width - stats.length - 1; // " stats"
	const line = String(buildBottomBar(width, t, borderFn(t), base) as string);
	// used 60000/128000 ≈ 0.469
	const fillCount = t.spans.filter((s) => s.color === "success").map((s) => s.text.length).reduce((a, b) => a + b, 0);
	const idleCount = t.spans
		.filter((s) => s.color === "border" && s.text !== "\u00B7")
		.map((s) => s.text.length)
		.reduce((a, b) => a + b, 0);
	assert.ok(Math.abs(fillCount / mid - 0.469) < 0.03, `fill=${fillCount} mid=${mid}`);
	assert.equal(fillCount + idleCount, mid - 1, "only the marker left uncounted");
	assert.ok(line.includes("─"));
	assert.ok(!line.includes("╌"), "no dotted glyph");
	assert.ok(!line.includes("━"), "no heavy glyph");
});

test("marker · at ≈ threshold fraction, in the line's own color", () => {
	const t = fakeTheme();
	const width = 120;
	const line = String(buildBottomBar(width, t, borderFn(t), base) as string);
	const idx = line.indexOf("\u00B7");
	const mid = width - "60k/128k".length - 1;
	assert.ok(Math.abs(idx / mid - 0.88) < 0.01, `idx=${idx} mid=${mid}`);
	assert.ok(t.spans.some((s) => s.color === "border" && s.text === "\u00B7"), "marker in line/border color");
	assert.ok(!t.spans.some((s) => s.color === "warning"), "no warning tint anywhere");
});

test("past-threshold: fill still success, line still border color, marker unchanged", () => {
	const t = fakeTheme();
	buildBottomBar(100, t, borderFn(t), { ...base, usedTokens: 118000 });
	assert.ok(t.spans.some((s) => s.color === "success"), "filled segment still success");
	assert.ok(t.spans.some((s) => s.color === "border" && s.text === "\u00B7"), "marker in line color");
	assert.ok(t.spans.some((s) => s.color === "border" && s.text.includes("─")), "idle line uses live border color");
});

test("unknown usage: '?' stats, no fill, marker still shown", () => {
	const t = fakeTheme();
	const line = String(buildBottomBar(100, t, borderFn(t), { ...base, usedTokens: null }) as string);
	assert.ok(line.endsWith(` ?/128k`));
	assert.ok(!t.spans.some((s) => s.color === "success"), "no fill");
	assert.ok(line.includes("\u00B7"), "threshold marker still shown");
});

test("no threshold -> no marker", () => {
	const t = fakeTheme();
	const line = String(buildBottomBar(100, t, borderFn(t), { ...base, thresholdFraction: null }) as string);
	assert.ok(!line.includes("\u00B7"));
});

test("never overflows; null when too narrow or no window", () => {
	const t = fakeTheme();
	for (const width of [80, 40, 20, 14, 11]) {
		const line = buildBottomBar(width, t, borderFn(t), base);
		if (line === null) continue;
		assert.equal(visibleWidth(String(line)), width, `width=${width}`);
	}
	assert.equal(buildBottomBar(9, t, borderFn(t), base), null, "too narrow falls back");
	assert.equal(buildBottomBar(100, t, borderFn(t), { ...base, contextWindow: 0, usedTokens: null }), null, "no window falls back");
});
