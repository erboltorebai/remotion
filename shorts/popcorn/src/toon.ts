// Stickman cast drawn with Canvas2D: white round head with a simple face, the rest is black lines.
// Design canvas 400 x 600, soles at y = 585, centre x = 200.
type G = CanvasRenderingContext2D;
export const INK = '#17121c';
export const PW = 400;
export const PH = 600;
const LW = 15; // limb line width

export type Eyes = 'dot' | 'wide' | 'closed' | 'happy' | 'half';
export type Mouth = 'smile' | 'flat' | 'o' | 'scream' | 'grin' | 'frown';
export type Hold = 'none' | 'bag' | 'bagflat' | 'dryer' | 'mug' | 'torch' | 'remote';
export type Pose = {
	lean: number; // body tilt around the feet (+ = right)
	armL: [number, number]; // shoulder + elbow angle; 0 = hanging down, + = towards screen right / up
	armR: [number, number];
	legs: number; // walk swing -1..1
	eyes: Eyes;
	mouth: Mouth;
	look: number; // -1..1
	brow: number; // -1 worried .. 1 angry
	mode: 'stand' | 'sit' | 'ride' | 'floor';
	phase: number; // pedal phase for 'ride'
	holdL: Hold;
	holdR: Hold;
	sweat: number; // 0..1 strain (red face)
	jump: number; // 0..1 knees tucked
};
export const POSE: Pose = {lean: 0, armL: [-0.25, -0.12], armR: [0.25, 0.12], legs: 0, eyes: 'dot', mouth: 'smile', look: 0, brow: 0, mode: 'stand', phase: 0, holdL: 'none', holdR: 'none', sweat: 0, jump: 0};
export type Hat = 'none' | 'cap' | 'hard' | 'bun' | 'headset' | 'flat';
export type Style = {hat: Hat; color: string; scale: number};
export const HERO: Style = {hat: 'cap', color: '#e23b3b', scale: 1};

const stroke = (g: G, w: number, col = INK) => {
	g.lineWidth = w;
	g.strokeStyle = col;
	g.lineCap = 'round';
	g.lineJoin = 'round';
	g.stroke();
};
const fillStroke = (g: G, fill: string, w = 9) => {
	g.fillStyle = fill;
	g.fill();
	stroke(g, w);
};
const line = (g: G, pts: number[][], w = LW, col = INK) => {
	g.beginPath();
	pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
	stroke(g, w, col);
};

export const drawBag = (g: G, x: number, y: number, s: number, puff: number, tilt = 0) => {
	g.save();
	g.translate(x, y);
	g.rotate(tilt);
	g.scale(s, s);
	const w = 34 + puff * 14;
	g.beginPath();
	g.moveTo(-30, -44);
	g.lineTo(30, -44);
	g.quadraticCurveTo(w + 6, 0, 30, 44);
	g.lineTo(-30, 44);
	g.quadraticCurveTo(-w - 6, 0, -30, -44);
	g.closePath();
	fillStroke(g, '#fff6e0', 7);
	g.save();
	g.clip();
	g.fillStyle = '#e23b3b';
	for (let i = -2; i <= 2; i++) g.fillRect(i * 22 - 5, -50, 10, 100);
	g.restore();
	g.beginPath();
	g.ellipse(0, 4, 20, 15, 0, 0, 7);
	fillStroke(g, '#ffd23f', 5);
	g.restore();
};

const drawHeld = (g: G, h: Hold, x: number, y: number) => {
	if (h === 'bag') drawBag(g, x, y - 34, 1, 1);
	else if (h === 'bagflat') drawBag(g, x, y - 34, 1, 0);
	else if (h === 'mug') {
		g.beginPath();
		g.ellipse(x + 26, y - 18, 11, 13, 0, -1.4, 1.4);
		stroke(g, 7);
		g.beginPath();
		g.roundRect(x - 18, y - 40, 38, 42, 6);
		fillStroke(g, '#ffffff', 7);
	} else if (h === 'dryer') {
		g.beginPath();
		g.roundRect(x - 12, y - 6, 24, 60, 8);
		fillStroke(g, '#7c5fd0', 7);
		g.beginPath();
		g.moveTo(x - 62, y - 52);
		g.lineTo(x + 26, y - 44);
		g.quadraticCurveTo(x + 44, y - 20, x + 26, y + 4);
		g.lineTo(x - 62, y - 4);
		g.closePath();
		fillStroke(g, '#9a7cf0', 7);
	} else if (h === 'torch') {
		g.beginPath();
		g.moveTo(x - 60, y - 150);
		g.lineTo(x + 60, y - 150);
		g.lineTo(x + 18, y - 44);
		g.lineTo(x - 18, y - 44);
		g.closePath();
		g.fillStyle = 'rgba(255,236,150,0.55)';
		g.fill();
		g.beginPath();
		g.roundRect(x - 13, y - 30, 26, 60, 6);
		fillStroke(g, '#3f6fd8', 7);
		g.beginPath();
		g.moveTo(x - 22, y - 48);
		g.lineTo(x + 22, y - 48);
		g.lineTo(x + 13, y - 28);
		g.lineTo(x - 13, y - 28);
		g.closePath();
		fillStroke(g, '#ffd23f', 7);
	} else if (h === 'remote') {
		g.beginPath();
		g.roundRect(x - 10, y - 44, 20, 50, 5);
		fillStroke(g, '#3a3550', 6);
	}
};

const face = (g: G, cx: number, cy: number, R: number, p: Pose, side: number) => {
	const sh = p.look * 10 + side * R * 0.3;
	const ex = R * 0.36;
	const ey = cy - R * 0.06;
	for (const s of [-1, 1]) {
		const x = cx + s * ex + sh;
		g.beginPath();
		if (p.eyes === 'dot') {
			g.ellipse(x, ey, 8, 12, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
		} else if (p.eyes === 'wide') {
			g.ellipse(x, ey, 16, 19, 0, 0, 7);
			fillStroke(g, '#fff', 4);
			g.beginPath();
			g.ellipse(x + p.look * 6, ey, 8, 9, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
		} else if (p.eyes === 'closed') {
			g.moveTo(x - 12, ey);
			g.quadraticCurveTo(x, ey + 9, x + 12, ey);
			stroke(g, 6);
		} else if (p.eyes === 'happy') {
			g.moveTo(x - 12, ey + 4);
			g.quadraticCurveTo(x, ey - 11, x + 12, ey + 4);
			stroke(g, 6);
		} else {
			g.ellipse(x, ey + 3, 8, 6, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
			line(g, [[x - 13, ey - 5], [x + 13, ey - 5]], 6);
		}
		if (p.brow !== 0) line(g, [[x - 13, ey - 26 + s * p.brow * 7], [x + 13, ey - 26 - s * p.brow * 7]], 6);
	}
	const my = cy + R * 0.48;
	const mx = cx + sh;
	g.beginPath();
	if (p.mouth === 'smile') {
		g.moveTo(mx - 15, my - 3);
		g.quadraticCurveTo(mx, my + 12, mx + 15, my - 3);
		stroke(g, 6);
	} else if (p.mouth === 'grin') {
		g.moveTo(mx - 22, my - 6);
		g.quadraticCurveTo(mx, my + 24, mx + 22, my - 6);
		g.closePath();
		fillStroke(g, '#fff', 6);
	} else if (p.mouth === 'flat') line(g, [[mx - 13, my + 2], [mx + 13, my + 2]], 6);
	else if (p.mouth === 'frown') {
		g.moveTo(mx - 14, my + 8);
		g.quadraticCurveTo(mx, my - 6, mx + 14, my + 8);
		stroke(g, 6);
	} else if (p.mouth === 'o') {
		g.ellipse(mx, my + 2, 8, 10, 0, 0, 7);
		fillStroke(g, '#7a2233', 6);
	} else {
		g.ellipse(mx, my + 2, 19, 22, 0, 0, 7);
		fillStroke(g, '#7a2233', 6);
	}
};

const head = (g: G, cx: number, cy: number, st: Style, p: Pose, side: number) => {
	const R = 72;
	if (st.hat === 'bun') {
		g.beginPath();
		g.arc(cx, cy - R - 12, 26, 0, 7);
		fillStroke(g, st.color, 9);
	}
	g.beginPath();
	g.arc(cx, cy, R, 0, 7);
	const red = Math.round(255 - p.sweat * 70);
	fillStroke(g, p.sweat > 0 ? `rgb(255,${red},${red})` : '#ffffff', 11);
	face(g, cx, cy, R, p, side);
	if (st.hat === 'cap' || st.hat === 'flat') {
		g.beginPath();
		g.moveTo(cx - R - 3, cy - 30);
		g.quadraticCurveTo(cx, cy - (st.hat === 'flat' ? 112 : 138), cx + R + 3, cy - 30);
		g.lineTo(cx + R + (side >= 0 ? 46 : 3), cy - 26);
		g.lineTo(cx + R + (side >= 0 ? 46 : 3), cy - 13);
		g.lineTo(cx - R - (side < 0 ? 46 : 3), cy - 13);
		g.lineTo(cx - R - (side < 0 ? 46 : 3), cy - 26);
		g.closePath();
		fillStroke(g, st.color, 9);
	} else if (st.hat === 'hard') {
		g.beginPath();
		g.moveTo(cx - R - 4, cy - 32);
		g.quadraticCurveTo(cx - R, cy - 132, cx, cy - 132);
		g.quadraticCurveTo(cx + R, cy - 132, cx + R + 4, cy - 32);
		g.closePath();
		fillStroke(g, st.color, 9);
		g.beginPath();
		g.roundRect(cx - R - 22, cy - 40, R * 2 + 44, 18, 8);
		fillStroke(g, st.color, 9);
		line(g, [[cx, cy - 130], [cx, cy - 44]], 6);
	} else if (st.hat === 'bun') {
		g.beginPath();
		g.moveTo(cx - R + 3, cy - 22);
		g.quadraticCurveTo(cx - 20, cy - 100, cx + R - 3, cy - 22);
		g.quadraticCurveTo(cx + 10, cy - 58, cx - R + 3, cy - 22);
		fillStroke(g, st.color, 8);
	} else if (st.hat === 'headset') {
		g.beginPath();
		g.arc(cx, cy, R + 10, Math.PI * 1.08, Math.PI * 1.92);
		stroke(g, 12);
		for (const s of [-1, 1]) {
			g.beginPath();
			g.roundRect(cx + s * (R + 2) - 13, cy - 26, 26, 48, 10);
			fillStroke(g, st.color, 8);
		}
		line(g, [[cx + R + 2, cy + 20], [cx + R - 10, cy + 52], [cx + 34, cy + 54]], 6);
	}
	if (p.sweat > 0.3) {
		for (const [dx, dy] of [[-R - 18, -30], [R + 22, -8]]) {
			g.beginPath();
			g.moveTo(cx + dx, cy + dy - 16);
			g.quadraticCurveTo(cx + dx + 12, cy + dy + 8, cx + dx, cy + dy + 10);
			g.quadraticCurveTo(cx + dx - 12, cy + dy + 8, cx + dx, cy + dy - 16);
			fillStroke(g, '#7fd0ff', 5);
		}
	}
};

/** two-bone leg/arm: from a to target b with segment length L each, bending towards `dir` */
const bone = (a: number[], b: number[], L: number, dir: number) => {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const d = Math.min(Math.hypot(dx, dy), L * 2 - 0.01);
	const h = Math.sqrt(L * L - (d * d) / 4) * dir;
	const mx = a[0] + dx / 2;
	const my = a[1] + dy / 2;
	const n = Math.hypot(dx, dy) || 1;
	return [mx - (dy / n) * h, my + (dx / n) * h];
};

export const drawStick = (g: G, st: Style, q: Partial<Pose>) => {
	const p: Pose = {...POSE, ...q};
	g.save();
	g.translate(200, 585);
	g.rotate(p.lean);
	g.scale(st.scale, st.scale);
	g.translate(-200, -585);
	if (p.mode === 'ride') {
		// side view, facing right: hip on the saddle, hands on the bar, feet on the pedal circle
		const hip = [170, 392];
		const sh = [228, 262];
		const hc = [258, 172];
		const bar = [318, 318];
		const pc = [214, 512];
		for (const k of [1, 0]) {
			const a = p.phase + k * Math.PI;
			const foot = [pc[0] + Math.cos(a) * 40, pc[1] + Math.sin(a) * 40];
			const knee = bone(hip, foot, 84, -1);
			line(g, [hip, knee, foot], LW, k ? '#4a4452' : INK);
			line(g, [[foot[0] - 16, foot[1] + 4], [foot[0] + 24, foot[1] + 4]], 14, k ? '#4a4452' : INK);
		}
		line(g, [hip, sh, [hc[0] - 14, hc[1] + 60]]);
		const el = bone(sh, bar, 62, 1);
		line(g, [sh, el, bar]);
		g.beginPath();
		g.arc(bar[0], bar[1], 11, 0, 7);
		g.fillStyle = INK;
		g.fill();
		head(g, hc[0], hc[1], st, p, 1);
		g.restore();
		return;
	}
	const floor = p.mode === 'floor';
	const sit = p.mode === 'sit' || floor;
	const hipY = floor ? 548 : sit ? 430 : 410 - p.jump * 10;
	const shY = hipY - 150;
	const hcy = shY - 92;
	// legs
	for (const s of [-1, 1]) {
		const hx = 200 + s * 6;
		if (floor) {
			line(g, [[hx, hipY], [hx + s * 70, hipY - 62], [hx + s * 132, 574]]);
			line(g, [[hx + s * 126, 578], [hx + s * 164, 578]], 14);
		} else if (sit) {
			line(g, [[hx, hipY], [hx + 74 + s * 10, hipY + 4], [hx + 78 + s * 10, 572]]);
			line(g, [[hx + 72 + s * 10, 578], [hx + 108 + s * 10, 578]], 14);
		} else if (p.jump > 0.05) {
			const k = [hx + s * (30 + p.jump * 34), hipY + 62 - p.jump * 30];
			const f = [hx + s * (14 + p.jump * 10), hipY + 150 - p.jump * 80];
			line(g, [[hx, hipY], k, f]);
			line(g, [[f[0] - 6, f[1] + 5], [f[0] + s * 26, f[1] + 5]], 14);
		} else {
			const sw = s * p.legs * 52;
			const lift = Math.max(0, -s * p.legs) * 24;
			const f = [hx + s * 30 + sw, 574 - lift];
			const k = [hx + s * 18 + sw * 0.6 + 6, (hipY + f[1]) / 2 - 4];
			line(g, [[hx, hipY], k, f]);
			line(g, [[f[0] - 8, 578 - lift], [f[0] + 28, 578 - lift]], 14);
		}
	}
	// body
	line(g, [[200, hipY], [200, shY - 14]]);
	// arms
	const arm = (a: [number, number], hold: Hold, s: number) => {
		const L1 = 74;
		const L2 = 72;
		const sx = 200;
		const sy = shY + 6;
		const ex = sx + Math.sin(a[0]) * L1 + s * 4;
		const ey = sy + Math.cos(a[0]) * L1;
		const hx = ex + Math.sin(a[0] + a[1]) * L2;
		const hy = ey + Math.cos(a[0] + a[1]) * L2;
		line(g, [[sx, sy], [ex, ey], [hx, hy]]);
		drawHeld(g, hold, hx, hy);
		g.beginPath();
		g.arc(hx, hy, 12, 0, 7);
		g.fillStyle = INK;
		g.fill();
	};
	arm(p.armL, p.holdL, -1);
	head(g, 200, hcy, st, p, 0);
	arm(p.armR, p.holdR, 1);
	g.restore();
};
