<script>
	import { DATA, CAT_CFG, ABBREV } from './data.js';

	const BASE_R_DT = 24;
	const BASE_R_MB = 16;

	// ── Responsive state ──
	let mb = $state(window.innerWidth <= 540);
	let chartSvg  = $state(null);
	let chartWrap = $state(null);
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
		const bubblesRaw = DATA.map((d, idx) => {
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
				animDur: 0, // overridden below
				name:    mb && ABBREV[d.country] ? ABBREV[d.country] : d.country,
			};
		});

		// All chart delays relative to scroll trigger (t=0)
		const DARK_BASE_DUR = 250;   // dark circles fade in first
		const YELLOW_DELAY  = 250;   // yellow starts after dark
		const BUBBLE_DUR    = 400;
		const CAT_BAR_STEP  = 1200;
		const catOrder = { over: 0, inline: 1, under: 2 };

		// Stagger: biggest first, sequential
		const maxRvv = Math.max(...bubblesRaw.map(b => b.rvv));
		const sorted = [...bubblesRaw].sort((a, b) => b.rvv - a.rvv);
		let cumDelay = YELLOW_DELAY;
		const delayMap = new Map();
		sorted.forEach(b => {
			delayMap.set(b.idx, cumDelay);
			cumDelay += Math.round(BUBBLE_DUR * (b.rvv / maxRvv));
		});

		const bubbles = bubblesRaw.map(b => {
			const animDelay = delayMap.get(b.idx);
			const animDur   = Math.round(BUBBLE_DUR * (b.rvv / maxRvv));
			return { ...b, animDelay, animDur, labelDelay: animDelay + animDur, darkBaseDur: DARK_BASE_DUR };
		});

		const lastBubbleEnd = Math.max(...bubbles.map(b => b.animDelay + b.animDur));
		const CAT_START = lastBubbleEnd + 1500;

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
					catDelay: CAT_START + catOrder[run.cat] * CAT_BAR_STEP,
				});
			});
		});

		return { bubbles, catRuns, totalH, SVG_W, NAME_FONT, legendFs: mb ? 24 : 15 };
	});

	// ── Grow animation via Web Animations API ──
	function growAnim(node, { duration, delay }) {
		node.style.transformBox = 'fill-box';
		node.style.transformOrigin = 'center bottom';
		const anim = node.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
			{ duration, delay, easing: 'linear', fill: 'both' }
		);
		return { destroy() { anim.cancel(); } };
	}

	// ── Draw line left→right ──
	function drawLine(node, { delay }) {
		const len = node.getTotalLength ? node.getTotalLength() : 64;
		node.style.strokeDasharray = len;
		node.style.strokeDashoffset = len;
		const anim = node.animate(
			[{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
			{ duration: 400, delay, easing: 'ease-out', fill: 'both' }
		);
		return { destroy() { anim.cancel(); } };
	}

	// ── Grow bar left→right ──
	function growBar(node, { delay }) {
		node.style.transformBox = 'fill-box';
		node.style.transformOrigin = 'left center';
		node.style.transform = 'scaleX(0)';
		const anim = node.animate(
			[{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
			{ duration: 400, delay, easing: 'ease-out', fill: 'both' }
		);
		return { destroy() { anim.cancel(); } };
	}

	// ── Fade in ──
	function fadeIn(node, { delay, duration = 300 }) {
		node.style.opacity = 0;
		const anim = node.animate(
			[{ opacity: 0 }, { opacity: 1 }],
			{ duration, delay, easing: 'ease', fill: 'both' }
		);
		return { destroy() { anim.cancel(); } };
	}

	const LEGEND_PRE_PAUSE        = 2000;             // pause before legend starts
	const LEGEND_DARK_LINE_DELAY  = LEGEND_PRE_PAUSE;
	const LEGEND_DARK_LINE_DUR    = 800;
	const LEGEND_DELAY            = LEGEND_DARK_LINE_DELAY + LEGEND_DARK_LINE_DUR;
	const LEGEND_DUR              = 1200;
	const LEGEND_LABEL_DELAY      = LEGEND_DELAY + LEGEND_DUR;
	const LEGEND_POST_PAUSE       = 1000;
	const LEGEND_DONE_AT          = LEGEND_LABEL_DELAY + 300; // when legend fully finishes

	// ── Animation keys ──
	let animKey      = $state(0); // legend
	let chartAnimKey = $state(0); // chart (scroll-triggered)

	// R key replays both
	$effect(() => {
		function onKey(e) {
			if (e.key === 'r' || e.key === 'R') { animKey++; chartAnimKey++; }
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// Fire chart only when user scrolls it into view.
	// Observer starts only AFTER legend is done to avoid firing on page load.
	let showArrow = $state(false);

	$effect(() => {
		if (!chartWrap) return;
		let observer;
		// Show arrow after legend, then start watching for scroll
		const arrowTimer = setTimeout(() => {
			showArrow = true;
			observer = new IntersectionObserver(entries => {
				if (entries[0].isIntersecting) {
					showArrow = false;
					chartAnimKey++;
					observer.disconnect();
				}
			}, { threshold: 0, rootMargin: '0px 0px -180px 0px' });
			observer.observe(chartWrap);
		}, LEGEND_DONE_AT + 300);

		return () => {
			clearTimeout(arrowTimer);
			if (observer) observer.disconnect();
		};
	});

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
		<h1>AI Funding<br />in the EU<span class="trail">_</span></h1>
	</div>
	<div class="yblock"></div>
</div>

<!-- LEGEND -->
<div class="legend">
	<svg id="legend-svg" width="700" height="104" viewBox="0 0 700 104" style="display:block;width:100%;overflow:visible">
		{#key animKey}
			<!-- Yellow bubble grows first -->
			<circle
				use:growAnim={{ duration: LEGEND_DUR, delay: LEGEND_DELAY }}
				cx="50" cy="56" r="44" fill="#fdf151" stroke="#222222" stroke-width="0.25"
			/>
			<!-- Line draws from circle top → text, after bubble finishes -->
			<line
				use:drawLine={{ delay: LEGEND_LABEL_DELAY }}
				x1="50" y1="12" x2="114" y2="12" stroke="#333333" stroke-width="1"
			/>
			<!-- "actual funding" fades in with the line -->
			<text
				use:fadeIn={{ delay: LEGEND_LABEL_DELAY }}
				x="118" y="12" font-family="PT Sans, sans-serif" font-size={layout.legendFs} fill="#555" dominant-baseline="middle"
			>actual funding</text>
		{/key}
		<!-- Dark bubble always visible; line + text animate in first -->
		<circle cx="50" cy="74" r="26" fill="#333333" stroke="none" />
		{#key animKey}
			<line
				use:drawLine={{ delay: LEGEND_DARK_LINE_DELAY }}
				x1="50" y1="48" x2="114" y2="48" stroke="#333333" stroke-width="1"
			/>
			<text
				use:fadeIn={{ delay: LEGEND_DARK_LINE_DELAY }}
				x="118" y="48" font-family="PT Sans, sans-serif" font-size={layout.legendFs} fill="#555" dominant-baseline="middle"
			>expected funding (GDP-Weighted)</text>
		{/key}
	</svg>
</div>

<!-- SCROLL ARROW -->
{#if showArrow}
	<div class="scroll-arrow">↓</div>
{/if}

<!-- CHART -->
<div class="chart-wrap" bind:this={chartWrap}>
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

		{#if chartAnimKey > 0}
		{#key chartAnimKey}
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
					<!-- Solid dark base — fades in first -->
					<circle
						use:fadeIn={{ delay: 0, duration: b.darkBaseDur }}
						cx={b.cx} cy={b.cyBas} r={b.rb}
						fill="#333333" stroke="none" pointer-events="none"
					/>
					<!-- Yellow grows on top -->
					<circle
						use:growAnim={{ duration: b.animDur, delay: b.animDelay }}
						cx={b.cx} cy={b.cyVal} r={b.rvv}
						fill="#fdf151" stroke="#222222" stroke-width="0.25" filter="url(#sh)"
					/>
					<!-- Semi-transparent dark overlay fades in only after yellow is done -->
					<circle
						use:fadeIn={{ delay: b.animDelay + b.animDur }}
						cx={b.cx} cy={b.cyBas} r={b.rb}
						fill="#333333" fill-opacity="0.30" stroke="none" pointer-events="none"
					/>
				{:else}
					<circle
						use:fadeIn={{ delay: 0, duration: b.darkBaseDur }}
						cx={b.cx} cy={b.cyBas} r={b.rb}
						fill="#333333" stroke="#333333" stroke-width="0.25" pointer-events="none"
					/>
					<circle
						use:growAnim={{ duration: b.animDur, delay: b.animDelay }}
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

				<!-- Ratio label — fades in when yellow finishes -->
				<text
					use:fadeIn={{ delay: b.labelDelay }}
					x={b.cx} y={b.bigTop - 7}
					text-anchor="middle" font-size={b.vSz}
					font-family="PT Sans, sans-serif" font-weight="700"
					fill="#222" pointer-events="none"
				>{fmtRatio(b.d.ratio)}</text>

				<!-- Country name — fades in with ratio label -->
				<text
					use:fadeIn={{ delay: b.labelDelay }}
					x={b.cx} y={b.nameY}
					text-anchor="middle" font-size={layout.NAME_FONT}
					font-family="PT Sans, sans-serif" fill="#333"
					pointer-events="none"
				>{b.name}</text>
			</g>
		{/each}

		<!-- Category lines — appear after all bubbles, one group at a time -->
		{#each layout.catRuns as run (run.key)}
			<rect
				use:fadeIn={{ delay: run.catDelay, duration: 800 }}
				x={run.lx} y={run.lineY} width={run.lw} height={run.LINE_H} fill={run.cfg.fill}
			/>
			{#if run.showLabel}
				<text
					use:fadeIn={{ delay: run.catDelay, duration: 800 }}
					x={run.midX} y={run.lineY + run.LINE_H + run.CAT_LABEL_GAP}
					text-anchor="middle" dominant-baseline="hanging"
					font-size={run.CAT_FONT} font-family="Chaney, sans-serif"
					fill="#333333" pointer-events="none"
				>{run.labelText}</text>
			{/if}
		{/each}
		{/key}
		{/if}
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
