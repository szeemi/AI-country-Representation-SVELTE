<script>
	import { DATA, CAT_CFG, ABBREV } from './data.js';

	const BASE_R_DT = 24;
	const BASE_R_MB = 16;

	// ── Responsive state ──
	let mb = $state(window.innerWidth <= 540);
	let chartSvg = $state(null);
	let hoveredIdx = $state(-1);
	let tooltip = $state({
		visible: false, x: 0, y: 0,
		country: '', cat: 'under',
		ratio: 0, actual: 0, expected: 0, companies: 0,
	});

	// ── All layout derived from mb ──
	const layout = $derived.by(() => {
		const BASE_R   = mb ? BASE_R_MB : BASE_R_DT;
		const COLS     = mb ? 6  : 8;
		const SVG_W    = mb ? 380 : 700;
		const PAD_H    = mb ? 8  : 10;
		const LABEL_ABOVE = mb ? 20 : 24;
		const NAME_GAP    = mb ? 13 : 16;
		const NAME_FONT   = mb ? 13 : 15;
		const LINE_GAP    = mb ? 8  : 10;
		const LINE_H      = 6;
		const LINE_SPACE  = mb ? 4  : 5;
		const CAT_LABEL_GAP = 5;
		const CAT_FONT_H  = mb ? 10 : 12;
		const ROW_GAP     = mb ? 16 : 20;
		const CAT_FONT    = mb ? 10 : 12;

		const COL_W = (SVG_W - PAD_H * 2) / COLS;
		const ROWS  = Math.ceil(DATA.length / COLS);

		function rvFn(ratio) { return BASE_R * Math.sqrt(Math.max(ratio, 0)); }
		function ratioSzFn(bigR) {
			if (mb) return bigR > 44 ? 26 : bigR > 28 ? 18 : bigR > 18 ? 14 : 11;
			return bigR > 65 ? 26 : bigR > 42 ? 19 : bigR > 28 ? 15 : 12;
		}

		// Row geometry
		const rows = [];
		let y = 10;
		for (let r = 0; r < ROWS; r++) {
			let maxR = BASE_R;
			for (let c = 0; c < COLS; c++) {
				const i = r * COLS + c;
				if (i < DATA.length) maxR = Math.max(maxR, rvFn(DATA[i].ratio));
			}
			const bottomLine = y + LABEL_ABOVE + maxR * 2;
			const nameY      = bottomLine + NAME_GAP + NAME_FONT;
			const lineY      = nameY + LINE_GAP;
			rows.push({ bottomLine, nameY, lineY });
			y = lineY + LINE_H + CAT_LABEL_GAP + CAT_FONT_H + ROW_GAP;
		}

		const last  = rows[rows.length - 1];
		const totalH = last.lineY + LINE_H + CAT_LABEL_GAP + CAT_FONT_H + 10;

		// Bubble data
		const bubbles = DATA.map((d, idx) => {
			const ri   = Math.floor(idx / COLS);
			const ci   = idx % COLS;
			const info = rows[ri];
			const cx   = PAD_H + ci * COL_W + COL_W / 2;
			const rvv  = rvFn(d.ratio);
			const rb   = BASE_R;
			const cyVal  = info.bottomLine - rvv;
			const cyBas  = info.bottomLine - rb;
			const over1  = d.ratio >= 1.0;
			const bigR   = Math.max(rvv, rb);
			const bigCY  = over1 ? cyVal : cyBas;
			const bigTop = bigCY - bigR;
			const hitTop = Math.min(cyVal - rvv, cyBas - rb);
			const hitBot = Math.max(cyVal + rvv, cyBas + rb);
			return {
				d, idx, cx, cyVal, cyBas, rvv, rb,
				over1, bigR, bigCY, bigTop, hitTop, hitBot,
				vSz:     ratioSzFn(bigR),
				nameY:   info.nameY,
				animDur: Math.max(rvv / 70, 0.05) * 1000,
				name:    mb && ABBREV[d.country] ? ABBREV[d.country] : d.country,
			};
		});

		// Category runs
		const catRuns = [];
		rows.forEach((info, ri) => {
			const cells = [];
			for (let ci = 0; ci < COLS; ci++) {
				const i = ri * COLS + ci;
				if (i < DATA.length) cells.push({ ci, cat: DATA[i].cat });
			}
			const runs = [];
			let cur = null;
			cells.forEach(cell => {
				if (!cur || cell.cat !== cur.cat) { cur = { cat: cell.cat, cells: [cell] }; runs.push(cur); }
				else cur.cells.push(cell);
			});
			runs.forEach((run, ri2) => {
				const cfg       = CAT_CFG[run.cat];
				const first     = run.cells[0];
				const lastC     = run.cells[run.cells.length - 1];
				const leftInset  = ri2 > 0 ? LINE_SPACE / 2 : 0;
				const rightInset = ri2 < runs.length - 1 ? LINE_SPACE / 2 : 0;
				const lx        = PAD_H + first.ci * COL_W + leftInset;
				const lw        = (lastC.ci - first.ci + 1) * COL_W - leftInset - rightInset;
				const labelText = cfg.label.toUpperCase();
				catRuns.push({
					key: `${ri}-${ri2}`,
					cfg, lx, lw, midX: lx + lw / 2,
					lineY: info.lineY, LINE_H, labelText, CAT_FONT, CAT_LABEL_GAP,
					showLabel: labelText.length * CAT_FONT * 0.82 < lw - 6,
				});
			});
		});

		return { bubbles, catRuns, totalH, SVG_W, NAME_FONT, legendFs: mb ? 24 : 15 };
	});

	// ── Grow transition (linear, same px/s for all bubbles) ──
	function growIn(node, { duration }) {
		return {
			duration,
			easing: t => t,
			css: t => `transform-box: fill-box; transform-origin: center; transform: scale(${t})`,
		};
	}

	// ── Tooltip ──
	function showTip(b) {
		if (!chartSvg) return;
		const rect   = chartSvg.getBoundingClientRect();
		const scale  = rect.width / layout.SVG_W;
		const sx     = rect.left + b.cx * scale;
		const stopY  = rect.top  + b.hitTop * scale;
		const sbotY  = rect.top  + b.hitBot * scale;
		const tw = 230, th = 190, mg = 10;
		let x = sx - tw / 2;
		let y = stopY - th - mg;
		if (x < 8) x = 8;
		if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
		if (y < 8) y = sbotY + mg;
		tooltip = {
			visible: true, x, y,
			country: b.d.country, cat: b.d.cat,
			ratio: b.d.ratio, actual: b.d.actual,
			expected: b.d.expected, companies: b.d.companies,
		};
	}

	function hideTip() { tooltip = { ...tooltip, visible: false }; }

	let touchTimer;
	function handleTouch(e, b) {
		e.stopPropagation();
		clearTimeout(touchTimer);
		hoveredIdx = b.idx;
		showTip(b);
		touchTimer = setTimeout(() => { hoveredIdx = -1; hideTip(); }, 3000);
	}

	// ── Helpers ──
	function fmtRatio(r) { return (r < 0.1 ? r.toFixed(2) : r.toFixed(1)) + '×'; }
	function fmt(n) { return Math.round(n).toLocaleString(); }

	// ── Lifecycle ──
	$effect(() => {
		let timer;
		const onResize = () => {
			clearTimeout(timer);
			timer = setTimeout(() => { mb = window.innerWidth <= 540; }, 120);
		};
		const onTouch = e => {
			if (tooltip.visible && !e.target.closest('[data-bubble]')) {
				hoveredIdx = -1;
				hideTip();
			}
		};
		window.addEventListener('resize', onResize);
		document.addEventListener('touchstart', onTouch, { passive: true });
		return () => {
			window.removeEventListener('resize', onResize);
			document.removeEventListener('touchstart', onTouch);
		};
	});
</script>

<!-- HEADER -->
<div class="header">
	<div>
		<div class="eyebrow">EU AI Ecosystem · 2025 · Geographic Analysis</div>
		<h1>Countries<br />Over &amp; Under<br />Represented<span class="trail">_</span></h1>
		<p class="subtitle">Actual vs GDP-Weighted Expected Funding</p>
	</div>
	<div class="yblock"></div>
</div>

<!-- LEGEND -->
<div class="legend">
	<svg id="legend-svg" width="700" height="104" viewBox="0 0 700 104" style="display:block;width:100%;overflow:visible">
		<circle cx="50" cy="56" r="44" fill="#fdf151" stroke="#222222" stroke-width="0.25" />
		<circle cx="50" cy="74" r="26" fill="#333333" stroke="none" />
		<line x1="50" y1="12" x2="114" y2="12" stroke="#333333" stroke-width="1" />
		<line x1="50" y1="48" x2="114" y2="48" stroke="#333333" stroke-width="1" />
		<text x="118" y="12" font-family="PT Sans, sans-serif" font-size={layout.legendFs} fill="#555" dominant-baseline="middle">actual funding</text>
		<text x="118" y="48" font-family="PT Sans, sans-serif" font-size={layout.legendFs} fill="#555" dominant-baseline="middle">expected funding</text>
	</svg>
</div>

<!-- CHART -->
<div class="chart-wrap">
	<svg
		bind:this={chartSvg}
		id="chart-svg"
		viewBox="0 0 {layout.SVG_W} {layout.totalH}"
		height={layout.totalH}
	>
		<defs>
			<filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
				<feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#000" flood-opacity="0.07"/>
			</filter>
		</defs>

		{#each layout.bubbles as b (b.idx)}
			<g
				style="cursor:pointer"
				data-bubble="true"
				onmouseenter={() => { hoveredIdx = b.idx; showTip(b); }}
				onmouseleave={() => { hoveredIdx = -1; hideTip(); }}
				ontouchstart={e => handleTouch(e, b)}
				ontouchend={e => e.stopPropagation()}
			>
				<!-- Hit area -->
				<rect
					x={b.cx - b.bigR - 2} y={b.hitTop - 2}
					width={b.bigR * 2 + 4} height={b.hitBot - b.hitTop + 4}
					fill="transparent"
				/>

				{#if b.over1}
					<circle
						in:growIn={{ duration: b.animDur }}
						cx={b.cx} cy={b.cyVal} r={b.rvv}
						fill="#fdf151" stroke="#222222" stroke-width="0.25" filter="url(#sh)"
					/>
					<circle
						cx={b.cx} cy={b.cyBas} r={b.rb}
						fill="#333333" fill-opacity="0.10" stroke="none" pointer-events="none"
					/>
				{:else}
					<circle
						cx={b.cx} cy={b.cyBas} r={b.rb}
						fill="#333333" stroke="#333333" stroke-width="0.25" pointer-events="none"
					/>
					<circle
						in:growIn={{ duration: b.animDur }}
						cx={b.cx} cy={b.cyVal} r={b.rvv}
						fill="#fdf151" stroke="#333333" stroke-width="0.25"
					/>
				{/if}

				<!-- Hover ring -->
				<circle
					cx={b.cx} cy={b.bigCY} r={b.bigR + 4}
					fill="none" stroke="#999" stroke-width="1"
					opacity={hoveredIdx === b.idx ? 1 : 0}
					pointer-events="none"
				/>

				<!-- Ratio label -->
				<text
					x={b.cx} y={b.bigTop - 7}
					text-anchor="middle" font-size={b.vSz}
					font-family="PT Sans, sans-serif" font-weight="700"
					fill="#222" pointer-events="none"
				>{fmtRatio(b.d.ratio)}</text>

				<!-- Country name -->
				<text
					x={b.cx} y={b.nameY}
					text-anchor="middle" font-size={layout.NAME_FONT}
					font-family="PT Sans, sans-serif" fill="#333"
					pointer-events="none"
				>{b.name}</text>
			</g>
		{/each}

		<!-- Category lines -->
		{#each layout.catRuns as run (run.key)}
			<rect x={run.lx} y={run.lineY} width={run.lw} height={run.LINE_H} fill={run.cfg.fill} />
			{#if run.showLabel}
				<text
					x={run.midX} y={run.lineY + run.LINE_H + run.CAT_LABEL_GAP}
					text-anchor="middle" dominant-baseline="hanging"
					font-size={run.CAT_FONT} font-family="Chaney, sans-serif"
					fill="#333333" pointer-events="none"
				>{run.labelText}</text>
			{/if}
		{/each}
	</svg>
</div>

<!-- TOOLTIP -->
{#if tooltip.visible}
	{@const cfg = CAT_CFG[tooltip.cat]}
	<div id="tooltip" style="left:{tooltip.x}px; top:{tooltip.y}px">
		<div class="tt-country">{tooltip.country}</div>
		<div class="tt-cat-bar" style="background:{cfg.fill}; color:{cfg.text}">{cfg.label}</div>
		<div class="tt-divider"></div>
		<div class="tt-ratio-wrap">
			<div class="tt-ratio-bar" style="background:{cfg.fill}">
				<div class="tt-ratio-lbl" style="color:{cfg.text}">Ratio</div>
				<div class="tt-ratio-val" style="color:{cfg.text}">{fmtRatio(tooltip.ratio)}</div>
			</div>
		</div>
		<div class="tt-funding-row">
			<div class="tt-funding-cell">
				<div class="lbl">Actual Funding</div>
				<div class="val">${fmt(tooltip.actual)}M</div>
			</div>
			<div class="tt-funding-cell">
				<div class="lbl">Expected Funding</div>
				<div class="val">${fmt(tooltip.expected)}M</div>
			</div>
		</div>
		<div class="tt-co-row">
			<div class="lbl">AI Companies</div>
			<div class="val">{tooltip.companies}</div>
		</div>
	</div>
{/if}

<!-- INFO FOOTER -->
<div class="info-footer">
	<p><strong>Methodology:</strong> GDP Weight (%) = (Population × GDP/capita 2025) ÷ Σ(Population × GDP/capita 2025) across EU27. Expected Funding = GDP Weight % × Total Observed Funding ($34.1B). Ratio = Actual ÷ Expected.</p>
	<p><strong>Thresholds:</strong> Over Represented &gt; 1.3 · In Line 0.7–1.3 · Under Represented &lt; 0.7</p>
	<p><strong>Sources:</strong> GDP/capita — IMF World Economic Outlook Oct 2025 (nominal USD). Population — Eurostat 2023. AI company funding — Open Future Foundation analysis 2025.</p>
	<p style="margin-top:8px; color:#aaa">Hover over any bubble to see country details. Yellow = actual AI funding; grey = GDP-weighted expected baseline.</p>
</div>
