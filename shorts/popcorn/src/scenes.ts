import * as THREE from 'three';
import {box, Card, clamp, drawCard, lerp, lightRig, makeCard, makeSky, mesh, NOINK, paintTex, placeCard, rnd, sstep, toon} from './engine';
import {drawBag, drawStick, HERO, INK, PH, Pose, PW, Style} from './toon';

export type Fx =
	| {k: 'speed'; a: number}
	| {k: 'wind'; a: number}
	| {k: 'alarm'; a: number}
	| {k: 'star'; p: THREE.Vector3; age: number; s: number}
	| {k: 'puff'; p: THREE.Vector3; age: number; s: number}
	| {k: 'q'; p: THREE.Vector3; age: number}
	| {k: 'spark'; p: THREE.Vector3; age: number; s: number}
	| {k: 'steam'; p: THREE.Vector3; t: number; s: number}
	| {k: 'kernel'; p: THREE.Vector3; age: number}
	| {k: 'zzz'; p: THREE.Vector3; t: number}
	| {k: 'pour'; a: THREE.Vector3; b: THREE.Vector3}
	| {k: 'sonic'; p: THREE.Vector3; s: number}
	| {k: 'crack'; age: number}
	| {k: 'skid'; p: THREE.Vector3; a: number};

export type SceneApi = {scene: THREE.Scene; update: (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => void};
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pkey = (st: Style, p: Partial<Pose>) => st.hat + st.color + JSON.stringify(p);
const stick = (c: Card, st: Style, p: Partial<Pose>) => drawCard(c, pkey(st, p), (g) => drawStick(g, st, p));
const blink = (t: number, seed: number) => (t + seed * 0.37) % (1.4 + rnd(seed) * 1.1) < 0.13;
const basic = (col: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({color: col});
const glow = (g: THREE.BufferGeometry, col: THREE.ColorRepresentation, p: [number, number, number], parent: THREE.Object3D) => {
	const m = new THREE.Mesh(g, basic(col));
	m.position.set(...p);
	m.layers.set(NOINK);
	parent.add(m);
	return m;
};
const setCol = (m: THREE.Mesh, r: number, g: number, b: number) => (m.material as THREE.MeshBasicMaterial).color.setRGB(r, g, b);
/** a card that shares another card's picture (crowds) */
const twin = (src: Card, parent: THREE.Object3D) => {
	const m = new THREE.Mesh(src.mesh.geometry, src.mesh.material);
	m.layers.set(NOINK);
	parent.add(m);
	return m;
};
const face = (m: THREE.Object3D, cam: THREE.Camera, x: number, y: number, z: number, roll = 0) => {
	m.position.set(x, y, z);
	m.rotation.order = 'YXZ';
	m.rotation.set(0, Math.atan2(cam.position.x - x, cam.position.z - z), roll);
};

// ---------- timeline constants (seconds, from voice/words.json) ----------
export const T_PRESS = 1.05;
export const T_OUT1 = 3.4; // "lights would go out"
export const T_DARK1_END = 5.6;
export const T_ALLPRESS = 11.78;
export const T_DRYER = 14.9;
export const T_COMBINED = 20.3;
export const T_JUMP = 32.15;
export const T_ALARM = 39.15;
export const T_PULL = 41.55;
export const T_CITY = 42.75;
export const T_YOURS = 45.38;
export const T_GAME_END = 51.4;
export const T_ZERO = 56.6;
export const homeLit = (t: number) => !((t >= T_OUT1 && t < T_DARK1_END) || t >= T_YOURS);

// ---------- shared builders ----------
const makeHouse = (wall: string, roof: string, seed: number, simple = false) => {
	const g = new THREE.Group();
	const w = 8;
	const h = 4.4;
	const d = 7;
	box(w, h, d, toon(0, paintTex(wall, 'brick', [3, 2], seed)), [0, h / 2, 0], g);
	const tri = new THREE.Shape();
	tri.moveTo(-w / 2 - 0.5, 0);
	tri.lineTo(w / 2 + 0.5, 0);
	tri.lineTo(0, 2.8);
	tri.closePath();
	const rg = new THREE.ExtrudeGeometry(tri, {depth: d + 0.8, bevelEnabled: false});
	rg.translate(0, 0, -(d + 0.8) / 2);
	mesh(rg, toon(0, paintTex(roof, 'roof', [0.4, 0.4], seed)), [0, h, 0], g);
	if (!simple) box(0.9, 1.9, 0.9, toon('#9c5b4a'), [w * 0.28, h + 1.8, -1], g);
	box(1.2, 2.1, 0.15, toon('#7a4a2a'), [0, 1.05, d / 2 + 0.05], g);
	const win = glow(new THREE.PlaneGeometry(1.7, 1.5), '#ffd766', [2.4, 2.4, d / 2 + 0.12], g);
	const winB = glow(new THREE.PlaneGeometry(1.7, 1.5), '#ffd766', [-2.4, 2.4, d / 2 + 0.12], g);
	winB.material = win.material;
	for (const x of [-2.4, 2.4]) box(2.0, 1.8, 0.1, toon('#fff7e6'), [x, 2.4, d / 2 + 0.03], g);
	const win2 = glow(new THREE.PlaneGeometry(1.4, 1.3), '#ffd766', [w / 2 + 0.06, 2.4, 0.5], g);
	win2.rotation.y = Math.PI / 2;
	win2.material = win.material;
	// warm light spilling on the lawn (reads from above)
	const spill = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), new THREE.MeshBasicMaterial({color: '#ffb840', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false}));
	spill.rotation.x = -Math.PI / 2;
	spill.position.set(0, 0.05, d / 2 + 1.9);
	spill.layers.set(NOINK);
	g.add(spill);
	win.userData.spill = spill;
	return {g, win};
};
const makeTree = (seed: number, s = 1) => {
	const g = new THREE.Group();
	mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 2.6 * s, 7), toon('#7a4b2c'), [0, 1.3 * s, 0], g);
	const leaf = toon(0, paintTex(['#3fae4c', '#2f9a55', '#58b53f'][seed % 3], 'grass', [2, 2], seed));
	for (let i = 0; i < 3; i++) mesh(new THREE.IcosahedronGeometry((1.5 - i * 0.2) * s, 1), leaf, [(rnd(seed + i) - 0.5) * 1.4 * s, (3 + i * 0.8) * s, (rnd(seed + i * 5) - 0.5) * 1.2 * s], g);
	return g;
};

// =====================================================================================
// KITCHEN
// =====================================================================================
export const buildKitchen = (): SceneApi => {
	const scene = new THREE.Scene();
	const sky = makeSky(scene, '#1c2a6e', '#f29a6b');
	const rig = lightRig(scene, V3(0.35, 0.95, 0.6), '#ffd9a0', 1.2, '#9aa8ff', '#6a4fa8', 0.5, 9);
	const room = new THREE.Group();
	scene.add(room);
	const lawn = mesh(new THREE.PlaneGeometry(300, 300), toon('#3f8f4e'), [0, -0.22, 0], scene);
	lawn.rotation.x = -Math.PI / 2;
	box(8, 0.2, 7, toon(0, paintTex('#d99a55', 'plank', [3, 4], 2)), [0, -0.1, 0], room).castShadow = false;
	box(8, 3.4, 0.2, toon(0, paintTex('#f6dfae', 'plain', [2, 1], 5)), [0, 1.7, -3.6], room);
	box(8, 1.0, 0.24, toon(0, paintTex('#5fb7a8', 'tile', [8, 1], 6)), [0, 1.45, -3.56], room);
	box(0.2, 3.4, 7, toon(0, paintTex('#f0cf94', 'plain', [2, 1], 7)), [-4.1, 1.7, 0], room);
	box(0.2, 3.4, 7, toon(0, paintTex('#f0cf94', 'plain', [2, 1], 8)), [4.1, 1.7, 0], room);
	// window (dusk / moon)
	const wq = glow(new THREE.PlaneGeometry(1.9, 1.5), '#ffffff', [2.6, 2.15, -3.43], room);
	for (const [w, h, x, y] of [[2.2, 0.14, 2.6, 2.95], [2.2, 0.14, 2.6, 1.35], [0.14, 1.7, 1.55, 2.15], [0.14, 1.7, 3.65, 2.15], [0.08, 1.6, 2.6, 2.15], [2.0, 0.08, 2.6, 2.15]] as number[][]) box(w, h, 0.16, toon('#fffaf0'), [x, y, -3.44], room);
	const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({color: '#ffcf70', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false}));
	pool.rotation.x = -Math.PI / 2;
	pool.position.set(1.9, 0.02, -0.9);
	pool.layers.set(NOINK);
	room.add(pool);
	// counter
	const cab = toon(0, paintTex('#4f8fd0', 'tile', [4, 1], 9));
	box(5.2, 0.9, 0.75, cab, [-1.2, 0.45, -3.1], room);
	box(5.3, 0.1, 0.85, toon('#fff4dc'), [-1.2, 0.95, -3.08], room);
	const fridge = new THREE.Group();
	box(0.95, 2.0, 0.8, toon('#bfe6ee'), [0, 1.0, 0], fridge);
	box(0.06, 0.5, 0.06, toon('#6a7a88'), [0.32, 1.35, 0.43], fridge);
	box(0.97, 0.04, 0.82, toon('#6a7a88'), [0, 1.25, 0], fridge);
	fridge.position.set(3.3, 0, -3.0);
	room.add(fridge);
	// microwave
	const MX = -0.35;
	const mw = new THREE.Group();
	box(0.95, 0.56, 0.5, toon('#e9ecf2'), [0, 0.28, 0], mw);
	box(0.2, 0.5, 0.02, toon('#3a3f52'), [0.34, 0.28, 0.255], mw);
	const door = glow(new THREE.PlaneGeometry(0.62, 0.42), '#221a2e', [-0.1, 0.28, 0.258], mw);
	box(0.66, 0.46, 0.015, toon('#2a2530'), [-0.1, 0.28, 0.25], mw);
	const led = glow(new THREE.PlaneGeometry(0.13, 0.07), '#30ff70', [0.34, 0.44, 0.27], mw);
	const btn = glow(new THREE.CircleGeometry(0.045, 16), '#ff5a4a', [0.34, 0.14, 0.27], mw);
	mw.position.set(MX, 1.0, -3.05);
	room.add(mw);
	const bag = makeCard(mw, 120, 120, 0.3, false);
	drawCard(bag, 'b', (g) => drawBag(g, 60, 60, 0.95, 0));
	bag.mesh.position.set(-0.1, 0.13, 0.262);
	// TV on the wall
	const tvc = document.createElement('canvas');
	tvc.width = 320;
	tvc.height = 200;
	const tg = tvc.getContext('2d')!;
	const tvTex = new THREE.CanvasTexture(tvc);
	tvTex.colorSpace = THREE.SRGBColorSpace;
	box(1.9, 1.2, 0.1, toon('#2a2530'), [-2.5, 2.25, -3.45], room);
	const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 1.04), new THREE.MeshBasicMaterial({map: tvTex}));
	tv.position.set(-2.5, 2.25, -3.39);
	tv.layers.set(NOINK);
	room.add(tv);
	let tvKey = -1;
	const drawTv = (t: number) => {
		const k = Math.floor(t * 10);
		if (k === tvKey) return;
		tvKey = k;
		tg.fillStyle = '#2f9a48';
		tg.fillRect(0, 0, 320, 200);
		tg.fillStyle = '#3fb65a';
		for (let i = 0; i < 6; i += 2) tg.fillRect(i * 54, 0, 54, 200);
		tg.strokeStyle = '#fff';
		tg.lineWidth = 4;
		for (let i = 1; i < 6; i++) {
			tg.beginPath();
			tg.moveTo(i * 54, 0);
			tg.lineTo(i * 54, 200);
			tg.stroke();
		}
		const bx = 160 + Math.sin(t * 2.2) * 110;
		const by = 100 - Math.abs(Math.sin(t * 4.4)) * 60;
		tg.fillStyle = '#7a4420';
		tg.beginPath();
		tg.ellipse(bx, by, 20, 12, t * 6, 0, 7);
		tg.fill();
		tg.lineWidth = 5;
		tg.strokeStyle = INK;
		tg.stroke();
		tvTex.needsUpdate = true;
	};
	// ceiling lamp
	box(0.04, 0.8, 0.04, toon('#2a2530'), [0.4, 3.0, -1.2], room);
	const lamp = glow(new THREE.ConeGeometry(0.42, 0.34, 18, 1, true), '#fff0c0', [0.4, 2.5, -1.2], room);
	(lamp.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
	const rug = new THREE.Mesh(new THREE.CircleGeometry(1.3, 28), toon('#7c5fd0'));
	rug.rotation.x = -Math.PI / 2;
	rug.position.set(0.6, 0.012, 0.9);
	rug.receiveShadow = true;
	room.add(rug);

	const hero = makeCard(scene, PW, PH, 1.8);
	const mia = makeCard(scene, PW, PH, 1.72);
	const MIA: Style = {hat: 'bun', color: '#e8709a', scale: 1};
	const tint = new THREE.Color();

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const lit = homeLit(t);
		const torch = t > 46 && t < 48.1;
		// light state
		rig.sun.intensity = (lit ? 1.2 : 0.07) * Math.PI;
		rig.hemi.intensity = (lit ? 0.5 : 0.2) * Math.PI;
		(lamp.material as THREE.MeshBasicMaterial).color.setRGB(...((lit ? [1.9, 1.6, 1.0] : [0.16, 0.16, 0.26]) as [number, number, number]));
		setCol(wq, ...((lit ? [1.0, 0.62, 0.5] : [0.3, 0.42, 0.85]) as [number, number, number]));
		(pool.material as THREE.MeshBasicMaterial).color.set(lit ? '#ffcf70' : '#5f7fe0');
		(pool.material as THREE.MeshBasicMaterial).opacity = lit ? 0.28 : 0.5;
		(sky.uniforms.top.value as THREE.Color).set(lit ? '#1c2a6e' : '#0a0e30');
		tint.setRGB(...((lit ? [1.0, 0.94, 0.84] : torch ? [1.0, 0.92, 0.66] : [0.42, 0.5, 0.86]) as [number, number, number]));
		// microwave + tv
		const mwOn = lit && t >= T_PRESS + 0.05 && !(t >= 5.6 && t < 11.8);
		setCol(door, ...((mwOn ? [1.7, 1.25, 0.5] : [0.1, 0.08, 0.14]) as [number, number, number]));
		setCol(led, ...((lit ? [0.2, 1.4, 0.5] : [0.03, 0.08, 0.05]) as [number, number, number]));
		setCol(btn, ...((lit ? [1.3, 0.4, 0.3] : [0.1, 0.04, 0.04]) as [number, number, number]));
		bag.mesh.rotation.z = mwOn ? Math.sin(t * 2.4) * 0.35 : 0.12;
		(bag.mesh.material as THREE.MeshBasicMaterial).color.setScalar(mwOn ? 1 : lit ? 0.5 : 0.2);
		if (lit) drawTv(t);
		setCol(tv, ...((lit ? [1.2, 1.2, 1.2] : [0.03, 0.03, 0.05]) as [number, number, number]));
		// --- hero
		const bl = blink(t, 1);
		let x = 0.55;
		let z = -2.25;
		let p: Partial<Pose> = {};
		if (t < 2.4) {
			const pr = t > T_PRESS - 0.25 && t < T_PRESS + 0.25;
			p = {armL: pr ? [-1.45, -0.25] : [-0.9, -0.9], armR: [0.3, 0.2], holdR: 'none', eyes: bl ? 'closed' : 'happy', mouth: 'grin', look: -0.8};
			if (t > T_PRESS && t < T_PRESS + 0.4) fx.push({k: 'spark', p: V3(MX + 0.34, 1.16, -2.78), age: (t - T_PRESS) * 30, s: 0.3});
		} else if (t < T_DARK1_END) {
			p = {armL: [-0.2, -0.1], armR: [0.2, 0.1], eyes: 'wide', mouth: 'flat', look: -0.9, brow: -0.6};
		} else if (t < 12) {
			// watching the game
			x = -1.9;
			z = -1.6;
			const cheer = Math.sin(t * 9) * 0.25;
			p = {armL: [-2.5 + cheer, -0.4], armR: [1.0, 1.5], holdR: 'bagflat', eyes: bl ? 'closed' : 'happy', mouth: 'grin', legs: Math.sin(t * 9) * 0.2};
		} else if (t < 21) {
			p = {armL: [-0.3, -0.2], armR: [0.3, 0.2], eyes: bl ? 'closed' : 'dot', mouth: 'smile', look: t > 14.7 ? 0.9 : -0.8};
		} else if (t < 30) {
			const th = t > 22.2;
			p = {armR: th ? [0.5, 2.5] : [0.3, 0.2], armL: [-0.3, -0.2], eyes: bl ? 'closed' : th ? 'half' : 'dot', mouth: th ? 'flat' : 'o', look: th ? 0.5 : 0, brow: th ? -0.5 : 0};
			if (t > 22.15 && t < 23.85) fx.push({k: 'q', p: V3(x + 0.8, 2.15, z), age: (t - 22.15) * 30});
		} else if (t < 50) {
			p = {armR: [0.95, 1.35], holdR: 'torch', armL: [-0.25, -0.15], eyes: 'wide', mouth: t > 47.1 ? 'o' : 'flat', brow: -0.4};
		} else {
			// sitting in the dark with the bag
			x = 0.9;
			z = -0.7;
			const tip = sstep(T_ZERO - 0.25, T_ZERO + 0.05, t);
			p = {mode: 'floor', armR: [1.25 + tip * 0.2, 0.5 + tip * 0.5], holdR: 'bagflat', armL: [-0.5, -0.9], eyes: bl ? 'closed' : 'half', mouth: 'flat', look: tip * 0.6};
			if (t > T_ZERO) for (let i = 0; i < 3; i++) fx.push({k: 'kernel', p: V3(x + 0.5 + i * 0.07, 0.62, z + 0.05), age: (t - T_ZERO - i * 0.09) * 30});
		}
		stick(hero, HERO, p);
		placeCard(hero, cam, x, 0, z, 0, tint);
		// --- Mia with the hair dryer
		const md = t > T_DRYER - 0.2 && t < 16;
		mia.mesh.visible = md;
		if (mia.blob) mia.blob.visible = md;
		if (md) {
			const pm: Partial<Pose> = {armR: [0.9, 2.2], holdR: 'dryer', armL: [-0.3, -0.2], eyes: blink(t, 4) ? 'closed' : 'happy', mouth: 'smile', lean: Math.sin(t * 12) * 0.02};
			stick(mia, MIA, pm);
			placeCard(mia, cam, 2.3, 0, -1.9, 0, tint);
			fx.push({k: 'wind', a: 0.3});
		}
	};
	return {scene, update};
};

// =====================================================================================
// NEIGHBOURHOOD (dusk)
// =====================================================================================
export const buildStreet = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#1a2a78', '#ff9a66');
	scene.fog = new THREE.Fog('#b9708a', 60, 300);
	lightRig(scene, V3(-0.6, 0.35, 0.5), '#ffb37a', 1.1, '#7f8cff', '#4a3a9c', 0.5, 80);
	const ground = mesh(new THREE.PlaneGeometry(700, 700), toon(0, paintTex('#4e9f55', 'grass', [110, 110], 3)), [0, 0, 0], scene);
	ground.rotation.x = -Math.PI / 2;
	ground.castShadow = false;
	const walls = ['#8fc7e8', '#f6b6c8', '#ffe08a', '#c8e6a0', '#f3c9a0', '#d6c1f0'];
	const roofs = ['#4a6fb0', '#b0483e', '#7a5a9c', '#3f8f6a', '#c07030', '#5a5f78'];
	const houses: {x: number; z: number; win: THREE.Mesh; home: boolean}[] = [];
	for (let r = 0; r < 7; r++) {
		box(700, 0.06, 4.5, toon('#5d5b6e'), [0, 0.03, 7.2 - r * 14], scene).castShadow = false;
		for (let c = -6; c <= 6; c++) {
			const home = r === 0 && c === 0;
			const k = (r * 13 + c + 60) % 6;
			const h = makeHouse(home ? '#fff0d0' : walls[k], home ? '#e0523c' : roofs[(k + r) % 6], r * 13 + c + 70, r > 1);
			const x = c * 12 + (r % 2) * 3;
			h.g.position.set(x, 0, -r * 14);
			scene.add(h.g);
			houses.push({x, z: -r * 14, win: h.win, home});
			if (r < 3 && c % 2 === 0) {
				const tr = makeTree(r * 7 + c + 20, 0.9);
				tr.position.set(x + 6, 0, -r * 14 + 2);
				scene.add(tr);
			}
		}
	}
	const lamps: THREE.Mesh[] = [];
	for (let i = -5; i <= 5; i++) {
		mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 6), toon('#3a3550'), [i * 12 + 6, 2, 5.2], scene);
		lamps.push(glow(new THREE.SphereGeometry(0.32, 10, 8), '#ffe9a0', [i * 12 + 6, 4.1, 5.2], scene));
	}
	const update = (t: number, _cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const pressed = t >= T_ALLPRESS && t < 20;
		const kettles = t > 50;
		houses.forEach((h, i) => {
			let on = true;
			if (t < T_DARK1_END) on = t < T_OUT1 + ((h.x + 75) / 150) * 0.5 + (-h.z / 90) * 0.1;
			else if (t > 44 && !kettles) on = h.home && t < T_YOURS;
			const b = pressed ? 1.5 + Math.sin(t * 20 + i) * 0.15 : 1;
			if (on) setCol(h.win, 1.7 * b, 1.3 * b, 0.5 * b);
			else setCol(h.win, 0.05, 0.06, 0.14);
			(h.win.userData.spill as THREE.Mesh).visible = on;
			if (pressed && h.z > -45) {
				const age = (t - T_ALLPRESS - rnd(i) * 0.25) * 30;
				if (age >= 0 && age < 14) fx.push({k: 'spark', p: V3(h.x, 8.6, h.z), age, s: 2.2});
			}
			if (kettles && h.z > -45 && t > 51.95 + rnd(i * 3) * 0.9) fx.push({k: 'steam', p: V3(h.x + 1.5, 7.5, h.z), t: t + rnd(i), s: 9});
		});
		lamps.forEach((l, i) => {
			const on = t < T_DARK1_END ? t < T_OUT1 + ((i * 12 + 75) / 150) * 0.5 : !(t > 44 && !kettles);
			if (on) setCol(l, 2, 1.7, 1.0);
			else setCol(l, 0.08, 0.08, 0.14);
		});
		if (t >= T_YOURS && t < T_YOURS + 0.3) fx.push({k: 'spark', p: V3(2.4, 2.4, 3.6), age: (t - T_YOURS) * 30, s: 1.2});
	};
	return {scene, update};
};

// =====================================================================================
// POWER PLANT (sunset, then night with pulses running down the line)
// =====================================================================================
export const LINE: [number, number, number][] = [[-12, 13, -10], [6, 13, 2], [24, 13, 12], [42, 13, 20], [58, 4.2, 25.5]];
export const linePos = (u: number) => {
	const f = clamp(u) * (LINE.length - 1);
	const i = Math.min(LINE.length - 2, Math.floor(f));
	const k = f - i;
	const a = LINE[i];
	const b = LINE[i + 1];
	const sag = i < LINE.length - 2 ? Math.sin(k * Math.PI) * 1.6 : 0;
	return V3(lerp(a[0], b[0], k), lerp(a[1], b[1], k) - sag, lerp(a[2], b[2], k));
};
export const pulseU = (t: number) => sstep(25.9, 28.35, t);

export const buildPlant = (): SceneApi => {
	const scene = new THREE.Scene();
	const sky = makeSky(scene, '#2a2f8c', '#ffa25e', true);
	scene.fog = new THREE.Fog('#c9787a', 70, 330);
	const rig = lightRig(scene, V3(-0.55, 0.3, 0.7), '#ffb070', 1.2, '#8b8cff', '#5a3fa0', 0.5, 70);
	const tint = new THREE.Color();
	const ground = mesh(new THREE.PlaneGeometry(700, 700), toon(0, paintTex('#5aa85a', 'grass', [110, 110], 5)), [0, 0, 0], scene);
	ground.rotation.x = -Math.PI / 2;
	ground.castShadow = false;
	// cooling towers
	const prof: THREE.Vector2[] = [];
	for (let i = 0; i <= 14; i++) {
		const y = (i / 14) * 24;
		prof.push(new THREE.Vector2(4.6 + Math.pow((y - 15) / 15, 2) * 3.4, y));
	}
	const towerG = new THREE.LatheGeometry(prof, 28);
	const towerM = toon(0, paintTex('#e9e3da', 'plank', [6, 3], 7));
	const towers: THREE.Mesh[] = [];
	const steam: THREE.Mesh[][] = [];
	for (let i = 0; i < 8; i++) {
		const x = -24 + i * 17;
		const tw = mesh(towerG, towerM, [x, 0, -32], scene);
		(tw.material as THREE.Material).side = THREE.DoubleSide;
		towers.push(tw);
		box(9.4, 1.2, 0.3, toon('#e23b3b'), [x, 21, -27.2], scene).visible = false;
		const puffs: THREE.Mesh[] = [];
		for (let k = 0; k < 5; k++) puffs.push(glow(new THREE.SphereGeometry(3.2, 12, 10), '#ffffff', [x, 26, -32], scene));
		steam.push(puffs);
		const dome = mesh(new THREE.SphereGeometry(4.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon('#cfd6e6'), [x + 8.5, 5, -18], scene);
		void dome;
		mesh(new THREE.CylinderGeometry(4.2, 4.2, 5, 20), toon('#cfd6e6'), [x + 8.5, 2.5, -18], scene);
	}
	// pylons + wires
	const steel = toon('#59607a');
	for (let i = 0; i < LINE.length - 1; i++) {
		const [x, y, z] = LINE[i];
		const g = new THREE.Group();
		for (const s of [-1, 1]) {
			const leg = box(0.28, y + 1.5, 0.28, steel, [s * 0.9, (y + 1.5) / 2, 0], g);
			leg.rotation.z = s * 0.07;
		}
		box(5.2, 0.24, 0.24, steel, [0, y, 0], g);
		box(3.6, 0.2, 0.2, steel, [0, y - 2.2, 0], g);
		for (let k = 1; k < 5; k++) box(1.9, 0.14, 0.14, steel, [0, k * 2.4, 0], g).rotation.z = k % 2 ? 0.5 : -0.5;
		g.position.set(x, 0, z);
		g.rotation.y = -0.5;
		scene.add(g);
	}
	const wireM = new THREE.MeshBasicMaterial({color: '#1a1622'});
	for (let i = 0; i < 80; i++) {
		const a = linePos(i / 80);
		const b = linePos((i + 1) / 80);
		const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, a.distanceTo(b), 4), wireM);
		w.position.copy(a).lerp(b, 0.5);
		w.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
		w.layers.set(NOINK);
		scene.add(w);
	}
	const pulses: THREE.Mesh[] = [];
	for (let i = 0; i < 7; i++) pulses.push(glow(new THREE.SphereGeometry(0.42, 12, 10), '#fff3a0', [0, -9, 0], scene));
	const house = makeHouse('#fff0d0', '#e0523c', 3);
	house.g.position.set(60, 0, 28);
	house.g.rotation.y = -0.4;
	scene.add(house.g);
	for (let i = 0; i < 6; i++) {
		const tr = makeTree(i + 5, 1 + rnd(i) * 0.4);
		tr.position.set(i % 2 ? 44 + rnd(i * 3) * 30 : 68 + rnd(i * 3) * 12, 0, i % 2 ? 8 + rnd(i * 7) * 8 : 30 + rnd(i * 7) * 14);
		scene.add(tr);
	}
	for (let i = -4; i < 12; i++) box(0.15, 1.4, 0.15, toon('#8a8fa8'), [i * 4, 0.7, 4.5], scene);
	box(64, 0.1, 0.1, toon('#8a8fa8'), [14, 1.3, 4.5], scene);
	const eng = makeCard(scene, PW, PH, 1.8);
	const ENG: Style = {hat: 'hard', color: '#ffc21f', scale: 1};

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const night = t > 23;
		rig.sun.intensity = (night ? 0.25 : 1.2) * Math.PI;
		rig.sun.color.set(night ? '#8fa0ff' : '#ffb070');
		rig.hemi.intensity = (night ? 0.42 : 0.5) * Math.PI;
		(sky.uniforms.top.value as THREE.Color).set(night ? '#070a2c' : '#2a2f8c');
		(sky.uniforms.hor.value as THREE.Color).set(night ? '#2b2a7a' : '#ffa25e');
		sky.uniforms.stars.value = night ? 1 : 0;
		(scene.fog as THREE.Fog).color.set(night ? '#2b2a7a' : '#c9787a');
		tint.setRGB(...((night ? [0.55, 0.6, 0.95] : [1.0, 0.9, 0.8]) as [number, number, number]));
		const strain = night ? 0 : sstep(T_COMBINED - 0.1, T_COMBINED + 0.2, t);
		towers.forEach((tw, i) => {
			tw.rotation.z = strain * Math.sin(t * 60 + i * 2) * 0.012;
			tw.scale.set(1 + strain * Math.sin(t * 45 + i) * 0.02, 1, 1);
			steam[i].forEach((p, k) => {
				const u = (t * (0.22 + strain * 0.9) + k / 5 + i * 0.13) % 1;
				p.position.set(tw.position.x + Math.sin(u * 5 + i) * 1.5 + u * 6, 24 + u * 22, -32);
				p.scale.setScalar((0.7 + u * 1.6) * (1 + strain * 0.5));
				setCol(p, ...((night ? [0.45, 0.5, 0.85] : [1.15 - u * 0.2, 0.95 - u * 0.2, 0.9 - u * 0.1]) as [number, number, number]));
			});
		});
		setCol(house.win, 1.7, 1.3, 0.5);
		// pulses of power run from the plant to the house (night)
		pulses.forEach((p, i) => {
			if (!night) return void p.position.set(0, -9, 0);
			const u = i === 0 ? pulseU(t) : (t * 0.42 + i / 6) % 1;
			if (i === 0 && t < 25.85) return void p.position.set(0, -9, 0);
			p.position.copy(linePos(u));
			p.scale.setScalar(i === 0 ? 1.7 + Math.sin(t * 30) * 0.2 : 1);
		});
		if (night && pulseU(t) >= 1 && t < 28.6) fx.push({k: 'spark', p: V3(58, 4.2, 25.5), age: (t - 28.35) * 30, s: 2});
		// engineer
		const sc = t > T_COMBINED;
		const p: Partial<Pose> = sc ? {armL: [-2.3, -0.5], armR: [2.3, 0.5], eyes: 'wide', mouth: t > 20.8 ? 'scream' : 'o', brow: -1, sweat: 0.6, legs: Math.sin(t * 30) * 0.2} : {armR: [0.6, 1.9], holdR: 'mug', eyes: blink(t, 3) ? 'closed' : 'happy', mouth: 'smile'};
		stick(eng, ENG, p);
		placeCard(eng, cam, -1.5, 0, 7.5, 0, tint);
		eng.mesh.visible = !night;
		if (eng.blob) eng.blob.visible = !night;
		if (sc && !night) {
			for (let i = 0; i < 4; i++) fx.push({k: 'spark', p: linePos(0.06 + i * 0.07 + ((t * 0.7) % 0.07)), age: ((t * 30 + i * 4) % 12), s: 1.6});
		}
	};
	return {scene, update};
};

// =====================================================================================
// HILL: ten people on one giant bicycle
// =====================================================================================
export const SLOPE = 0.2;
export const hillP = (x: number, y: number, z: number): [number, number, number] => [x * Math.cos(SLOPE) - y * Math.sin(SLOPE), x * Math.sin(SLOPE) + y * Math.cos(SLOPE), z];

export const buildHill = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#141a5c', '#3a3a9a', true);
	scene.fog = new THREE.Fog('#34348c', 40, 220);
	lightRig(scene, V3(-0.4, 0.7, 0.8), '#b8c4ff', 0.9, '#8b8cff', '#4a3f9a', 0.62, 22);
	const tint = new THREE.Color(0.74, 0.78, 1.0);
	const slope = new THREE.Group();
	slope.rotation.z = SLOPE;
	scene.add(slope);
	const gtex = paintTex('#4a9a62', 'grass', [90, 90], 6);
	const ground = mesh(new THREE.PlaneGeometry(600, 600), toon(0, gtex), [0, 0, 0], slope);
	ground.rotation.x = -Math.PI / 2;
	ground.castShadow = false;
	const path = box(600, 0.05, 3.2, toon(0, paintTex('#c9a26a', 'plain', [90, 1], 7)), [0, 0.02, 0], slope);
	path.castShadow = false;
	const moon = glow(new THREE.SphereGeometry(9, 24, 16), '#fff6d8', [-40, 78, -180], scene);
	void moon;
	const props: THREE.Group[] = [];
	for (let i = 0; i < 10; i++) {
		const tr = makeTree(i + 2, 0.8 + rnd(i) * 0.5);
		tr.position.set(0, 0, -5 - rnd(i * 3) * 16);
		slope.add(tr);
		props.push(tr);
	}
	// the bike (static in the world; the ground scrolls under it)
	const bike = new THREE.Group();
	slope.add(bike);
	const red = toon('#e23b3b');
	const dark = toon('#2a2530');
	const wheels: THREE.Mesh[] = [];
	for (const x of [1.25, -9.6]) {
		const w = mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 28), dark, [x, 0.7, 0], bike);
		for (let k = 0; k < 3; k++) box(1.2, 0.04, 0.04, toon('#cfd6e6'), [0, 0, 0], w).rotation.z = (k * Math.PI) / 3;
		wheels.push(w);
	}
	box(10.8, 0.11, 0.11, red, [-4.2, 0.72, 0], bike);
	box(10.2, 0.09, 0.09, red, [-4.3, 1.02, 0], bike).rotation.z = 0.0;
	const N = 10;
	for (let i = 0; i < N; i++) {
		const x = -i * 0.96;
		box(0.07, 0.42, 0.07, red, [x - 0.12, 0.92, 0], bike);
		box(0.32, 0.07, 0.2, dark, [x - 0.12, 1.14, 0], bike);
		box(0.06, 0.5, 0.06, red, [x + 0.42, 0.98, 0], bike);
		box(0.07, 0.07, 0.5, dark, [x + 0.42, 1.24, 0], bike);
	}
	// trailer for the "friends"
	box(3.4, 0.18, 1.5, toon(0, paintTex('#c98a4a', 'plank', [2, 1], 8)), [-12.3, 0.72, 0], bike);
	box(1.2, 0.08, 0.08, red, [-10.3, 0.72, 0], bike);
	for (const z of [-0.8, 0.8]) wheels.push(mesh(new THREE.TorusGeometry(0.45, 0.09, 8, 22), dark, [-12.3, 0.5, z], bike));
	const ENG = (i: number): Style => ({hat: 'hard', color: ['#ffc21f', '#ff8a3c', '#59c08a', '#3f8fe0'][i % 4], scale: 1});
	const riders: Card[] = [];
	for (let i = 0; i < N; i++) riders.push(makeCard(scene, PW, PH, 1.8, false));
	// crowd: four shared pictures
	const cst: Style[] = [{hat: 'none', color: '#fff', scale: 1}, {hat: 'cap', color: '#3f8fe0', scale: 1}, {hat: 'bun', color: '#e8709a', scale: 1}, {hat: 'flat', color: '#59c08a', scale: 1}];
	const src = cst.map(() => makeCard(scene, PW, PH, 1.55, false, 1));
	src.forEach((c, i) => {
		drawCard(c, 'c', (g) => drawStick(g, cst[i], {armL: [-2.4, -0.4], armR: [2.4, 0.4], eyes: 'happy', mouth: 'grin', jump: 0.8}));
		c.mesh.visible = false;
	});
	const NC = 44;
	const crowd: THREE.Mesh[] = [];
	for (let i = 0; i < NC; i++) crowd.push(twin(src[i % 4], scene));
	let ph = 0;
	let lastT = -1;
	const speedAt = (t: number) => 2.6 * (1 - 0.86 * sstep(T_JUMP + 0.2, 34.6, t));
	const phaseAt = (t: number) => {
		// integrate the pedal speed (deterministic for any frame)
		let s = 0;
		const n = Math.max(1, Math.round((t - 28) * 30));
		for (let i = 0; i < n; i++) s += speedAt(28 + ((t - 28) * (i + 0.5)) / n) * ((t - 28) / n);
		return s;
	};
	const update = (t: number, cam: THREE.PerspectiveCamera, _fx: Fx[]) => {
		if (t !== lastT) {
			ph = phaseAt(t);
			lastT = t;
		}
		const dist = ph;
		gtex.offset.x = (dist / 600) * 90;
		props.forEach((p, i) => (p.position.x = ((((i * 9.7 - dist) % 90) + 90) % 90) - 60));
		wheels.forEach((w, i) => (w.rotation.z = -dist / (i < 2 ? 0.62 : 0.45)));
		const strain = sstep(T_JUMP + 0.3, 34.3, t);
		const squash = sstep(T_JUMP + 0.2, T_JUMP + 1.4, t);
		bike.position.y = -squash * 0.08 + Math.sin(t * 40) * 0.008 * strain;
		riders.forEach((c, i) => {
			const p: Partial<Pose> = {mode: 'ride', phase: dist * 2.2 + i * 0.5, eyes: strain > 0.4 ? 'closed' : blink(t, i + 2) ? 'closed' : 'happy', mouth: strain > 0.4 ? 'scream' : 'smile', sweat: Math.round(strain * 5) / 5, brow: strain > 0.4 ? 1 : 0};
			p.phase = Math.round((p.phase as number) * 8) / 8;
			stick(c, ENG(i), p);
			const [x, y, z] = hillP(-i * 0.96 - 0.25, 0.16 + bike.position.y, 0);
			face(c.mesh, cam, x, y, z, SLOPE - strain * 0.05);
			(c.mesh.material as THREE.MeshBasicMaterial).color.copy(tint);
		});
		crowd.forEach((m, i) => {
			const t0 = T_JUMP + i * 0.036 + rnd(i * 5) * 0.1;
			const u = clamp((t - t0) / 0.42);
			const layer = Math.floor(i / 9);
			const tx = -13.6 + (i % 9) * 0.36 + rnd(i) * 0.2 + (i > 35 ? 4 + (i - 36) * 0.9 : 0);
			const ty = 0.75 + (i > 35 ? 1.1 : layer * 0.62) + bike.position.y;
			const bounce = u >= 1 ? Math.abs(Math.sin((t - t0 - 0.42) * 14)) * 0.12 * Math.exp(-(t - t0 - 0.42) * 4) : 0;
			const [x, y, z] = hillP(tx - (1 - u) * 3, ty + (1 - u * u) * 13 + bounce, (rnd(i * 7) - 0.5) * 1.0);
			face(m, cam, x, y, z, SLOPE + (rnd(i * 3) - 0.5) * 0.5 + (1 - u) * 2);
			m.visible = t > t0;
		});
	};
	return {scene, update};
};

// =====================================================================================
// CONTROL ROOM (heartbeat, alarm, giant switch; later: British engineers watching soccer)
// =====================================================================================
export const buildControl = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#0a0e30', '#0a0e30');
	const rig = lightRig(scene, V3(0.2, 0.9, 0.7), '#b9c8ff', 0.8, '#8b9cff', '#3a3a8a', 0.55, 9);
	const tint = new THREE.Color();
	const room = new THREE.Group();
	scene.add(room);
	box(11, 0.2, 8, toon(0, paintTex('#3a4270', 'tile', [6, 4], 3)), [0, -0.1, 0], room).castShadow = false;
	box(11, 5, 0.2, toon(0, paintTex('#2f3a78', 'plain', [2, 1], 4)), [0, 2.5, -3.6], room);
	box(0.2, 5, 8, toon('#2a3470'), [-5.5, 2.5, 0], room);
	box(0.2, 5, 8, toon('#2a3470'), [5.5, 2.5, 0], room);
	// big wall screen
	const sc = document.createElement('canvas');
	sc.width = 512;
	sc.height = 288;
	const sg = sc.getContext('2d')!;
	const sTex = new THREE.CanvasTexture(sc);
	sTex.colorSpace = THREE.SRGBColorSpace;
	box(5.5, 3.2, 0.14, toon('#1a1f3a'), [0, 3.0, -3.45], room);
	const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.92), new THREE.MeshBasicMaterial({map: sTex}));
	screen.position.set(0, 3.0, -3.37);
	screen.layers.set(NOINK);
	room.add(screen);
	let sKey = '';
	const drawScreen = (t: number) => {
		const brit = t > 47;
		const key = Math.floor(t * 30) + (brit ? 'b' : 'e');
		if (key === sKey) return;
		sKey = key;
		if (brit) {
			// soccer on TV
			sg.fillStyle = '#2f9a48';
			sg.fillRect(0, 0, 512, 288);
			sg.fillStyle = '#3fb65a';
			for (let i = 0; i < 8; i += 2) sg.fillRect(i * 64, 0, 64, 288);
			sg.strokeStyle = '#fff';
			sg.lineWidth = 6;
			sg.strokeRect(14, 14, 484, 260);
			sg.beginPath();
			sg.moveTo(256, 14);
			sg.lineTo(256, 274);
			sg.stroke();
			sg.beginPath();
			sg.arc(256, 144, 46, 0, 7);
			sg.stroke();
			sg.strokeRect(14, 84, 70, 120);
			sg.strokeRect(428, 84, 70, 120);
			const over = t > T_GAME_END;
			const tt = over ? T_GAME_END : t;
			for (let i = 0; i < 8; i++) {
				const x = 256 + Math.sin(tt * (0.7 + i * 0.13) + i * 2) * 190;
				const y = 144 + Math.cos(tt * (0.9 + i * 0.1) + i) * 96 - (over ? Math.abs(Math.sin(t * 10 + i)) * 14 : 0);
				sg.fillStyle = i % 2 ? '#e23b3b' : '#ffffff';
				sg.beginPath();
				sg.arc(x, y, 11, 0, 7);
				sg.fill();
				sg.lineWidth = 4;
				sg.strokeStyle = INK;
				sg.stroke();
			}
			sg.fillStyle = '#fff';
			sg.beginPath();
			sg.arc(256 + Math.sin(tt * 2.3) * 150, 144 + Math.cos(tt * 3.1) * 70, 8, 0, 7);
			sg.fill();
			sg.stroke();
		} else {
			// heartbeat of the grid
			const alarm = t > T_ALARM;
			const slow = sstep(38.0, 39.1, t);
			sg.fillStyle = alarm && Math.floor(t * 6) % 2 ? '#3a0a14' : '#081428';
			sg.fillRect(0, 0, 512, 288);
			sg.strokeStyle = 'rgba(120,180,255,0.18)';
			sg.lineWidth = 2;
			for (let i = 1; i < 12; i++) {
				sg.beginPath();
				sg.moveTo(i * 43, 0);
				sg.lineTo(i * 43, 288);
				sg.moveTo(0, i * 43);
				sg.lineTo(512, i * 43);
				sg.stroke();
			}
			sg.strokeStyle = alarm ? '#ff4a4a' : '#4dff8a';
			sg.lineWidth = 9;
			sg.lineJoin = 'round';
			sg.beginPath();
			const per = 92 * (1 + slow * 0.55);
			const off = (t * 150) % per;
			for (let x = 0; x <= 512; x += 4) {
				const u = (((x + off) % per) + per) % per / per;
				let y = 150;
				if (u > 0.42 && u < 0.5) y -= ((u - 0.42) / 0.08) * 92 * (1 - slow * 0.45);
				else if (u >= 0.5 && u < 0.58) y += (1 - (u - 0.5) / 0.08) * 150 - 92 * (1 - (u - 0.5) / 0.08);
				else if (u >= 0.58 && u < 0.64) y += (1 - (u - 0.58) / 0.06) * 30;
				if (x === 0) sg.moveTo(x, y);
				else sg.lineTo(x, y);
			}
			sg.stroke();
			// frequency dial
			sg.lineWidth = 8;
			sg.strokeStyle = '#cfe0ff';
			sg.beginPath();
			sg.arc(440, 250, 52, Math.PI, 0);
			sg.stroke();
			sg.strokeStyle = '#ff4a4a';
			sg.beginPath();
			sg.arc(440, 250, 52, Math.PI, Math.PI * 1.28);
			sg.stroke();
			const na = Math.PI * 1.5 - slow * 0.75 + Math.sin(t * 30) * 0.03 * slow;
			sg.strokeStyle = '#fff';
			sg.beginPath();
			sg.moveTo(440, 250);
			sg.lineTo(440 + Math.cos(na) * 46, 250 + Math.sin(na) * 46);
			sg.stroke();
		}
		sTex.needsUpdate = true;
	};
	// desks
	const mons: THREE.Mesh[] = [];
	for (const x of [-2.1, 0, 2.1]) {
		box(1.7, 0.85, 1.0, toon(0, paintTex('#55609a', 'plain', [1, 1], 5)), [x, 0.425, -0.3], room);
		box(1.8, 0.08, 1.1, toon('#aab4dc'), [x, 0.89, -0.3], room);
		box(0.9, 0.6, 0.08, toon('#1a1f3a'), [x - 0.4, 1.3, -0.5], room);
		mons.push(glow(new THREE.PlaneGeometry(0.8, 0.5), '#7fd0ff', [x - 0.4, 1.3, -0.455], room));
	}
	const teapot = new THREE.Group();
	mesh(new THREE.SphereGeometry(0.2, 14, 10), toon('#e8709a'), [0, 0.18, 0], teapot);
	mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.26, 8), toon('#e8709a'), [0.24, 0.22, 0], teapot).rotation.z = -0.9;
	teapot.position.set(0.55, 0.93, -0.1);
	room.add(teapot);
	// beacons
	const beacons = [-4.6, 4.6].map((x) => glow(new THREE.SphereGeometry(0.28, 12, 10), '#ff3030', [x, 4.4, -3.3], room));
	// giant knife switch on the right wall
	box(0.12, 2.6, 1.5, toon('#cfd6e6'), [5.36, 2.0, 0.4], room);
	const lever = new THREE.Group();
	box(0.16, 1.9, 0.16, toon('#e23b3b'), [0, 0.95, 0], lever);
	mesh(new THREE.SphereGeometry(0.2, 12, 10), toon('#2a2530'), [0, 1.95, 0], lever);
	lever.position.set(5.15, 1.3, 0.4);
	room.add(lever);
	for (const y of [1.3, 3.0]) box(0.2, 0.22, 0.5, toon('#ffc21f'), [5.25, y, 0.4], room);
	const ops = [0, 1, 2].map(() => makeCard(scene, PW, PH, 1.78));
	const stA: Style[] = [{hat: 'headset', color: '#3f8fe0', scale: 1}, {hat: 'headset', color: '#ffc21f', scale: 1}, {hat: 'headset', color: '#59c08a', scale: 1}];
	const stB: Style[] = [{hat: 'flat', color: '#8a6a4a', scale: 1}, {hat: 'headset', color: '#e23b3b', scale: 1}, {hat: 'bun', color: '#f2a04c', scale: 1}];

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const brit = t > 47;
		const alarm = !brit && t > T_ALARM;
		const fl = alarm && Math.floor(t * 6) % 2 === 0;
		drawScreen(t);
		teapot.visible = brit;
		beacons.forEach((b) => setCol(b, ...((fl ? [3, 0.3, 0.3] : [0.3, 0.05, 0.05]) as [number, number, number])));
		rig.hemi.color.set(fl ? '#ff7a7a' : brit ? '#ffe2b0' : '#8b9cff');
		rig.sun.color.set(brit ? '#ffe2b0' : '#b9c8ff');
		tint.setRGB(...((fl ? [1.0, 0.62, 0.62] : brit ? [1.0, 0.94, 0.82] : [0.72, 0.8, 1.0]) as [number, number, number]));
		mons.forEach((m, i) => setCol(m, ...((fl ? [1.6, 0.3, 0.3] : [0.5 + 0.2 * Math.sin(t * 3 + i), 0.85, 1.2]) as [number, number, number])));
		if (alarm) fx.push({k: 'alarm', a: fl ? 0.55 : 0.15});
		const pu = clamp((t - T_PULL) / 0.22);
		lever.rotation.x = brit ? -0.9 : lerp(-0.9, 0.95, pu * pu);
		const st = brit ? stB : stA;
		const worry = !brit && t > 38.2;
		const ended = brit && t > T_GAME_END;
		ops.forEach((c, i) => {
			let x = [-1.35, 0.1, 1.5][i];
			let z = 0.7;
			let y = 0;
			let p: Partial<Pose>;
			const bl = blink(t, i + 6);
			if (brit) {
				p = ended
					? {armL: [-2.3 + Math.sin(t * 30 + i) * 0.3, -0.6], armR: [2.3, 0.6], eyes: 'wide', mouth: 'scream', brow: -1, legs: Math.sin(t * 30 + i) * 0.3}
					: {armR: [0.6, 1.9], holdR: 'mug', armL: [-0.3, -0.2], eyes: bl ? 'closed' : 'happy', mouth: i === 1 ? 'grin' : 'smile', look: 0};
				if (ended) y = Math.abs(Math.sin((t - T_GAME_END) * 9 + i)) * 0.25 * Math.exp(-(t - T_GAME_END) * 1.2);
			} else if (i === 2 && t > 40.1) {
				// runs to the giant switch and hangs on it
				const run = sstep(40.15, 41.3, t);
				x = lerp(1.5, 4.7, run);
				z = lerp(0.7, 0.5, run);
				const hang = t > 41.3;
				y = hang ? 0.55 - pu * 0.5 : Math.abs(Math.sin(t * 20)) * 0.08;
				p = hang ? {armL: [2.6, 0.2], armR: [2.9, 0.1], eyes: 'closed', mouth: 'scream', brow: 1, sweat: 0.6, jump: 0.7} : {armL: [-1 + Math.sin(t * 20), -0.8], armR: [1 - Math.sin(t * 20), 0.8], eyes: 'wide', mouth: 'o', legs: Math.sin(t * 20), look: 0.8, brow: -1};
			} else {
				p = alarm
					? {armL: [-2.4, -0.5 + Math.sin(t * 25 + i) * 0.3], armR: [2.4, 0.5], eyes: 'wide', mouth: 'scream', brow: -1}
					: {armL: [-0.5, -1.2], armR: [0.5, 1.2], eyes: bl ? 'closed' : worry ? 'wide' : 'dot', mouth: worry ? 'o' : 'smile', brow: worry ? -0.6 : 0, look: worry ? 0 : (i - 1) * -0.4};
			}
			stick(c, st[i], p);
			placeCard(c, cam, x, y, z, 0, tint);
		});
		if (t >= T_PULL + 0.2 && t < T_PULL + 0.6) fx.push({k: 'star', p: V3(5.1, 1.2, 0.4), age: (t - T_PULL - 0.2) * 30, s: 0.7});
		if (brit && !ended) fx.push({k: 'steam', p: V3(0.8, 1.25, -0.1), t, s: 1.2});
	};
	return {scene, update};
};

// =====================================================================================
// CITY at night: whole blocks switch off
// =====================================================================================
export const buildCity = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#070a2c', '#2b2a7a', true);
	scene.fog = new THREE.Fog('#2b2a7a', 60, 260);
	lightRig(scene, V3(-0.5, 0.6, 0.6), '#9fb0ff', 0.7, '#7f8cff', '#3a2f8a', 0.5, 60);
	const ground = mesh(new THREE.PlaneGeometry(600, 600), toon('#2a2f5a'), [0, 0, 0], scene);
	ground.rotation.x = -Math.PI / 2;
	glow(new THREE.SphereGeometry(8, 24, 16), '#fff6d8', [-34, 92, -190], scene);
	const winTex = (seed: number, cols: number, rows: number) => {
		const c = document.createElement('canvas');
		c.width = cols * 32;
		c.height = rows * 32;
		const g = c.getContext('2d')!;
		g.fillStyle = '#141838';
		g.fillRect(0, 0, c.width, c.height);
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < cols; x++) {
				g.fillStyle = rnd(seed + x * 7 + y * 13) > 0.25 ? (rnd(seed + x + y * 3) > 0.5 ? '#ffe08a' : '#ffc860') : '#2a2f5a';
				g.fillRect(x * 32 + 7, y * 32 + 8, 18, 18);
			}
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	};
	const cols = ['#4a52a0', '#5a4a9a', '#3f5aa8', '#6a4f9a', '#44609a'];
	const blds: {x: number; face: THREE.Mesh}[] = [];
	let n = 0;
	for (const [z, cnt, sp] of [[-22, 9, 9], [-38, 10, 10], [-56, 11, 11]] as number[][]) {
		for (let i = 0; i < cnt; i++) {
			const w = 6 + rnd(n) * 2.5;
			const h = 14 + rnd(n * 3 + 1) * 26 + (z < -30 ? 8 : 0);
			const x = (i - (cnt - 1) / 2) * sp + (rnd(n * 5) - 0.5) * 2;
			box(w, h, 6, toon(cols[n % 5]), [x, h / 2, z], scene);
			const f = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.92), new THREE.MeshBasicMaterial({map: winTex(n * 11, Math.round(w * 0.7), Math.round(h * 0.6))}));
			f.position.set(x, h / 2, z + 3.06);
			f.layers.set(NOINK);
			scene.add(f);
			blds.push({x, face: f});
			n++;
		}
	}
	const update = (t: number) => {
		blds.forEach((b, i) => {
			const saved = b.x > 24;
			const off = !saved && t > T_CITY + ((b.x + 50) / 74) * 1.75 + rnd(i) * 0.1;
			const k = off ? 0.1 : 1.5 + Math.sin(t * 3 + i) * 0.05;
			setCol(b.face, k, k, k * (off ? 1.6 : 1));
		});
	};
	return {scene, update};
};
