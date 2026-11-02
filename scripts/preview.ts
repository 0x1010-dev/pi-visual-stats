/**
 * Deterministic gallery preview: renders the extension's actual UI
 * (real `buildBottomBar` output, pi's default dark palette) to PNG.
 *
 * Run: bun run scripts/preview.ts   → writes preview.png
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, type Canvas2DWrapper } from "canvas";

import { buildBottomBar, type BarState } from "../src/status-bar.js";

// ── pi default dark-ish palette (approx) ─────────────────────────
const C = {
	bg: "#1c1c1f",
	border: "#6b6b78",
	fg: "#d8d8de",
	success: "#4ec94e",
	thinkingHigh: "#b07ce8", // live editor border color at thinking=high
	dim: "#85858f",
} as const;

interface Span {
	color: string;
	text: string;
}

// Fake theme that records spans (same trick as the unit tests),
// so layout comes from the real renderer.
const spans: Span[] = [];
const theme = {
	fg: (color: string, text: string) => {
		spans.push({ color, text });
		return text;
	},
	style: (t: string) => t,
} as unknown as Parameters<typeof buildBottomBar>[1];

const border = (text: string) => {
	spans.push({ color: "thinkingHigh", text });
	return text;
};

const state: BarState = { usedTokens: 42000, contextWindow: 200000, thresholdFraction: 0.88 };

// ── canvas ───────────────────────────────────────────────────────
const SCALE = 2;
const FONT = "Menlo";
const BASE = 15; // px at 1x
const width = 88; // box inner cols incl. side borders
const inner = width - 2; // content cols the bar spans
const padX = 14;
const padY = 12;
const lineH = 22; // at 1x

// monospace cell width for Menlo at 15px ≈ 0.6*size
const CELL = 9;
const INNER = width * CELL;
const CW = INNER + padX * 2; // canvas 1x width
const LINES = 4;
const CH = padY * 2 + LINES * lineH;

const canvas = createCanvas(CW * SCALE, CH * SCALE);
const ctx = canvas.getContext("2d");
ctx.scale(SCALE, SCALE);

ctx.fillStyle = C.bg;
ctx.fillRect(0, 0, CW, CH);

const x0 = padX;
const y0 = padY;
ctx.font = `${BASE}px ${FONT}, monospace`;
ctx.textBaseline = "top";

const char = (ch: string, x: number, y: number, color: string) => {
	ctx.fillStyle = color;
	ctx.fillText(ch, x0 + x * CELL, y);
};

function row(y: number, draw: (i: number) => void) {
	for (let i = 0; i < width; i++) draw(i);
}

// Row 1: ┌────┐
{
	const y = y0;
	const borderCell = (i: number, c: string) => char(c, i, y, C.border);
	row(y, (i) => {
		if (i === 0) borderCell(i, "┌");
		else if (i === width - 1) borderCell(i, "┐");
		else borderCell(i, "─");
	});
}

// Row 2: │ type your prompt...   │
{
	const y = y0 + lineH;
	const prompt = " type your prompt...";
	row(y, (i) => {
		if (i === 0) char("│", i, y, C.border);
		else if (i === width - 1) char("│", i, y, C.border);
		else {
			const idx = i - 1;
			if (idx < prompt.length) char(prompt[idx], i, y, C.fg);
			else char(" ", i, y, C.fg);
		}
	});
}

// Row 3: ├─ real bar ─┤
{
	const y = y0 + lineH * 2;
	spans.length = 0;
	const bar = buildBottomBar(inner, theme, border, state);
	if (bar === null) throw new Error("bar render failed");
	const flat = spans
		.map((s) => ({ color: s.color, chars: [...s.text] }))
		.flatMap((s) => s.chars.map((c) => ({ c, color: s.color })));
	if (flat.length !== inner) throw new Error(`bar span width ${flat.length} != ${inner}`);
	const hex = (color: string) =>
		C[color as keyof typeof C] ?? C.border;
	row(y, (i) => {
		if (i === 0) char("├", i, y, C.border);
		else if (i === width - 1) char("┤", i, y, C.border);
		else char(flat[i - 1].c, i, y, hex(flat[i - 1].color));
	});
}

// Row 4: footer (no box)
{
	const y = y0 + lineH * 3;
	const left = "  ~/code/personal (main)";
	const right = "gemini-3-pro · high";
	const rStart = width - right.length;
	row(y, (i) => {
		if (i < left.length) char(left[i], i, y, C.dim);
		else if (i >= rStart) char(right[i - rStart], i, y, C.dim);
		else char(" ", i, y, C.bg);
	});
}

// ── out ──────────────────────────────────────────────────────────
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "preview.png");
writeFileSync(out, canvas.toBuffer("image/png"));
console.log(`wrote ${out} (${CW * SCALE}x${CH * SCALE})`);
