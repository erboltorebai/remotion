// 2D flat cartoon characters drawn with Canvas2D. Design canvas: 400 x 600, soles at y = 585, centre x = 200.
type G = CanvasRenderingContext2D;
export const INK = '#241726';
export const PW = 400;
export const PH = 600;

export type Eyes = 'dot' | 'wide' | 'closed' | 'happy' | 'half';
export type Mouth = 'smile' | 'flat' | 'o' | 'scream' | 'grin' | 'sip' | 'frown';
export type Pose = {
	lean: number; // radians, body tilt around the feet (+ = to the right)
	armL: [number, number]; // shoulder, elbow angles; 0 = hanging down, + = swings to the right/up
	armR: [number, number];
	legs: number; // walk phase swing -1..1
	eyes: Eyes;
	mouth: Mouth;
	look: number; // -1..1 pupil offset
	brow: number; // -1 worried .. 1 angry
	sit: boolean;
	holdR: 'none' | 'mug' | 'pot' | 'strap' | 'laptop';
	holdL: 'none' | 'mug' | 'pot' | 'strap';
	hair: number; // hair blown sideways -1..1
};
export const POSE: Pose = {lean: 0, armL: [0.12, 0.1], armR: [-0.12, -0.1], legs: 0, eyes: 'dot', mouth: 'smile', look: 0, brow: 0, sit: false, holdR: 'none', holdL: 'none', hair: 0};
export type Style = {skin: string; shirt: string; pants: string; hair: string; hairKind: 'tuft' | 'bald' | 'bun' | 'cap' | 'hood' | 'long'; hood: string; goggles: boolean; scale: number};
export const DAVE: Style = {skin: '#ffd9a8', shirt: '#f2772e', pants: '#3b4a8c', hair: '#6b3a1e', hairKind: 'tuft', hood: '', goggles: false, scale: 1};

const stroke = (g: G, w: number, col = INK) => {
	g.lineWidth = w;
	g.strokeStyle = col;
	g.lineCap = 'round';
	g.lineJoin = 'round';
	g.stroke();
};
const fillStroke = (g: G, fill: string, w = 7) => {
	g.fillStyle = fill;
	g.fill();
	stroke(g, w);
};

export const drawMug = (g: G, x: number, y: number, s = 1, tilt = 0, col = '#ffffff') => {
	g.save();
	g.translate(x, y);
	g.rotate(tilt);
	g.scale(s, s);
	g.beginPath();
	g.ellipse(17, 0, 10, 12, 0, -1.4, 1.4);
	stroke(g, 6);
	g.beginPath();
	g.roundRect(-16, -18, 32, 36, 5);
	fillStroke(g, col, 6);
	g.fillStyle = '#5a2f14';
	g.beginPath();
	g.ellipse(0, -15, 12, 3.5, 0, 0, 7);
	g.fill();
	g.restore();
};

const drawPot = (g: G, x: number, y: number, tilt: number) => {
	g.save();
	g.translate(x, y);
	g.rotate(tilt);
	g.beginPath();
	g.moveTo(-22, -26);
	g.lineTo(22, -26);
	g.lineTo(28, 26);
	g.lineTo(-28, 26);
	g.closePath();
	fillStroke(g, '#cfe6f2', 6);
	g.fillStyle = '#5a2f14';
	g.fillRect(-24, -2, 49, 25);
	g.beginPath();
	g.moveTo(-26, -20);
	g.quadraticCurveTo(-52, 0, -27, 18);
	stroke(g, 8);
	g.fillStyle = INK;
	g.fillRect(-24, -34, 48, 10);
	g.restore();
};

const face = (g: G, cx: number, cy: number, hw: number, p: Pose, goggles: boolean) => {
	const ex = hw * 0.36;
	const ey = cy + 4;
	const lx = p.look * 7;
	for (const s of [-1, 1]) {
		const x = cx + s * ex + lx * 0.6;
		if (goggles) {
			g.beginPath();
			g.ellipse(x, ey, 25, 21, 0, 0, 7);
			fillStroke(g, '#7fd6e8', 6);
		}
		g.beginPath();
		if (p.eyes === 'dot') {
			g.ellipse(x + lx * 0.4, ey, 8, 11, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
		} else if (p.eyes === 'wide') {
			g.ellipse(x, ey, 19, 22, 0, 0, 7);
			fillStroke(g, '#fff', 5);
			g.beginPath();
			g.ellipse(x + lx, ey, 6, 7, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
		} else if (p.eyes === 'closed') {
			g.moveTo(x - 12, ey);
			g.quadraticCurveTo(x, ey + 9, x + 12, ey);
			stroke(g, 6);
		} else if (p.eyes === 'happy') {
			g.moveTo(x - 12, ey + 4);
			g.quadraticCurveTo(x, ey - 10, x + 12, ey + 4);
			stroke(g, 6);
		} else {
			g.ellipse(x + lx * 0.4, ey + 2, 8, 6, 0, 0, 7);
			g.fillStyle = INK;
			g.fill();
			g.beginPath();
			g.moveTo(x - 13, ey - 5);
			g.lineTo(x + 13, ey - 5);
			stroke(g, 6);
		}
		if (p.brow !== 0 && !goggles) {
			g.beginPath();
			g.moveTo(x - 14, ey - 27 + s * p.brow * 7);
			g.lineTo(x + 14, ey - 27 - s * p.brow * 7);
			stroke(g, 6);
		}
	}
	const my = cy + hw * 0.52;
	const mx = cx + lx * 0.5;
	g.beginPath();
	if (p.mouth === 'smile') {
		g.moveTo(mx - 16, my - 3);
		g.quadraticCurveTo(mx, my + 13, mx + 16, my - 3);
		stroke(g, 6);
	} else if (p.mouth === 'grin') {
		g.moveTo(mx - 24, my - 6);
		g.quadraticCurveTo(mx, my + 26, mx + 24, my - 6);
		g.closePath();
		fillStroke(g, '#fff', 6);
	} else if (p.mouth === 'flat') {
		g.moveTo(mx - 14, my + 2);
		g.lineTo(mx + 14, my + 2);
		stroke(g, 6);
	} else if (p.mouth === 'frown') {
		g.moveTo(mx - 15, my + 8);
		g.quadraticCurveTo(mx, my - 6, mx + 15, my + 8);
		stroke(g, 6);
	} else if (p.mouth === 'o') {
		g.ellipse(mx, my + 3, 9, 11, 0, 0, 7);
		fillStroke(g, '#7a2233', 6);
	} else if (p.mouth === 'sip') {
		g.ellipse(mx + 4, my + 2, 5, 5, 0, 0, 7);
		fillStroke(g, '#7a2233', 5);
	} else {
		g.ellipse(mx, my + 4, 22, 27, 0, 0, 7);
		fillStroke(g, '#7a2233', 6);
		g.beginPath();
		g.ellipse(mx, my + 20, 12, 8, 0, 0, 7);
		g.fillStyle = '#ff7f8f';
		g.fill();
	}
};

/** Full person. Everything is drawn in a frame rotated by `lean` around the soles. */
export const drawPerson = (g: G, st: Style, p: Pose) => {
	g.save();
	g.translate(200, 585);
	g.rotate(p.lean);
	g.scale(st.scale, st.scale);
	g.translate(-200, -585);
	const hipY = p.sit ? 430 : 405;
	const shY = 262;
	const hw = 82; // head half width
	const hcy = 150;
	// legs
	for (const s of [-1, 1]) {
		g.beginPath();
		const hx = 200 + s * 22;
		if (p.sit) {
			g.moveTo(hx, hipY);
			g.lineTo(hx + 70, hipY + 6);
			g.lineTo(hx + 74, 575);
			stroke(g, 13);
			g.beginPath();
			g.ellipse(hx + 88, 578, 22, 10, 0, 0, 7);
		} else {
			const sw = s * p.legs * 46;
			const fx = hx + sw + s * 6;
			const lift = Math.max(0, -s * p.legs) * 22;
			g.moveTo(hx, hipY);
			g.quadraticCurveTo(hx + sw * 0.9 + 8, 500 - lift, fx, 575 - lift);
			stroke(g, 13);
			g.beginPath();
			g.ellipse(fx + 12, 578 - lift, 22, 10, 0, 0, 7);
		}
		g.fillStyle = INK;
		g.fill();
	}
	// far arm (L) behind the torso, near arm (R) in front
	const arm = (a: [number, number], sx: number, hold: Pose['holdR']) => {
		const L1 = 78;
		const L2 = 76;
		const ex = sx + Math.sin(a[0]) * L1;
		const ey = shY + 10 + Math.cos(a[0]) * L1;
		const hx = ex + Math.sin(a[0] + a[1]) * L2;
		const hy = ey + Math.cos(a[0] + a[1]) * L2;
		if (hold === 'strap') {
			g.beginPath();
			g.moveTo(hx, hy - 4);
			g.lineTo(hx, hy - 400);
			stroke(g, 7, '#d8b43a');
		}
		g.beginPath();
		g.moveTo(sx, shY + 10);
		g.lineTo(ex, ey);
		g.lineTo(hx, hy);
		stroke(g, 12);
		if (hold === 'mug') drawMug(g, hx + 8, hy - 16, 1.15, 0);
		if (hold === 'pot') drawPot(g, hx + 6, hy - 8, a[0] + a[1] > 1.6 ? 0.9 : 0.1);
		if (hold === 'laptop') {
			g.beginPath();
			g.roundRect(hx - 60, hy - 6, 96, 12, 4);
			fillStroke(g, '#9aa3b5', 6);
		}
		g.beginPath();
		g.arc(hx, hy, 11, 0, 7);
		g.fillStyle = st.hood ? st.hood : INK;
		g.fill();
		if (st.hood) stroke(g, 6);
	};
	arm(p.armL, 200 - 48, p.holdL);
	// torso
	g.beginPath();
	const bw = st.hood ? 74 : 58;
	g.moveTo(200 - bw * 0.82, shY);
	g.quadraticCurveTo(200, shY - 22, 200 + bw * 0.82, shY);
	g.quadraticCurveTo(200 + bw + 8, (shY + hipY) / 2, 200 + bw * 0.9, hipY + 12);
	g.quadraticCurveTo(200, hipY + 26, 200 - bw * 0.9, hipY + 12);
	g.quadraticCurveTo(200 - bw - 8, (shY + hipY) / 2, 200 - bw * 0.82, shY);
	fillStroke(g, st.shirt, 8);
	if (st.hood) {
		g.beginPath();
		g.moveTo(200, shY + 4);
		g.lineTo(200, hipY + 16);
		stroke(g, 5);
	} else {
		g.beginPath();
		g.rect(200 - bw * 0.86, hipY - 8, bw * 1.72, 26);
		g.fillStyle = st.pants;
		g.fill();
		stroke(g, 7);
	}
	// head (bean)
	if (st.hairKind === 'hood') {
		g.beginPath();
		g.ellipse(200, hcy + 2, hw + 26, hw * 0.94 + 26, 0, 0, 7);
		fillStroke(g, '#f3e7d2', 8);
	}
	if (st.hairKind === 'long' || st.hairKind === 'bun') {
		g.beginPath();
		g.ellipse(200, hcy - 6, hw + 10, hw + 4, 0, 0, 7);
		fillStroke(g, st.hair, 8);
		if (st.hairKind === 'bun') {
			g.beginPath();
			g.arc(200, hcy - hw - 16, 26, 0, 7);
			fillStroke(g, st.hair, 8);
		}
	}
	g.beginPath();
	g.moveTo(200 - hw, hcy - 6);
	g.bezierCurveTo(200 - hw, hcy - hw * 1.25, 200 + hw, hcy - hw * 1.25, 200 + hw, hcy - 6);
	g.bezierCurveTo(200 + hw, hcy + hw * 0.95, 200 - hw, hcy + hw * 0.95, 200 - hw, hcy - 6);
	fillStroke(g, st.skin, 8);
	if (st.hairKind === 'tuft') {
		const b = p.hair * 34;
		// spikes first, then a cap clipped to the head so no skin shows between them
		g.beginPath();
		g.moveTo(200 - 62, hcy - 50);
		g.quadraticCurveTo(200 - 50 + b, hcy - 128, 200 - 14 + b * 1.2, hcy - 80);
		g.quadraticCurveTo(200 + 6 + b, hcy - 140, 200 + 28 + b * 1.2, hcy - 80);
		g.quadraticCurveTo(200 + 52 + b, hcy - 122, 200 + 66, hcy - 46);
		g.closePath();
		fillStroke(g, st.hair, 7);
		g.save();
		g.beginPath();
		g.moveTo(200 - hw, hcy - 6);
		g.bezierCurveTo(200 - hw, hcy - hw * 1.25, 200 + hw, hcy - hw * 1.25, 200 + hw, hcy - 6);
		g.closePath();
		g.clip();
		g.beginPath();
		g.ellipse(200, hcy - 96, hw * 1.05, 52, 0, 0, 7);
		fillStroke(g, st.hair, 7);
		g.restore();
		g.beginPath();
		g.moveTo(200 - hw, hcy - 6);
		g.bezierCurveTo(200 - hw, hcy - hw * 1.25, 200 + hw, hcy - hw * 1.25, 200 + hw, hcy - 6);
		stroke(g, 8);
	} else if (st.hairKind === 'cap') {
		g.beginPath();
		g.moveTo(200 - hw - 2, hcy - 34);
		g.quadraticCurveTo(200, hcy - 150, 200 + hw + 2, hcy - 34);
		g.lineTo(200 + hw + 44, hcy - 28);
		g.lineTo(200 + hw + 44, hcy - 16);
		g.lineTo(200 - hw - 2, hcy - 22);
		g.closePath();
		fillStroke(g, st.hair, 7);
	} else if (st.hairKind === 'long' || st.hairKind === 'bun') {
		g.beginPath();
		g.moveTo(200 - hw + 2, hcy - 26);
		g.quadraticCurveTo(200 - 10, hcy - 108, 200 + hw - 2, hcy - 26);
		g.quadraticCurveTo(200 + 10, hcy - 64, 200 - hw + 2, hcy - 26);
		fillStroke(g, st.hair, 7);
	}
	face(g, 200, hcy, hw, p, st.goggles);
	arm(p.armR, 200 + 48, p.holdR);
	g.restore();
};

/** Cat, design canvas 400 x 300, paws at y = 285. mode: sit | scared | fly */
export const drawCat = (g: G, mode: 'sit' | 'scared' | 'fly', tail: number) => {
	const fur = '#9aa0ad';
	const sc = mode !== 'sit';
	// tail
	g.beginPath();
	g.moveTo(110, 230);
	g.bezierCurveTo(40, 230, 40 + tail * 30, 130, 78 + tail * 40, 96);
	stroke(g, sc ? 34 : 22);
	g.beginPath();
	g.moveTo(110, 230);
	g.bezierCurveTo(40, 230, 40 + tail * 30, 130, 78 + tail * 40, 96);
	stroke(g, sc ? 22 : 11, fur);
	// legs
	for (const x of [130, 165, 235, 268]) {
		g.beginPath();
		if (mode === 'fly') {
			g.moveTo(x, 235);
			g.lineTo(x + (x < 200 ? -46 : 46), 262);
		} else {
			g.moveTo(x, 230);
			g.lineTo(x, 280);
		}
		stroke(g, 12);
	}
	// body
	g.beginPath();
	g.ellipse(200, 205, 96, sc ? 60 : 52, 0, 0, 7);
	fillStroke(g, fur, 8);
	for (const x of [160, 195, 230]) {
		g.beginPath();
		g.moveTo(x, 156);
		g.lineTo(x + 6, 186);
		stroke(g, 7, '#666b78');
	}
	// head
	const hx = 290;
	const hy = 128;
	for (const s of [-1, 1]) {
		g.beginPath();
		g.moveTo(hx + s * 58, hy - 28);
		g.lineTo(hx + s * 50, hy - 92);
		g.lineTo(hx + s * 14, hy - 56);
		g.closePath();
		fillStroke(g, fur, 8);
	}
	g.beginPath();
	g.ellipse(hx, hy, 70, 60, 0, 0, 7);
	fillStroke(g, fur, 8);
	for (const s of [-1, 1]) {
		g.beginPath();
		if (sc) {
			g.ellipse(hx + s * 28, hy - 4, 17, 20, 0, 0, 7);
			fillStroke(g, '#fff', 5);
			g.beginPath();
			g.ellipse(hx + s * 28, hy - 4, 4, 9, 0, 0, 7);
		} else g.ellipse(hx + s * 28, hy - 2, 7, 10, 0, 0, 7);
		g.fillStyle = INK;
		g.fill();
		for (const k of [-1, 1]) {
			g.beginPath();
			g.moveTo(hx + s * 44, hy + 20 + k * 3);
			g.lineTo(hx + s * 88, hy + 16 + k * 12);
			stroke(g, 3.5);
		}
	}
	g.beginPath();
	g.moveTo(hx - 7, hy + 16);
	g.lineTo(hx + 7, hy + 16);
	g.lineTo(hx, hy + 25);
	g.closePath();
	g.fillStyle = '#ff8fa0';
	g.fill();
	stroke(g, 4);
	if (sc) {
		g.beginPath();
		g.ellipse(hx, hy + 40, 10, 12, 0, 0, 7);
		fillStroke(g, '#7a2233', 5);
	}
};

/** Wave with legs: design canvas 800 x 600, feet at y = 590. */
export const drawWave = (g: G, step: number) => {
	for (const s of [-1, 1]) {
		const x = 400 + s * 120;
		const sw = s * step * 70;
		g.beginPath();
		g.moveTo(x, 420);
		g.quadraticCurveTo(x + sw + 20, 510, x + sw, 575 - Math.max(0, -s * step) * 30);
		stroke(g, 20);
		g.beginPath();
		g.ellipse(x + sw + 26, 580 - Math.max(0, -s * step) * 30, 40, 16, 0, 0, 7);
		g.fillStyle = INK;
		g.fill();
	}
	g.beginPath();
	g.moveTo(30, 470);
	g.bezierCurveTo(60, 200, 300, 20, 560, 40);
	g.bezierCurveTo(700, 50, 780, 150, 770, 250);
	g.bezierCurveTo(740, 190, 650, 170, 610, 250);
	g.bezierCurveTo(580, 330, 700, 400, 780, 470);
	g.closePath();
	fillStroke(g, '#2f8fd6', 12);
	g.beginPath();
	g.moveTo(120, 430);
	g.bezierCurveTo(150, 250, 320, 110, 520, 110);
	stroke(g, 14, '#8fd0f5');
	// foam
	g.beginPath();
	g.moveTo(520, 44);
	for (let i = 0; i < 6; i++) g.arc(560 + i * 38, 60 + i * i * 6.5, 30, 3.6, 0.6);
	fillStroke(g, '#ffffff', 9);
	// face
	for (const s of [0, 1]) {
		g.beginPath();
		g.ellipse(430 + s * 90, 250, 14, 20, 0, 0, 7);
		g.fillStyle = INK;
		g.fill();
		g.beginPath();
		g.moveTo(405 + s * 90, 208 + s * 14);
		g.lineTo(455 + s * 90, 222 - s * 14);
		stroke(g, 10);
	}
	g.beginPath();
	g.moveTo(430, 310);
	g.quadraticCurveTo(480, 350, 530, 305);
	stroke(g, 10);
};

/** Jet airliner, 600 x 240, nose to the right. */
export const drawJet = (g: G) => {
	g.beginPath();
	g.moveTo(70, 108);
	g.lineTo(30, 30);
	g.lineTo(90, 30);
	g.lineTo(160, 104);
	g.closePath();
	fillStroke(g, '#e8473f', 8);
	g.beginPath();
	g.moveTo(40, 120);
	g.quadraticCurveTo(40, 96, 90, 96);
	g.lineTo(480, 96);
	g.quadraticCurveTo(570, 100, 580, 132);
	g.quadraticCurveTo(560, 160, 470, 160);
	g.lineTo(90, 160);
	g.quadraticCurveTo(40, 150, 40, 120);
	fillStroke(g, '#ffffff', 8);
	g.beginPath();
	g.moveTo(250, 140);
	g.lineTo(170, 226);
	g.lineTo(240, 226);
	g.lineTo(370, 140);
	g.closePath();
	fillStroke(g, '#c9d3e6', 8);
	g.beginPath();
	g.roundRect(230, 186, 70, 30, 12);
	fillStroke(g, '#e8473f', 7);
	g.fillStyle = '#2b3a67';
	for (let i = 0; i < 9; i++) g.fillRect(150 + i * 36, 112, 16, 16);
	g.beginPath();
	g.moveTo(520, 106);
	g.lineTo(556, 114);
	g.lineTo(560, 126);
	g.lineTo(516, 126);
	g.closePath();
	g.fill();
};
