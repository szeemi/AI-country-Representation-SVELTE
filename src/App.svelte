<script>
	import { onMount } from 'svelte';
	import { DATA, CAT_CFG, ABBREV } from './data.js';

	// ── DOM refs ──
	let chartSvg;
	let legendSvg;

	// ── Tooltip state ──
	let tooltip = { visible: false, x: 0, y: 0, country: '', cat: 'under', ratio: 0, actual: 0, expected: 0, companies: 0 };

	// ── Per-bubble geometry (for tooltip positioning) ──
	const BUBBLE_GEO = [];

	// ── Helpers ──
	function isMobile() { return window.innerWidth <= 540; }
	function countryName(name, mb) { return mb && ABBREV[name] ? ABBREV[name] : name; }
	function fmtRatio(r) { return (r < 0.1 ? r.toFixed(2) : r.toFixed(1)) + '×'; }
	function fmt(n) { return Math.round(n).toLocaleString(); }
	function approxTextWidth(text, fontSize) { return text.length * fontSize * 0.82; }

	const BASE_R_DT = 24;
	const BASE_R_MB = 16;

	function getConfig() {
		const mb = isMobile();
		return {
			BASE_R: mb ? BASE_R_MB : BASE_R_DT,
			COLS: mb ? 6 : 8,
			SVG_W: mb ? 380 : 700,
			PAD_H: mb ? 8 : 10,
			LABEL_ABOVE: mb ? 20 : 24,
			NAME_GAP: mb ? 13 : 16,
			NAME_FONT: mb ? 13 : 15,
			LINE_GAP: mb ? 8 : 10,
			LINE_H: 6,
			LINE_SPACE: mb ? 4 : 5,
			CAT_LABEL_GAP: 5,
			CAT_FONT_H: mb ? 10 : 12,
			ROW_GAP: mb ? 16 : 20,
			ratioSz: bigR => {
				if (mb) return bigR > 44 ? 26 : bigR > 28 ? 18 : bigR > 18 ? 14 : 11;
				return bigR > 65 ? 26 : bigR > 42 ? 19 : bigR > 28 ? 15 : 12;
			},
			CAT_FONT: mb ? 10 : 12,
		};
	}

	// ── Legend font update ──
	function updateLegendFont() {
		const mb = isMobile();
		const svg = legendSvg;
		if (!svg) return;
		const texts = svg.querySelectorAll('text');
		const lines = svg.querySelectorAll('line');
		const fs = mb ? 24 : 15;
		svg.setAttribute('height', 104);
		svg.setAttribute('viewBox', '0 0 700 104');
		texts[0].setAttribute('font-size', fs);
		texts[1].setAttribute('font-size', fs);
		texts[0].setAttribute('y', '12');
		texts[1].setAttribute('y', '48');
		lines[0].setAttribute('y1', '12'); lines[0].setAttribute('y2', '12'); lines[0].setAttribute('x2', '114');
		lines[1].setAttribute('y1', '48'); lines[1].setAttribute('y2', '48'); lines[1].setAttribute('x2', '114');
	}

	// ── Chart build ──
	function buildChart() {
		const ns = 'http://www.w3.org/2000/svg';
		const svg = chartSvg;
		if (!svg) return;

		while (svg.firstChild) svg.removeChild(svg.firstChild);
		BUBBLE_GEO.length = 0;

		const C = getConfig();
		const { BASE_R, COLS, SVG_W, PAD_H, LABEL_ABOVE, NAME_GAP, NAME_FONT,
			LINE_GAP, LINE_H, LINE_SPACE, CAT_LABEL_GAP, CAT_FONT_H, ROW_GAP, ratioSz, CAT_FONT } = C;

		const COL_W = (SVG_W - PAD_H * 2) / COLS;
		const ROWS = Math.ceil(DATA.length / COLS);

		function rv(ratio) { return BASE_R * Math.sqrt(Math.max(ratio, 0)); }

		function getRowMaxR(ri) {
			let m = BASE_R;
			for (let c = 0; c < COLS; c++) {
				const i = ri * COLS + c;
				if (i < DATA.length) m = Math.max(m, rv(DATA[i].ratio));
			}
			return m;
		}

		function getRowInfo() {
			const rows = [];
			let y = 10;
			for (let r = 0; r < ROWS; r++) {
				const maxR = getRowMaxR(r);
				const bottomLine = y + LABEL_ABOVE + maxR * 2;
				const nameY = bottomLine + NAME_GAP + NAME_FONT;
				const lineY = nameY + LINE_GAP;
				rows.push({ bottomLine, maxR, nameY, lineY });
				y = lineY + LINE_H + CAT_LABEL_GAP + CAT_FONT_H + ROW_GAP;
			}
			return rows;
		}

		const rowInfo = getRowInfo();
		const last = rowInfo[rowInfo.length - 1];
		const totalH = last.lineY + LINE_H + CAT_LABEL_GAP + CAT_FONT_H + 10;

		svg.setAttribute('viewBox', `0 0 ${SVG_W} ${totalH}`);
		svg.setAttribute('height', totalH);

		const defs = document.createElementNS(ns, 'defs');
		defs.innerHTML = `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
  <feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#000" flood-opacity="0.07"/>
</filter>`;
		svg.appendChild(defs);

		DATA.forEach((d, idx) => {
			const ri = Math.floor(idx / COLS);
			const ci = idx % COLS;
			const info = rowInfo[ri];
			const cx = PAD_H + ci * COL_W + COL_W / 2;
			const bl = info.bottomLine;

			const rvv = rv(d.ratio);
			const rb = BASE_R;
			const cyVal = bl - rvv;
			const cyBas = bl - rb;
			const over1 = d.ratio >= 1.0;

			const bigR = Math.max(rvv, rb);
			const bigCY = over1 ? cyVal : cyBas;
			const bigTop = bigCY - bigR;

			BUBBLE_GEO.push({ cx, bigCY, bigR, bigTop, cyVal, cyBas, rvv, rb });

			const g = document.createElementNS(ns, 'g');
			g.style.cursor = 'pointer';

			const hitTop = Math.min(cyVal - rvv, cyBas - rb);
			const hitBot = Math.max(cyVal + rvv, cyBas + rb);
			const hitR = document.createElementNS(ns, 'rect');
			hitR.setAttribute('x', cx - bigR - 2);
			hitR.setAttribute('y', hitTop - 2);
			hitR.setAttribute('width', bigR * 2 + 4);
			hitR.setAttribute('height', hitBot - hitTop + 4);
			hitR.setAttribute('fill', 'transparent');
			g.appendChild(hitR);

			if (over1) {
				const yc = document.createElementNS(ns, 'circle');
				yc.setAttribute('cx', cx); yc.setAttribute('cy', cyVal); yc.setAttribute('r', rvv);
				yc.setAttribute('fill', '#fdf151'); yc.setAttribute('stroke', '#222222');
				yc.setAttribute('stroke-width', '0.25'); yc.setAttribute('filter', 'url(#sh)');
				g.appendChild(yc);
				const bc = document.createElementNS(ns, 'circle');
				bc.setAttribute('cx', cx); bc.setAttribute('cy', cyBas); bc.setAttribute('r', rb);
				bc.setAttribute('fill', '#333333'); bc.setAttribute('fill-opacity', '0.10');
				bc.setAttribute('stroke', 'none'); bc.setAttribute('pointer-events', 'none');
				g.appendChild(bc);
			} else {
				const bc = document.createElementNS(ns, 'circle');
				bc.setAttribute('cx', cx); bc.setAttribute('cy', cyBas); bc.setAttribute('r', rb);
				bc.setAttribute('fill', '#333333'); bc.setAttribute('stroke', '#333333');
				bc.setAttribute('stroke-width', '0.25'); bc.setAttribute('pointer-events', 'none');
				g.appendChild(bc);
				const yc = document.createElementNS(ns, 'circle');
				yc.setAttribute('cx', cx); yc.setAttribute('cy', cyVal); yc.setAttribute('r', rvv);
				yc.setAttribute('fill', '#fdf151'); yc.setAttribute('stroke', '#333333');
				yc.setAttribute('stroke-width', '0.25');
				g.appendChild(yc);
			}

			const ring = document.createElementNS(ns, 'circle');
			ring.setAttribute('cx', cx); ring.setAttribute('cy', bigCY); ring.setAttribute('r', bigR + 4);
			ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#999');
			ring.setAttribute('stroke-width', '1'); ring.setAttribute('opacity', '0');
			ring.setAttribute('pointer-events', 'none');
			g.appendChild(ring);

			const vSz = ratioSz(bigR);
			const vEl = document.createElementNS(ns, 'text');
			vEl.setAttribute('x', cx); vEl.setAttribute('y', bigTop - 7);
			vEl.setAttribute('text-anchor', 'middle'); vEl.setAttribute('font-size', vSz);
			vEl.setAttribute('font-family', 'PT Sans, sans-serif'); vEl.setAttribute('font-weight', '700');
			vEl.setAttribute('fill', '#222'); vEl.setAttribute('pointer-events', 'none');
			vEl.textContent = fmtRatio(d.ratio);
			g.appendChild(vEl);

			const nEl = document.createElementNS(ns, 'text');
			nEl.setAttribute('x', cx); nEl.setAttribute('y', info.nameY);
			nEl.setAttribute('text-anchor', 'middle'); nEl.setAttribute('font-size', NAME_FONT);
			nEl.setAttribute('font-family', 'PT Sans, sans-serif'); nEl.setAttribute('fill', '#333');
			nEl.setAttribute('pointer-events', 'none');
			nEl.textContent = countryName(d.country, isMobile());
			g.appendChild(nEl);

			g.addEventListener('mouseenter', () => { ring.setAttribute('opacity', '1'); showTip(idx); });
			g.addEventListener('mouseleave', () => { ring.setAttribute('opacity', '0'); hideTip(); });

			let tipTimer;
			g.addEventListener('touchstart', e => {
				e.stopPropagation();
				clearTimeout(tipTimer);
				if (window._activeRing && window._activeRing !== ring) window._activeRing.setAttribute('opacity', '0');
				window._activeRing = ring;
				ring.setAttribute('opacity', '1');
				showTip(idx);
				tipTimer = setTimeout(() => {
					ring.setAttribute('opacity', '0');
					hideTip();
					window._activeRing = null;
				}, 3000);
			}, { passive: true });
			g.addEventListener('touchend', e => e.stopPropagation(), { passive: true });

			svg.appendChild(g);
		});

		// ── Category lines ──
		rowInfo.forEach((info, ri) => {
			const lineY = info.lineY;
			const rowStart = ri * COLS;
			const cells = [];
			for (let ci = 0; ci < COLS; ci++) {
				const idx = rowStart + ci;
				if (idx < DATA.length) cells.push({ ci, cat: DATA[idx].cat });
			}
			const runs = [];
			let cur = null;
			cells.forEach(cell => {
				if (!cur || cell.cat !== cur.cat) { cur = { cat: cell.cat, cells: [cell] }; runs.push(cur); }
				else cur.cells.push(cell);
			});

			runs.forEach((run, ri2) => {
				const cfg = CAT_CFG[run.cat];
				const first = run.cells[0];
				const lastC = run.cells[run.cells.length - 1];
				const leftInset = ri2 > 0 ? LINE_SPACE / 2 : 0;
				const rightInset = ri2 < runs.length - 1 ? LINE_SPACE / 2 : 0;
				const lx = PAD_H + first.ci * COL_W + leftInset;
				const lw = (lastC.ci - first.ci + 1) * COL_W - leftInset - rightInset;
				const midX = lx + lw / 2;

				const line = document.createElementNS(ns, 'rect');
				line.setAttribute('x', lx); line.setAttribute('y', lineY);
				line.setAttribute('width', lw); line.setAttribute('height', LINE_H);
				line.setAttribute('fill', cfg.fill);
				svg.appendChild(line);

				const labelText = cfg.label.toUpperCase();
				const estW = approxTextWidth(labelText, CAT_FONT);
				if (estW < lw - 6) {
					const lEl = document.createElementNS(ns, 'text');
					lEl.setAttribute('x', midX); lEl.setAttribute('y', lineY + LINE_H + CAT_LABEL_GAP);
					lEl.setAttribute('text-anchor', 'middle'); lEl.setAttribute('dominant-baseline', 'hanging');
					lEl.setAttribute('font-size', CAT_FONT); lEl.setAttribute('font-family', 'Chaney, sans-serif');
					lEl.setAttribute('fill', '#333333'); lEl.setAttribute('pointer-events', 'none');
					lEl.textContent = labelText;
					svg.appendChild(lEl);
				}
			});
		});
	}

	// ── Tooltip ──
	function showTip(idx) {
		const d = DATA[idx];
		const geo = BUBBLE_GEO[idx];
		tooltip = {
			visible: true,
			country: d.country,
			cat: d.cat,
			ratio: d.ratio,
			actual: d.actual,
			expected: d.expected,
			companies: d.companies,
			x: 0, y: 0,
		};
		posTip(geo);
	}

	function posTip(geo) {
		const svg = chartSvg;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		const vbW = isMobile() ? 380 : 700;
		const scale = rect.width / vbW;

		const unionTopY = Math.min(geo.cyVal - geo.rvv, geo.cyBas - geo.rb);
		const unionBotY = Math.max(geo.cyVal + geo.rvv, geo.cyBas + geo.rb);
		const screenX = rect.left + geo.cx * scale;
		const screenTopY = rect.top + unionTopY * scale;
		const screenBotY = rect.top + unionBotY * scale;

		const tw = 230, th = 190, mg = 10;
		let x = screenX - tw / 2;
		let y = screenTopY - th - mg;
		if (x < 8) x = 8;
		if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
		if (y < 8) y = screenBotY + mg;

		tooltip = { ...tooltip, x, y };
	}

	function hideTip() {
		tooltip = { ...tooltip, visible: false };
	}

	onMount(() => {
		buildChart();
		updateLegendFont();

		let resizeTimer;
		const onResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => { buildChart(); updateLegendFont(); }, 120);
		};
		window.addEventListener('resize', onResize);

		document.addEventListener('touchstart', e => {
			if (tooltip.visible && !e.target.closest('[data-bubble]')) {
				clearTimeout(window._tipTimer);
				if (window._activeRing) { window._activeRing.setAttribute('opacity', '0'); window._activeRing = null; }
				hideTip();
			}
		}, { passive: true });

		return () => window.removeEventListener('resize', onResize);
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
	<svg bind:this={legendSvg} id="legend-svg" width="700" height="104" viewBox="0 0 700 104" style="display:block;width:100%;overflow:visible">
		<circle cx="50" cy="56" r="44" fill="#fdf151" stroke="#222222" stroke-width="0.25" />
		<circle cx="50" cy="74" r="26" fill="#333333" stroke="none" />
		<line x1="50" y1="12" x2="114" y2="12" stroke="#333333" stroke-width="1" />
		<line x1="50" y1="48" x2="114" y2="48" stroke="#333333" stroke-width="1" />
		<text x="118" y="12" font-family="PT Sans, sans-serif" font-size="15" fill="#555" dominant-baseline="middle">actual funding</text>
		<text x="118" y="48" font-family="PT Sans, sans-serif" font-size="15" fill="#555" dominant-baseline="middle">expected funding</text>
	</svg>
</div>

<!-- CHART -->
<div class="chart-wrap">
	<svg bind:this={chartSvg} id="chart-svg"></svg>
</div>

<!-- TOOLTIP -->
{#if tooltip.visible}
	{@const cfg = CAT_CFG[tooltip.cat]}
	<div
		id="tooltip"
		style="left:{tooltip.x}px; top:{tooltip.y}px"
	>
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