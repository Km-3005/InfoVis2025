// ============================================
// 成績改善分析
// ドロップダウンベースの選択
// ============================================

// グローバル状態
let data = [];
let currentMode = 'single'; // 'single' or 'comparison'

// 環境フィルター状態（円グラフクリック用）
let envFilter = {
	parentEducation: null, // null = 全て, または 'High School', 'Bachelor', 'Master'
	studyEnvironment: null // null = 全て, または 'Quiet', 'Moderate', 'Noisy'
};

// 改善カテゴリ
const improvementCategories = {
	all: { label: '全学生', filter: d => true, color: '#64748b' },
	high_improve: { label: '大幅向上', filter: d => d.improvement > 15, color: '#22c55e' },
	moderate_improve: { label: '向上', filter: d => d.improvement > 5 && d.improvement <= 15, color: '#84cc16' },
	slight_change: { label: '変化なし', filter: d => d.improvement >= -5 && d.improvement <= 5, color: '#94a3b8' },
	slight_decline: { label: 'やや低下', filter: d => d.improvement < -5 && d.improvement >= -15, color: '#f97316' },
	declined: { label: '低下', filter: d => d.improvement < -15, color: '#ef4444' }
};

// 色スケール - tab10準拠
const tab10 = [
	'#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
	'#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const improvementScale = d3.scaleThreshold()
	.domain([-15, -5, 5, 15])
	.range(['#ef4444', '#f97316', '#94a3b8', '#84cc16', '#22c55e']);

// カテゴリ設定（tab10カラー）
const parentEducationConfig = {
	'High School': { label: '高卒', color: tab10[0] },
	'Bachelor': { label: '学士', color: tab10[1] },
	'Master': { label: '修士', color: tab10[2] }
};

const environmentConfig = {
	'Quiet': { label: '静か', color: tab10[2] },
	'Moderate': { label: '普通', color: tab10[1] },
	'Noisy': { label: '騒がしい', color: tab10[3] }
};

// ============================================
// データ読み込み
// ============================================
d3.csv('student_performance_interactions.csv').then(rawData => {
	data = rawData.map((d, i) => ({
		id: i,
		student_id: d.student_id,
		final_score: +d.final_score,
		previous_score: +d.previous_score,
		improvement: +d.final_score - +d.previous_score,
		grade: d.grade,
		pass_fail: +d.pass_fail,
		daily_study_hours: +d.daily_study_hours,
		attendance_percentage: +d.attendance_percentage,
		homework_completion_rate: +d.homework_completion_rate,
		motivation_score: +d.motivation_score,
		exam_anxiety_score: +d.exam_anxiety_score,
		sleep_hours: +d.sleep_hours,
		screen_time_hours: +d.screen_time_hours,
		parent_education_level: d.parent_education_level,
		study_environment: d.study_environment
	}));

	initUI();
	updateAll();
});

// ============================================
// UI初期化
// ============================================
function initUI() {
	// モード切替
	document.getElementById('singleMode').addEventListener('click', () => setMode('single'));
	document.getElementById('comparisonMode').addEventListener('click', () => setMode('comparison'));

	// 単品モードセレクター
	document.getElementById('singleSelect').addEventListener('change', updateAll);

	// 比較モードセレクター
	document.getElementById('groupASelect').addEventListener('change', updateAll);
	document.getElementById('groupBSelect').addEventListener('change', updateAll);

	// リセット
	document.getElementById('resetBtn').addEventListener('click', resetSelection);

	// リサイズ
	window.addEventListener('resize', debounce(updateAll, 200));
}

function setMode(mode) {
	currentMode = mode;

	document.getElementById('singleMode').classList.toggle('active', mode === 'single');
	document.getElementById('comparisonMode').classList.toggle('active', mode === 'comparison');

	document.getElementById('singlePanel').classList.toggle('hidden', mode !== 'single');
	document.getElementById('comparisonPanel').classList.toggle('hidden', mode !== 'comparison');

	updateAll();
}

function resetSelection() {
	document.getElementById('singleSelect').value = 'all';
	document.getElementById('groupASelect').value = 'high_improve';
	document.getElementById('groupBSelect').value = 'declined';
	// 環境フィルターもリセット
	envFilter.parentEducation = null;
	envFilter.studyEnvironment = null;
	updateAll();
}

function updateAll() {
	drawMainScatter();

	if (currentMode === 'single') {
		updateSinglePanel();
	} else {
		updateComparisonPanel();
	}
}

// ============================================
// 選択データ取得
// ============================================
function getSingleSelection() {
	const category = document.getElementById('singleSelect').value;
	const cat = improvementCategories[category];
	return data.filter(cat.filter);
}

function getGroupA() {
	const category = document.getElementById('groupASelect').value;
	const cat = improvementCategories[category];
	return data.filter(cat.filter);
}

function getGroupB() {
	const category = document.getElementById('groupBSelect').value;
	const cat = improvementCategories[category];
	return data.filter(cat.filter);
}

// ============================================
// メイン散布図
// ============================================
function drawMainScatter() {
	const container = document.getElementById('mainScatter').parentElement;
	const rect = container.getBoundingClientRect();
	const width = rect.width;
	const height = rect.height;
	const margin = { top: 15, right: 25, bottom: 55, left: 55 };

	d3.select('#mainScatter').selectAll('*').remove();

	const svg = d3.select('#mainScatter')
		.attr('width', width)
		.attr('height', height);

	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const g = svg.append('g')
		.attr('transform', `translate(${margin.left}, ${margin.top})`);

	// スケール
	const extent = d3.extent(data.flatMap(d => [d.previous_score, d.final_score]));
	const xScale = d3.scaleLinear()
		.domain([extent[0] - 5, extent[1] + 5])
		.range([0, innerWidth]);

	const yScale = d3.scaleLinear()
		.domain([extent[0] - 5, extent[1] + 5])
		.range([innerHeight, 0]);

	// グリッド
	g.append('g')
		.selectAll('line')
		.data(xScale.ticks(10))
		.join('line')
		.attr('x1', d => xScale(d))
		.attr('x2', d => xScale(d))
		.attr('y1', 0)
		.attr('y2', innerHeight)
		.attr('stroke', '#f1f5f9')
		.attr('stroke-width', 1);

	g.append('g')
		.selectAll('line')
		.data(yScale.ticks(10))
		.join('line')
		.attr('x1', 0)
		.attr('x2', innerWidth)
		.attr('y1', d => yScale(d))
		.attr('y2', d => yScale(d))
		.attr('stroke', '#f1f5f9')
		.attr('stroke-width', 1);

	// 対角線 (y = x)
	g.append('line')
		.attr('class', 'diagonal-line')
		.attr('x1', xScale(extent[0] - 5))
		.attr('y1', yScale(extent[0] - 5))
		.attr('x2', xScale(extent[1] + 5))
		.attr('y2', yScale(extent[1] + 5));

	// 領域ラベル
	g.append('text')
		.attr('x', innerWidth - 50)
		.attr('y', 25)
		.attr('fill', '#22c55e')
		.attr('font-size', '11px')
		.attr('opacity', 0.8)
		.text('↑ 改善');

	g.append('text')
		.attr('x', innerWidth - 50)
		.attr('y', innerHeight - 10)
		.attr('fill', '#ef4444')
		.attr('font-size', '11px')
		.attr('opacity', 0.8)
		.text('↓ 低下');

	// 選択されている点を決定
	let selectedIds = new Set();

	if (currentMode === 'single') {
		const selected = getSingleSelection();
		selected.forEach(d => selectedIds.add(d.id));
	} else {
		const groupA = getGroupA();
		const groupB = getGroupB();
		groupA.forEach(d => selectedIds.add(d.id));
		groupB.forEach(d => selectedIds.add(d.id));
	}

	const groupAIds = new Set(getGroupA().map(d => d.id));
	const groupBIds = new Set(getGroupB().map(d => d.id));

	// 環境フィルターに一致するかチェック
	function matchesEnvFilter(d) {
		if (envFilter.parentEducation !== null && d.parent_education_level !== envFilter.parentEducation) {
			return false;
		}
		if (envFilter.studyEnvironment !== null && d.study_environment !== envFilter.studyEnvironment) {
			return false;
		}
		return true;
	}

	const hasEnvFilter = envFilter.parentEducation !== null || envFilter.studyEnvironment !== null;

	// データポイント
	g.selectAll('.data-point')
		.data(data)
		.join('circle')
		.attr('class', d => {
			let cls = 'data-point';
			if (currentMode === 'single') {
				const category = document.getElementById('singleSelect').value;
				if (category !== 'all' && !selectedIds.has(d.id)) {
					cls += ' dimmed';
				}
			} else {
				if (groupAIds.has(d.id)) cls += ' group-a-selected';
				else if (groupBIds.has(d.id)) cls += ' group-b-selected';
				else cls += ' dimmed';
			}
			return cls;
		})
		.attr('cx', d => xScale(d.previous_score))
		.attr('cy', d => yScale(d.final_score))
		.attr('r', d => {
			// 環境フィルターに一致する点は少し大きく
			if (hasEnvFilter && matchesEnvFilter(d) && selectedIds.has(d.id)) {
				return 7;
			}
			return 5;
		})
		.attr('fill', d => {
			if (currentMode === 'comparison') {
				if (groupAIds.has(d.id)) return 'var(--color-group-a)';
				if (groupBIds.has(d.id)) return 'var(--color-group-b)';
			}
			return improvementScale(d.improvement);
		})
		.attr('stroke', d => {
			if (hasEnvFilter && matchesEnvFilter(d) && selectedIds.has(d.id)) {
				return '#1e293b';
			}
			return 'none';
		})
		.attr('stroke-width', d => {
			if (hasEnvFilter && matchesEnvFilter(d) && selectedIds.has(d.id)) {
				return 2;
			}
			return 0;
		})
		.attr('opacity', d => {
			if (currentMode === 'single') {
				const category = document.getElementById('singleSelect').value;
				// まずカテゴリフィルター
				if (category !== 'all' && !selectedIds.has(d.id)) return 0.1;
				// 次に環境フィルター
				if (hasEnvFilter) {
					return matchesEnvFilter(d) ? 0.9 : 0.15;
				}
				return 0.7;
			} else {
				if (groupAIds.has(d.id) || groupBIds.has(d.id)) return 0.7;
				return 0.1;
			}
		})
		.on('mouseover', (event, d) => showTooltip(event, d))
		.on('mouseout', hideTooltip);

	// 軸
	g.append('g')
		.attr('class', 'axis')
		.attr('transform', `translate(0, ${innerHeight})`)
		.call(d3.axisBottom(xScale).ticks(10));

	g.append('g')
		.attr('class', 'axis')
		.call(d3.axisLeft(yScale).ticks(10));

	// 軸ラベル
	svg.append('text')
		.attr('x', margin.left + innerWidth / 2)
		.attr('y', height - 5)
		.attr('text-anchor', 'middle')
		.attr('font-size', '12px')
		.attr('fill', '#64748b')
		.text('過去成績');

	svg.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('x', -(margin.top + innerHeight / 2))
		.attr('y', 14)
		.attr('text-anchor', 'middle')
		.attr('font-size', '12px')
		.attr('fill', '#64748b')
		.text('最終成績');
}

// ============================================
// 単品分析パネル
// ============================================
function updateSinglePanel() {
	const selected = getSingleSelection();
	const count = selected.length;

	document.getElementById('statCount').textContent = count + '人';

	if (count === 0) {
		document.getElementById('statImprovement').textContent = '—';
		document.getElementById('statPassRate').textContent = '—';
		clearFactorCharts();
		document.getElementById('categoryBreakdown').innerHTML = '';
		return;
	}

	// 統計
	const avgImpr = d3.mean(selected, d => d.improvement);
	const passRate = d3.mean(selected, d => d.pass_fail) * 100;

	document.getElementById('statImprovement').textContent =
		(avgImpr >= 0 ? '+' : '') + avgImpr.toFixed(1);
	document.getElementById('statImprovement').style.color =
		avgImpr >= 0 ? '#22c55e' : '#ef4444';
	document.getElementById('statPassRate').textContent = passRate.toFixed(0) + '%';

	// 要因分布
	drawFactorChart('factorStudy', selected, 'daily_study_hours', [0, 8]);
	drawFactorChart('factorMotivation', selected, 'motivation_score', [0, 10]);
	drawFactorChart('factorAttendance', selected, 'attendance_percentage', [0, 100]);

	// カテゴリ内訳
	drawCategoryBreakdown(selected);
}

function drawFactorChart(id, selected, field, domain) {
	const svg = d3.select('#' + id);
	svg.selectAll('*').remove();

	const container = svg.node().parentElement;
	const width = container.clientWidth - 16;
	const height = 50;
	const margin = { top: 5, right: 5, bottom: 15, left: 5 };

	const values = selected.map(d => d[field]);
	const bins = d3.bin().domain(domain).thresholds(10)(values);

	const xScale = d3.scaleLinear()
		.domain(domain)
		.range([margin.left, width - margin.right]);

	const yScale = d3.scaleLinear()
		.domain([0, d3.max(bins, d => d.length)])
		.range([height - margin.bottom, margin.top]);

	svg.attr('width', width).attr('height', height);

	svg.selectAll('.bar')
		.data(bins)
		.join('rect')
		.attr('class', 'bar')
		.attr('x', d => xScale(d.x0) + 1)
		.attr('y', d => yScale(d.length))
		.attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
		.attr('height', d => yScale(0) - yScale(d.length))
		.attr('fill', '#3b82f6')
		.attr('opacity', 0.7);

	svg.append('g')
		.attr('transform', `translate(0, ${height - margin.bottom})`)
		.call(d3.axisBottom(xScale).ticks(3).tickSize(3))
		.selectAll('text').attr('font-size', '8px');
}

function clearFactorCharts() {
	['factorStudy', 'factorMotivation', 'factorAttendance'].forEach(id => {
		d3.select('#' + id).selectAll('*').remove();
	});
}

// カテゴリ内訳（円グラフ版）
function drawCategoryBreakdown(selected) {
	const container = document.getElementById('categoryBreakdown');
	const total = selected.length;

	if (total === 0) {
		container.innerHTML = '';
		return;
	}

	// HTMLで2つの円グラフ用のコンテナを作成
	container.innerHTML = `
		<div class="pie-chart-container">
			<div class="pie-chart-item">
				<div class="pie-title">親の学歴</div>
				<svg id="pieParent"></svg>
				<div id="legendParent" class="pie-legend"></div>
			</div>
			<div class="pie-chart-item">
				<div class="pie-title">学習環境</div>
				<svg id="pieEnv"></svg>
				<div id="legendEnv" class="pie-legend"></div>
			</div>
		</div>
	`;

	// 親の学歴
	const parentCounts = d3.rollup(selected, v => v.length, d => d.parent_education_level);
	drawPieChart('pieParent', 'legendParent', parentCounts, parentEducationConfig, total, 'parentEducation');

	// 学習環境
	const envCounts = d3.rollup(selected, v => v.length, d => d.study_environment);
	drawPieChart('pieEnv', 'legendEnv', envCounts, environmentConfig, total, 'studyEnvironment');
}

function drawPieChart(svgId, legendId, counts, config, total, filterType) {
	const svg = d3.select('#' + svgId);
	const legendContainer = document.getElementById(legendId);

	const size = 90;
	const radius = size / 2 - 4;

	svg.attr('width', size).attr('height', size);

	const g = svg.append('g')
		.attr('transform', `translate(${size / 2}, ${size / 2})`);

	// データ準備
	const pieData = Array.from(counts, ([key, count]) => {
		const cfg = config[key] || { label: key, color: '#94a3b8' };
		return {
			key,
			label: cfg.label,
			value: count,
			pct: (count / total * 100).toFixed(0),
			color: cfg.color
		};
	}).sort((a, b) => b.value - a.value);

	// 円グラフ作成
	const pie = d3.pie()
		.value(d => d.value)
		.sort(null);

	const arc = d3.arc()
		.innerRadius(radius * 0.5)
		.outerRadius(radius);

	const arcHover = d3.arc()
		.innerRadius(radius * 0.5)
		.outerRadius(radius + 5);

	const currentFilter = envFilter[filterType];

	g.selectAll('path')
		.data(pie(pieData))
		.join('path')
		.attr('d', d => {
			// 選択中のセグメントは少し大きく
			if (currentFilter === d.data.key) {
				return arcHover(d);
			}
			return arc(d);
		})
		.attr('fill', d => d.data.color)
		.attr('stroke', d => currentFilter === d.data.key ? '#1e293b' : 'white')
		.attr('stroke-width', d => currentFilter === d.data.key ? 3 : 2)
		.attr('opacity', d => {
			if (currentFilter === null) return 1;
			return currentFilter === d.data.key ? 1 : 0.4;
		})
		.style('cursor', 'pointer')
		.on('mouseover', function (event, d) {
			if (currentFilter !== d.data.key) {
				d3.select(this).attr('d', arcHover(d)).attr('opacity', 0.9);
			}
		})
		.on('mouseout', function (event, d) {
			if (currentFilter !== d.data.key) {
				d3.select(this).attr('d', arc(d)).attr('opacity', currentFilter === null ? 1 : 0.4);
			}
		})
		.on('click', function (event, d) {
			// トグル: 同じものをクリックで解除
			if (envFilter[filterType] === d.data.key) {
				envFilter[filterType] = null;
			} else {
				envFilter[filterType] = d.data.key;
			}
			// 散布図を再描画
			drawMainScatter();
			// 円グラフを再描画して選択状態を更新
			updateSinglePanel();
		})
		.append('title')
		.text(d => `${d.data.label}: ${d.data.value}人 (${d.data.pct}%)\nクリックでフィルター`);

	// 凡例（クリック可能）
	legendContainer.innerHTML = pieData.map(item => {
		const isActive = currentFilter === item.key;
		const isDimmed = currentFilter !== null && !isActive;
		return `<div class="pie-legend-item ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}" 
				data-key="${item.key}" data-filter-type="${filterType}">
			<span class="pie-legend-dot" style="background: ${item.color}"></span>
			<span class="pie-legend-label">${item.label}</span>
			<span class="pie-legend-value">${item.pct}%</span>
		</div>`;
	}).join('');

	// 凡例のクリックイベント
	legendContainer.querySelectorAll('.pie-legend-item').forEach(el => {
		el.addEventListener('click', () => {
			const key = el.dataset.key;
			const type = el.dataset.filterType;
			if (envFilter[type] === key) {
				envFilter[type] = null;
			} else {
				envFilter[type] = key;
			}
			drawMainScatter();
			updateSinglePanel();
		});
	});
}

// ============================================
// 比較パネル
// ============================================
function updateComparisonPanel() {
	const aData = getGroupA();
	const bData = getGroupB();

	document.getElementById('groupACount').textContent = aData.length + '人';
	document.getElementById('groupBCount').textContent = bData.length + '人';

	if (aData.length > 0) {
		const avgA = d3.mean(aData, d => d.improvement);
		document.getElementById('groupAImpr').textContent = `改善: ${avgA >= 0 ? '+' : ''}${avgA.toFixed(1)}`;
	}

	if (bData.length > 0) {
		const avgB = d3.mean(bData, d => d.improvement);
		document.getElementById('groupBImpr').textContent = `改善: ${avgB >= 0 ? '+' : ''}${avgB.toFixed(1)}`;
	}

	if (aData.length > 0 && bData.length > 0) {
		drawComparisonTable(aData, bData);
	}
}

// 比較テーブル（相関係数版）
function drawComparisonTable(aData, bData) {
	const container = document.getElementById('comparisonTable');
	const allData = [...aData, ...bData];

	const factors = [
		{ key: 'daily_study_hours', label: '学習時間', unit: 'h', max: 8 },
		{ key: 'motivation_score', label: 'モチベーション', unit: '', max: 10 },
		{ key: 'attendance_percentage', label: '授業出席率', unit: '%', max: 100 },
		{ key: 'homework_completion_rate', label: '宿題完了率', unit: '%', max: 100 },
		{ key: 'exam_anxiety_score', label: '試験不安', unit: '', max: 10, reverse: true },
		{ key: 'sleep_hours', label: '睡眠時間', unit: 'h', max: 10 }
	];

	const rows = factors.map(f => {
		const avgA = d3.mean(aData, d => d[f.key]);
		const avgB = d3.mean(bData, d => d[f.key]);
		const diff = avgA - avgB;

		// 相関係数を計算（全データで成績改善との相関）
		const corr = pearsonCorrelation(
			allData.map(d => d[f.key]),
			allData.map(d => d.improvement)
		);

		// バーの幅を計算
		const pctA = Math.min(100, Math.max(0, (Math.abs(avgA) / f.max) * 100));
		const pctB = Math.min(100, Math.max(0, (Math.abs(avgB) / f.max) * 100));

		// 差異の色とクラス
		let diffClass = '';
		if (Math.abs(diff) > 1) {
			if (f.reverse) {
				diffClass = diff < 0 ? 'positive' : 'negative';
			} else {
				diffClass = diff > 0 ? 'positive' : 'negative';
			}
		}

		const diffSign = diff >= 0 ? '+' : '';
		const valueA = avgA.toFixed(1);
		const valueB = avgB.toFixed(1);

		// 相関の強さに応じた色
		let corrClass = '';
		if (Math.abs(corr) >= 0.3) {
			corrClass = corr > 0 ? 'positive' : 'negative';
		}
		const corrSign = corr >= 0 ? '+' : '';

		return `
			<div class="comp-row">
				<div class="comp-label">${f.label}</div>
				<div class="comp-bars">
					<div class="comp-bar-group">
						<div class="comp-bar-track">
							<div class="comp-bar bar-a" style="width: ${pctA}%"></div>
						</div>
						<span class="comp-value value-a">${valueA}${f.unit}</span>
					</div>
					<div class="comp-bar-group">
						<div class="comp-bar-track">
							<div class="comp-bar bar-b" style="width: ${pctB}%"></div>
						</div>
						<span class="comp-value value-b">${valueB}${f.unit}</span>
					</div>
				</div>
				<div class="comp-diff ${diffClass}">
					${diffSign}${diff.toFixed(1)}${f.unit}
				</div>
				<div class="comp-corr ${corrClass}" title="成績改善との相関係数">
					r=${corrSign}${corr.toFixed(2)}
				</div>
			</div>
		`;
	}).join('');

	// ヘッダー
	const header = `
		<div class="comp-header">
			<div class="comp-label"></div>
			<div class="comp-bars-header">
				<span class="header-a">グループA</span>
				<span class="header-b">グループB</span>
			</div>
			<div class="comp-diff-header">差 (A-B)</div>
			<div class="comp-corr-header" title="成績改善との相関">相関</div>
		</div>
	`;

	// 凡例
	const legend = `
		<div class="corr-legend">
			<span class="corr-legend-title">相関係数 (r):</span>
			<span class="corr-legend-item">|r| ≥ 0.5 強い</span>
			<span class="corr-legend-item">|r| ≥ 0.3 中程度</span>
			<span class="corr-legend-item">|r| < 0.3 弱い</span>
		</div>
	`;

	container.innerHTML = header + rows + legend;
}

// ピアソン相関係数
function pearsonCorrelation(x, y) {
	const n = x.length;
	if (n === 0 || n !== y.length) return 0;

	const meanX = d3.mean(x);
	const meanY = d3.mean(y);

	let numerator = 0;
	let denomX = 0;
	let denomY = 0;

	for (let i = 0; i < n; i++) {
		const dx = x[i] - meanX;
		const dy = y[i] - meanY;
		numerator += dx * dy;
		denomX += dx * dx;
		denomY += dy * dy;
	}

	const denom = Math.sqrt(denomX * denomY);
	if (denom === 0) return 0;

	return numerator / denom;
}

// Welch's t検定（独立2標本）
function welchTTest(sample1, sample2) {
	const n1 = sample1.length;
	const n2 = sample2.length;

	if (n1 < 2 || n2 < 2) {
		return { tValue: 0, df: 0, pValue: 1 };
	}

	const mean1 = d3.mean(sample1);
	const mean2 = d3.mean(sample2);
	const var1 = d3.variance(sample1);
	const var2 = d3.variance(sample2);

	// 分散が0の場合の処理
	if (var1 === 0 && var2 === 0) {
		return { tValue: 0, df: n1 + n2 - 2, pValue: mean1 === mean2 ? 1 : 0 };
	}

	const se1 = var1 / n1;
	const se2 = var2 / n2;
	const se = Math.sqrt(se1 + se2);

	if (se === 0) {
		return { tValue: 0, df: n1 + n2 - 2, pValue: 1 };
	}

	const tValue = (mean1 - mean2) / se;

	// Welch-Satterthwaiteの自由度
	const df = Math.pow(se1 + se2, 2) /
		(Math.pow(se1, 2) / (n1 - 1) + Math.pow(se2, 2) / (n2 - 1));

	// p値の計算（両側検定）
	const pValue = 2 * (1 - tCDF(Math.abs(tValue), df));

	return { tValue, df, pValue };
}

// t分布の累積分布関数（近似）
function tCDF(t, df) {
	// ベータ関数を使った近似
	const x = df / (df + t * t);
	return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

// 不完全ベータ関数（近似）
function incompleteBeta(a, b, x) {
	if (x === 0) return 0;
	if (x === 1) return 1;

	// 連分数展開による近似
	const maxIterations = 200;
	const epsilon = 1e-10;

	const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
	const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

	let f = 1, c = 1, d = 0;

	for (let m = 0; m <= maxIterations; m++) {
		const m2 = 2 * m;

		// Even step
		let aa = m === 0 ? 1 : (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
		d = 1 + aa * d;
		c = 1 + aa / c;
		if (Math.abs(d) < epsilon) d = epsilon;
		if (Math.abs(c) < epsilon) c = epsilon;
		d = 1 / d;
		f *= d * c;

		// Odd step
		aa = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
		d = 1 + aa * d;
		c = 1 + aa / c;
		if (Math.abs(d) < epsilon) d = epsilon;
		if (Math.abs(c) < epsilon) c = epsilon;
		d = 1 / d;
		const delta = d * c;
		f *= delta;

		if (Math.abs(delta - 1) < epsilon) break;
	}

	return front * f;
}

// ガンマ関数の対数（Lanczos近似）
function gammaLn(x) {
	const g = 7;
	const coef = [
		0.99999999999980993,
		676.5203681218851,
		-1259.1392167224028,
		771.32342877765313,
		-176.61502916214059,
		12.507343278686905,
		-0.13857109526572012,
		9.9843695780195716e-6,
		1.5056327351493116e-7
	];

	if (x < 0.5) {
		return Math.log(Math.PI / Math.sin(Math.PI * x)) - gammaLn(1 - x);
	}

	x -= 1;
	let sum = coef[0];
	for (let i = 1; i < g + 2; i++) {
		sum += coef[i] / (x + i);
	}

	const t = x + g + 0.5;
	return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(sum);
}

// ============================================
// ツールチップ
// ============================================
function showTooltip(event, d) {
	const tooltip = document.getElementById('tooltip');
	tooltip.innerHTML = `
        <div class="tooltip-title">${d.student_id}</div>
        <div class="tooltip-row"><span>過去成績:</span><span>${d.previous_score.toFixed(1)}</span></div>
        <div class="tooltip-row"><span>最終成績:</span><span>${d.final_score.toFixed(1)}</span></div>
        <div class="tooltip-row"><span>変化:</span><span style="color: ${d.improvement >= 0 ? '#22c55e' : '#ef4444'}">${d.improvement >= 0 ? '+' : ''}${d.improvement.toFixed(1)}</span></div>
        <div class="tooltip-row"><span>成績:</span><span>${d.grade}</span></div>
        <div class="tooltip-row"><span>学習時間:</span><span>${d.daily_study_hours.toFixed(1)}h</span></div>
        <div class="tooltip-row"><span>モチベ:</span><span>${d.motivation_score.toFixed(1)}</span></div>
    `;
	tooltip.classList.add('visible');
	tooltip.style.left = (event.pageX + 12) + 'px';
	tooltip.style.top = (event.pageY - 10) + 'px';
}

function hideTooltip() {
	document.getElementById('tooltip').classList.remove('visible');
}

// ============================================
// ユーティリティ
// ============================================
function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}