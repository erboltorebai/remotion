import * as THREE from 'three';
import {box, Card, clamp, drawCard, easeOut, lerp, lightRig, makeCard, makeSky, mesh, NOINK, paintTex, placeCard, rnd, sstep, toon} from './engine';
import {DAVE, drawCat, drawJet, drawMug, drawPerson, drawWave, INK, PH, Pose, POSE, PW, Style} from './toon';

export type Fx =
	| {k: 'speed'; a: number}
	| {k: 'wind'; a: number}
	| {k: 'star'; p: THREE.Vector3; age: number; s: number}
	| {k: 'puff'; p: THREE.Vector3; age: number; s: number}
	| {k: 'q'; p: THREE.Vector3; age: number}
	| {k: 'zzz'; p: THREE.Vector3; t: number}
	| {k: 'spark'; p: THREE.Vector3; age: number; s: number}
	| {k: 'steam'; p: THREE.Vector3; t: number}
	| {k: 'pour'; a: THREE.Vector3; b: THREE.Vector3}
	| {k: 'sonic'; p: THREE.Vector3; s: number}
	| {k: 'crack'; age: number}
	| {k: 'skid'; p: THREE.Vector3; a: number};

export type SceneApi = {scene: THREE.Scene; update: (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => void};

const person = (g: CanvasRenderingContext2D, st: Style, p: Partial<Pose>) => drawPerson(g, st, {...POSE, ...p});
const pkey = (p: Partial<Pose>) => JSON.stringify(p);
const blinkAt = (t: number, seed: number) => {
	const period = 1.3 + rnd(seed) * 1.2;
	return (t + seed * 0.37) % period < 0.13;
};
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- shared builders ----------
const holeTex = (fill: string) => {
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 512;
	const g = c.getContext('2d')!;
	g.translate(256, 256);
	g.fillStyle = fill;
	g.strokeStyle = INK;
	g.lineWidth = 12;
	g.lineJoin = 'round';
	g.beginPath();
	// star-fish Dave: head, arms up, legs spread, jagged edge
	const pts: [number, number][] = [
		[-50, -230], [50, -230], [78, -150], [60, -96], [190, -190], [230, -150], [100, -30], [90, 60], [170, 220], [110, 240], [0, 110], [-110, 240], [-170, 220], [-90, 60], [-100, -30], [-230, -150], [-190, -190], [-60, -96], [-78, -150],
	];
	pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
	g.closePath();
	g.fill();
	g.stroke();
	g.lineWidth = 7;
	for (let i = 0; i < 9; i++) {
		const a = i * 0.7 + 0.2;
		g.beginPath();
		g.moveTo(Math.cos(a) * 150, Math.sin(a) * 190);
		g.lineTo(Math.cos(a + 0.1) * 215, Math.sin(a + 0.1) * 240);
		g.lineTo(Math.cos(a - 0.05) * 250, Math.sin(a - 0.05) * 252);
		g.stroke();
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
};
const decal = (tex: THREE.Texture, w: number, h: number, parent: THREE.Object3D) => {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide}));
	m.layers.set(NOINK);
	parent.add(m);
	return m;
};

const makeHouse = (wall: string, roof: string, seed: number, w = 8, h = 4.6, d = 7) => {
	const g = new THREE.Group();
	box(w, h, d, toon(0, paintTex(wall, 'brick', [3, 2], seed)), [0, h / 2, 0], g);
	box(w + 0.3, 0.5, d + 0.3, toon('#8d8a94'), [0, 0.25, 0], g);
	const tri = new THREE.Shape();
	tri.moveTo(-w / 2 - 0.5, 0);
	tri.lineTo(w / 2 + 0.5, 0);
	tri.lineTo(0, 2.9);
	tri.closePath();
	const rg = new THREE.ExtrudeGeometry(tri, {depth: d + 0.8, bevelEnabled: false});
	rg.translate(0, 0, -(d + 0.8) / 2);
	const roofM = mesh(rg, toon(0, paintTex(roof, 'roof', [0.4, 0.4], seed)), [0, h, 0], g);
	roofM.name = 'roof';
	box(0.9, 2, 0.9, toon('#9c5b4a'), [w * 0.28, h + 1.9, -1], g);
	box(1.3, 2.3, 0.15, toon('#7a4a2a'), [-1.6, 1.65, d / 2 + 0.05], g);
	box(1.6, 0.25, 0.8, toon('#b8b5bd'), [-1.6, 0.4, d / 2 + 0.4], g);
	const win = (x: number, y: number) => {
		box(1.7, 1.5, 0.12, toon('#fff7e6'), [x, y, d / 2 + 0.04], g);
		box(1.4, 1.2, 0.14, toon('#35548f', null, '#1c3a70'), [x, y, d / 2 + 0.06], g);
		box(1.9, 0.16, 0.3, toon('#fff7e6'), [x, y - 0.8, d / 2 + 0.1], g);
	};
	win(1.9, 2.5);
	return g;
};

const makeTree = (seed: number, s = 1) => {
	const g = new THREE.Group();
	mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 2.6 * s, 7), toon('#7a4b2c'), [0, 1.3 * s, 0], g);
	const leaf = toon(0, paintTex(['#3fae4c', '#2f9a55', '#58b53f'][seed % 3], 'grass', [2, 2], seed));
	for (let i = 0; i < 4; i++) mesh(new THREE.IcosahedronGeometry((1.5 - i * 0.18) * s, 1), leaf, [(rnd(seed + i) - 0.5) * 1.5 * s, (3 + i * 0.75) * s, (rnd(seed + i * 5) - 0.5) * 1.2 * s], g);
	return g;
};

const cloud = (parent: THREE.Object3D, x: number, y: number, z: number, s: number, seed: number) => {
	const g = new THREE.Group();
	const m = new THREE.MeshBasicMaterial({color: '#ffffff'});
	for (let i = 0; i < 5; i++) {
		const o = new THREE.Mesh(new THREE.SphereGeometry(s * (0.6 + rnd(seed + i) * 0.5), 10, 8), m);
		o.position.set((i - 2) * s * 0.8, rnd(seed + i * 3) * s * 0.4, 0);
		o.scale.y = 0.6;
		o.layers.set(NOINK);
		g.add(o);
	}
	g.position.set(x, y, z);
	parent.add(g);
	return g;
};

// =====================================================================================
// SPACE: globe + "limb" tracking set
// =====================================================================================
const earthTex = () => {
	const c = document.createElement('canvas');
	c.width = 2048;
	c.height = 1024;
	const g = c.getContext('2d')!;
	g.fillStyle = '#2b78d8';
	g.fillRect(0, 0, 2048, 1024);
	for (let i = 0; i < 60; i++) {
		g.fillStyle = i % 2 ? 'rgba(20,40,150,0.10)' : 'rgba(120,210,255,0.10)';
		g.beginPath();
		g.ellipse(rnd(i) * 2048, rnd(i * 3) * 1024, 90 + rnd(i * 7) * 120, 30, 0, 0, 7);
		g.fill();
	}
	const P = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * 2048, ((90 - lat) / 180) * 1024];
	const land = (pts: [number, number][], col: string) => {
		g.beginPath();
		pts.forEach((p, i) => {
			const q = P(p[0], p[1]);
			if (i) g.lineTo(q[0], q[1]);
			else g.moveTo(q[0], q[1]);
		});
		g.closePath();
		g.fillStyle = col;
		g.fill();
		g.lineWidth = 7;
		g.lineJoin = 'round';
		g.strokeStyle = '#123a7a';
		g.stroke();
	};
	const G1 = '#57b548';
	const G2 = '#8cc152';
	const SD = '#e2c36b';
	land([[-165, 65], [-140, 70], [-95, 72], [-60, 60], [-65, 45], [-80, 28], [-97, 18], [-83, 9], [-105, 22], [-120, 34], [-125, 50], [-150, 59]], G1); // N America
	land([[-80, 10], [-60, 10], [-35, -6], [-40, -22], [-58, -38], [-68, -54], [-74, -45], [-71, -18], [-81, -5]], G2); // S America
	land([[-17, 15], [-5, 35], [10, 37], [33, 31], [43, 11], [51, 11], [40, -15], [33, -27], [20, -35], [13, -15], [9, 4], [-8, 5]], SD); // Africa
	land([[-9, 37], [-9, 43], [0, 49], [10, 55], [5, 60], [25, 71], [60, 70], [100, 77], [140, 72], [178, 66], [160, 55], [142, 46], [122, 38], [120, 24], [108, 20], [103, 2], [98, 10], [90, 22], [80, 8], [72, 20], [60, 25], [48, 30], [36, 36], [27, 37], [20, 40], [12, 44]], G1); // Eurasia
	land([[114, -22], [130, -12], [142, -11], [153, -27], [146, -38], [131, -32], [116, -34]], SD); // Australia
	land([[-52, 60], [-22, 70], [-28, 82], [-60, 80]], '#f4f8ff'); // Greenland
	g.fillStyle = '#f4f8ff';
	g.fillRect(0, 1024 - 92, 2048, 92);
	g.fillRect(0, 0, 2048, 46);
	g.beginPath();
	for (let x = 0; x <= 2048; x += 64) g.ellipse(x, 1024 - 92, 46, 16 + rnd(x) * 22, 0, 0, 7);
	g.fill();
	// clouds
	for (let i = 0; i < 38; i++) {
		const x = rnd(i * 13 + 2) * 2048;
		const y = 130 + rnd(i * 17 + 5) * 760;
		g.fillStyle = 'rgba(255,255,255,0.9)';
		for (let k = 0; k < 4; k++) {
			g.beginPath();
			g.ellipse(x + k * 26, y + (k % 2) * 8, 30, 13, 0, 0, 7);
			g.fill();
		}
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
};

export const T_HOOK_STOP = 0.42;
export const T_BRAKE2 = 30.14;

export const buildSpace = (): SceneApi => {
	const scene = new THREE.Scene();
	const sky = makeSky(scene, '#070a24', '#1b1d52', true);
	lightRig(scene, V3(-0.5, 0.45, 0.9), '#fff1d6', 1.25, '#6f7fe0', '#40308a', 0.42, 12);
	// --- globe
	const globeG = new THREE.Group();
	scene.add(globeG);
	const R = 5;
	const globe = mesh(new THREE.SphereGeometry(R, 64, 40), toon(0, earthTex()), [0, 0, 0], globeG);
	globe.castShadow = false;
	const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 48, 24), new THREE.MeshBasicMaterial({color: '#7fc4ff', transparent: true, opacity: 0.22, side: THREE.BackSide}));
	halo.layers.set(NOINK);
	globeG.add(halo);
	// tiny house marker in Ecuador (u = 0.283)
	const phi = 0.283 * Math.PI * 2;
	const hx = -Math.cos(phi);
	const hz = Math.sin(phi);
	const mark = new THREE.Group();
	box(0.34, 0.26, 0.3, toon('#fff0d0'), [0, 0.13, 0], mark);
	const rf = mesh(new THREE.ConeGeometry(0.3, 0.24, 4), toon('#e0523c'), [0, 0.38, 0], mark);
	rf.rotation.y = Math.PI / 4;
	mark.position.set(hx * R, 0, hz * R);
	mark.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(hx, 0, hz));
	globe.add(mark);
	// --- limb tracking set: little planet with Dave's house on top
	const limb = new THREE.Group();
	scene.add(limb);
	const LR = 42;
	const planet = mesh(new THREE.SphereGeometry(LR, 64, 32), toon(0, paintTex('#5db54c', 'grass', [26, 13], 4)), [0, -LR, 0], limb);
	planet.castShadow = false;
	const house = makeHouse('#fff0d0', '#e0523c', 3);
	house.position.set(0, -0.15, 0);
	limb.add(house);
	for (const [x, s] of [[-9, 1.1], [8.5, 0.9], [-15, 0.8], [15, 1]] as [number, number][]) {
		const tr = makeTree(Math.round(x + 40), s);
		const a = x / LR;
		tr.position.set(Math.sin(a) * LR, Math.cos(a) * LR - LR - 0.1, -1);
		tr.rotation.z = -a;
		limb.add(tr);
	}
	const atm = new THREE.Mesh(new THREE.SphereGeometry(LR + 9, 48, 24), new THREE.MeshBasicMaterial({color: '#58b6ff', transparent: true, opacity: 0.5, side: THREE.BackSide, depthWrite: false}));
	atm.position.y = -LR;
	atm.layers.set(NOINK);
	limb.add(atm);
	const clouds: THREE.Group[] = [];
	for (let i = 0; i < 9; i++) clouds.push(cloud(limb, 0, 0, 0, 1.6 + rnd(i) * 1.2, i));
	const jet = makeCard(limb, 600, 240, 1.7, false);
	drawCard(jet, 'jet', drawJet);
	const daveWin = makeCard(limb, PW, PH, 1.5, false);

	const spin = (t: number) => {
		// eastward spin (rad). Stops at T_HOOK_STOP in the hook, spins again later until T_BRAKE2.
		const w = 2.1;
		const stop = (ts: number) => {
			if (t < ts) return w * (t - ts);
			const u = t - ts;
			return 0.16 * Math.exp(-u * 7) * Math.sin(u * 30); // skid wobble
		};
		if (t < 8) return stop(T_HOOK_STOP);
		if (t < 40) return stop(T_BRAKE2);
		return 0;
	};

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const isLimb = t > 10 && t < 17;
		limb.visible = isLimb;
		globeG.visible = !isLimb;
		sky.uniforms.shift.value = isLimb ? t * 5 : 0;
		sky.uniforms.streak.value = isLimb ? 0.22 : 1;
		(sky.uniforms.top.value as THREE.Color).set(isLimb ? '#12339c' : '#070a24');
		(sky.uniforms.hor.value as THREE.Color).set(isLimb ? '#6fc1ff' : '#1b1d52');
		if (!isLimb) {
			globe.rotation.y = spin(t);
			globeG.rotation.z = 0.12;
			for (const ts of [T_HOOK_STOP, T_BRAKE2]) {
				const age = (t - ts) * 30;
				if (age >= -1 && age < 16) {
					fx.push({k: 'skid', p: V3(0, 0, 0), a: age});
					for (let i = 0; i < 5; i++) fx.push({k: 'spark', p: V3(Math.cos(i * 1.3 + 2) * 5.3, Math.sin(i * 1.7) * 3.4, 2.6), age, s: 1.3});
				}
			}
			return;
		}
		// tracking shot: the house is steady, everything else streams west
		clouds.forEach((c, i) => {
			const span = 90;
			const x = ((((i * 10.3 - t * 34) % span) + span) % span) - span / 2;
			c.position.set(x, 9 + rnd(i * 9) * 22, -10 - rnd(i * 5) * 20);
		});
		fx.push({k: 'speed', a: 0.75});
		// jet: arrives from ahead (right), falls behind
		const ju = (t - 14.0) / 1.75;
		placeCard(jet, cam, lerp(9.5, -10, clamp(ju)), 10.2 + Math.sin(t * 3) * 0.2, -1, 0.06);
		jet.mesh.visible = ju > 0 && ju < 1;
		// sound waves fall behind too
		const su = (t - 15.75) / 1.05;
		if (su > 0 && su < 1) fx.push({k: 'sonic', p: V3(lerp(7, -7, su), 10, 0), s: 1});
		drawCard(daveWin, 'w', (g) => person(g, DAVE, {eyes: 'happy', armR: [2.4, 0.5], holdL: 'mug'}));
		placeCard(daveWin, cam, -3.1, 4.9, 2.2, 0.0);
		daveWin.mesh.visible = false;
	};
	return {scene, update};
};

// =====================================================================================
// KITCHEN
// =====================================================================================
export const T_K_JOLT = 31.25;
export const T_K_SLIDE = 32.28;
export const T_K_SMASH = 33.22;

export const buildKitchen = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#5fa8f0', '#cfe9ff');
	const rig = lightRig(scene, V3(0.75, 0.9, 0.55), '#ffdfb0', 1.25, '#9aa8ff', '#6a4fa8', 0.5, 9);
	const tint = new THREE.Color(1.0, 0.94, 0.86);
	const room = new THREE.Group();
	scene.add(room);
	const lawn = mesh(new THREE.PlaneGeometry(500, 500), toon(0, paintTex('#62b84e', 'grass', [80, 80], 3)), [0, -0.22, 0], scene);
	lawn.rotation.x = -Math.PI / 2;
	lawn.castShadow = false;
	const floor = box(8, 0.2, 7, toon(0, paintTex('#d99a55', 'plank', [3, 4], 2)), [0, -0.1, 0], room);
	floor.castShadow = false;
	box(8, 3.4, 0.2, toon(0, paintTex('#f3d9a0', 'plain', [2, 1], 5)), [0, 1.7, -3.6], room); // back wall
	box(8, 1.0, 0.24, toon(0, paintTex('#5fb7a8', 'tile', [8, 1], 6)), [0, 1.45, -3.56], room); // tile band
	box(0.2, 3.4, 7, toon(0, paintTex('#f0cf94', 'plain', [2, 1], 7)), [-4.1, 1.7, 0], room); // west wall
	const eastWall = box(0.2, 3.4, 7, toon(0, paintTex('#f0cf94', 'plain', [2, 1], 8)), [4.1, 1.7, 0], room);
	// window: bright morning + frame
	const sunny = new THREE.MeshBasicMaterial({color: new THREE.Color(1.6, 1.5, 1.25)});
	const wq = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), sunny);
	wq.position.set(2.0, 2.1, -3.43);
	wq.layers.set(NOINK);
	room.add(wq);
	for (const [w, h, x, y] of [[2.2, 0.14, 2, 2.9], [2.2, 0.14, 2, 1.3], [0.14, 1.7, 0.95, 2.1], [0.14, 1.7, 3.05, 2.1], [0.08, 1.6, 2, 2.1], [2.0, 0.08, 2, 2.1]] as number[][]) box(w, h, 0.16, toon('#fffaf0'), [x, y, -3.44], room);
	// light pool on the floor + wall
	const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshBasicMaterial({color: '#ffcf70', transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false}));
	pool.rotation.x = -Math.PI / 2;
	pool.rotation.z = -0.35;
	pool.position.set(1.0, 0.02, -0.6);
	pool.layers.set(NOINK);
	room.add(pool);
	// counter + cabinets
	const cab = toon(0, paintTex('#4f8fd0', 'tile', [4, 1], 9));
	box(4.2, 0.9, 0.75, cab, [-1.2, 0.45, -3.1], room);
	box(4.3, 0.1, 0.85, toon('#fff4dc'), [-1.2, 0.95, -3.08], room);
	box(3.0, 0.8, 0.45, cab, [-1.6, 2.6, -3.28], room);
	const machine = new THREE.Group();
	box(0.42, 0.6, 0.4, toon('#d6453a'), [0, 0.3, 0], machine);
	box(0.3, 0.12, 0.44, toon('#2a2530'), [0, 0.5, 0.02], machine);
	machine.position.set(-2.5, 1.0, -3.1);
	room.add(machine);
	// kitchen things that will leave: fridge, stove, table, couch
	const movers: {o: THREE.Object3D; x0: number; y0: number; z0: number; delay: number; seed: number}[] = [];
	const addMover = (o: THREE.Object3D, delay: number) => {
		room.add(o);
		movers.push({o, x0: o.position.x, y0: o.position.y, z0: o.position.z, delay, seed: movers.length + 1});
	};
	const fridge = new THREE.Group();
	box(0.95, 2.0, 0.8, toon('#bfe6ee'), [0, 1.0, 0], fridge);
	box(0.06, 0.5, 0.06, toon('#6a7a88'), [0.32, 1.35, 0.43], fridge);
	box(0.97, 0.04, 0.82, toon('#6a7a88'), [0, 1.25, 0], fridge);
	fridge.position.set(-3.4, 0, -3.0);
	addMover(fridge, 0.5);
	const couch = new THREE.Group();
	const red = toon(0, paintTex('#d8433f', 'plain', [1, 1], 11));
	box(1.0, 0.45, 2.2, red, [0, 0.42, 0], couch);
	box(0.3, 0.95, 2.2, red, [-0.42, 0.7, 0], couch);
	box(1.0, 0.7, 0.28, red, [0, 0.55, 1.2], couch);
	box(1.0, 0.7, 0.28, red, [0, 0.55, -1.2], couch);
	box(0.5, 0.16, 0.9, toon('#ffd36a'), [0.12, 0.72, 0.4], couch);
	couch.position.set(-3.2, 0, 1.2);
	addMover(couch, 0.25);
	const table = new THREE.Group();
	mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 20), toon('#fff4dc'), [0, 0.8, 0], table);
	mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), toon('#7a4b2c'), [0, 0.4, 0], table);
	mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 10), toon('#59c08a'), [0.1, 0.99, 0], table);
	mesh(new THREE.IcosahedronGeometry(0.26, 1), toon('#e85d8a'), [0.1, 1.3, 0], table);
	table.position.set(2.3, 0, -1.3);
	addMover(table, 0.1);
	const rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28), toon('#7c5fd0'));
	rug.rotation.x = -Math.PI / 2;
	rug.position.set(0.9, 0.012, 1.5);
	rug.receiveShadow = true;
	room.add(rug);
	// wall hole (appears on smash), sky-coloured Dave silhouette
	const hole = decal(holeTex('#9fd4ff'), 2.5, 2.5, room);
	hole.rotation.y = -Math.PI / 2;
	hole.position.set(3.985, 1.45, -0.9);
	// picture + clock on the east wall
	box(0.06, 0.8, 1.0, toon('#fffaf0'), [3.97, 2.3, 1.6], room);
	box(0.07, 0.6, 0.8, toon('#ff9f43'), [3.96, 2.3, 1.6], room);
	// debris
	const debris: THREE.Mesh[] = [];
	for (let i = 0; i < 10; i++) debris.push(box(0.25 + rnd(i) * 0.3, 0.2 + rnd(i * 3) * 0.25, 0.12, toon('#f0cf94'), [0, -5, 0], room));
	// mug as a 3D object (on the counter / flying)
	const mug3 = new THREE.Group();
	mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.22, 14), toon('#ffffff'), [0, 0.11, 0], mug3);
	mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.02, 14), toon('#5a2f14'), [0, 0.215, 0], mug3);
	mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12), toon('#ffffff'), [0.13, 0.11, 0], mug3);
	room.add(mug3);

	const dave = makeCard(scene, PW, PH, 1.78);
	const cat = makeCard(scene, 400, 300, 0.62);
	const DX = -0.9;
	const DZ = -2.1;
	const CX = 0.9;
	const CZ = 1.5;

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const brake = t > T_K_JOLT - 0.05 && t < 40;
		const j = t - T_K_JOLT; // after the jolt
		// --- Dave
		let dx = DX;
		let dy = 0;
		let roll = 0;
		let pose: Partial<Pose> = {};
		const bl = blinkAt(t, 1);
		if (t < 11) {
			// pouring coffee
			const pour = t > 5.9 && t < 9.4;
			pose = {armR: [2.25, pour ? 0.75 : 0.35], holdR: 'pot', armL: [-0.55, -1.75], holdL: 'mug', eyes: bl ? 'closed' : t > 9.5 ? 'wide' : 'happy', mouth: t > 9.5 ? 'o' : 'smile', look: t > 9.5 ? 0 : -0.6};
			if (pour) fx.push({k: 'pour', a: V3(DX + 0.2, 1.42, DZ + 0.05), b: V3(DX - 0.36, 1.12, DZ + 0.05)});
			fx.push({k: 'steam', p: V3(DX - 0.4, 1.3, DZ), t});
		} else if (t < 22) {
			// calm sipping (question + "you see")
			const sip = (t > 16.9 && t < 17.6) || (t > 19.2 && t < 19.6);
			pose = {armL: sip ? [-0.5, -2.45] : [-0.5, -1.7], holdL: 'mug', armR: [-0.15, -0.1], eyes: bl ? 'closed' : sip ? 'closed' : t > 17.6 && t < 18.7 ? 'half' : 'dot', mouth: sip ? 'sip' : 'smile', look: t > 20.4 && t < 21.7 ? 0.7 : 0};
			if (t > 17.55 && t < 18.62) fx.push({k: 'q', p: V3(DX + 0.75, 2.05, DZ), age: (t - 17.55) * 30});
			if (t > 19.0 && t < 21.76) fx.push({k: 'speed', a: 0.4 * sstep(19.0, 19.3, t)});
			fx.push({k: 'steam', p: V3(DX - 0.35, 1.45, DZ), t});
		} else if (brake) {
			const sl = clamp((t - T_K_SLIDE) / (T_K_SMASH - T_K_SLIDE));
			dx = DX + sl * sl * (3.9 - DX) + (t > T_K_SMASH ? (t - T_K_SMASH) * 30 : 0);
			dy = t > T_K_SLIDE ? Math.sin(sl * Math.PI) * 0.5 + sl * 0.5 : 0;
			roll = -sl * 1.15 - clamp(j * 4) * 0.18 * Math.exp(-Math.max(0, j) * 2);
			pose =
				t < T_K_SLIDE
					? {armL: [-1.3, -1.2], armR: [1.3, 1.2], eyes: 'wide', mouth: 'o', lean: 0.22 * clamp(j * 6), hair: 0.5, brow: -1}
					: {armL: [-2.4, -0.4], armR: [2.6, 0.3], eyes: 'wide', mouth: 'scream', legs: Math.sin(t * 40), hair: 1, brow: -1};
		} else pose = {};
		drawCard(dave, pkey(pose), (g) => person(g, DAVE, pose));
		placeCard(dave, cam, dx, dy, DZ + (brake ? clamp((t - T_K_SLIDE) * 1.2) * 1.2 : 0), roll, tint);
		dave.mesh.visible = !(brake && t > T_K_SMASH + 0.03);
		if (dave.blob) dave.blob.visible = dave.blob.visible && dave.mesh.visible;
		// --- mug on the counter after Dave lets go (brake) – flies first
		const mu = brake ? clamp((t - T_K_JOLT - 0.1) / 1.4) : 0;
		mug3.visible = brake && t < T_K_SMASH + 0.4;
		mug3.position.set(DX - 0.5 + mu * mu * 9, 1.15 + mu * 0.9 - mu * mu * 0.6, DZ + 0.2);
		mug3.rotation.z = -mu * 9;
		// --- cat
		const cs = brake ? clamp((t - T_K_JOLT - 0.35) / 2.2) : 0;
		const cmode = brake && j > 0 ? (cs > 0.25 ? 'fly' : 'scared') : 'sit';
		const tail = brake ? 1 : Math.sin(t * 2.2) * 0.8;
		drawCard(cat, cmode + Math.round(tail * 6), (g) => drawCat(g, cmode, tail));
		placeCard(cat, cam, CX + cs * cs * 6, cs > 0.25 ? 0.25 + cs * 0.9 : 0, CZ, -cs * 0.5, tint);
		// --- furniture slides east
		for (const m of movers) {
			const u = brake ? clamp((t - T_K_JOLT - m.delay) / 2.4) : 0;
			const k = u * u;
			m.o.position.set(Math.min(m.x0 + k * 9, 3.3 - (m.seed % 3) * 0.9 + k * 0.5), m.y0 + (brake && j > 0 ? Math.abs(Math.sin(j * 22 + m.seed)) * 0.05 * Math.exp(-j * 2) : 0), m.z0);
			m.o.rotation.z = -Math.min(k * 0.9, 0.3) - (brake && j > 0 ? 0.08 * Math.exp(-j * 3) : 0);
		}
		// --- wall hole + debris
		const sm = (t - T_K_SMASH) * 30;
		hole.visible = brake && sm >= 0;
		debris.forEach((d, i) => {
			if (!brake || sm < 0) return void d.position.set(0, -5, 0);
			const u = sm / 30;
			d.position.set(4.4 + u * (4 + rnd(i) * 9), 1.4 + (rnd(i * 3) - 0.3) * 2 * u * 3 - 6 * u * u, -0.9 + (rnd(i * 7) - 0.5) * 3 * u * 2 + (rnd(i * 2) - 0.5));
			d.rotation.set(u * 9 * rnd(i), u * 7, u * 5);
		});
		if (brake && sm >= 0 && sm < 12) {
			fx.push({k: 'star', p: V3(4, 1.5, -0.9), age: sm, s: 1.5});
			fx.push({k: 'puff', p: V3(3.8, 0.6, -0.4), age: sm, s: 1.6});
			fx.push({k: 'puff', p: V3(3.8, 2.3, -1.3), age: sm, s: 1.3});
		}
		if (brake && j > 0 && j < 0.5) fx.push({k: 'speed', a: 0.7 * (1 - j * 2)});
		if (brake && t > T_K_SLIDE) fx.push({k: 'speed', a: 0.55});
		rig.sun.intensity = 1.25 * Math.PI;
		void eastWall;
	};
	return {scene, update};
};

// =====================================================================================
// STREET (hook exterior, stream of stuff, wind, ocean)
// =====================================================================================
export const T_HOOK_BURST = 2.3;
export const T_STREAM = [34.2, 34.72, 35.12, 35.9];

export const buildStreet = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#3e7fd2', '#c4ddf2');
	scene.fog = new THREE.Fog('#c4ddf2', 45, 330);
	lightRig(scene, V3(0.55, 0.8, 0.65), '#ffe6bd', 1.3, '#8ea4ff', '#5d4a9c', 0.48, 46);
	const tint = new THREE.Color(1.0, 0.96, 0.88);
	const ground = mesh(new THREE.PlaneGeometry(700, 700), toon(0, paintTex('#62b84e', 'grass', [110, 110], 3)), [0, 0, 0], scene);
	ground.rotation.x = -Math.PI / 2;
	ground.castShadow = false;
	const road = box(700, 0.06, 6, toon(0, paintTex('#6d6b78', 'road', [90, 1], 4)), [0, 0.03, 9.5], scene);
	road.castShadow = false;
	box(700, 0.16, 1.5, toon('#d9d2c4'), [0, 0.08, 5.6], scene).castShadow = false;
	// Dave's house
	const house = makeHouse('#fff0d0', '#e0523c', 3);
	house.position.set(0, 0, -1);
	scene.add(house);
	const hole = decal(holeTex('#2a1830'), 2.7, 2.7, scene);
	hole.rotation.y = Math.PI / 2;
	hole.position.set(4.03, 1.75, -0.6);
	// neighbours
	const walls = ['#8fc7e8', '#f6b6c8', '#ffe08a', '#c8e6a0', '#f3c9a0', '#d6c1f0'];
	const roofs = ['#4a6fb0', '#b0483e', '#7a5a9c', '#3f8f6a', '#c07030', '#5a5f78'];
	const nbs: THREE.Group[] = [];
	[-13.5, 14.5, 28, -27, 42, -41].forEach((x, i) => {
		const h = makeHouse(walls[i], roofs[i], i + 10, 7 + (i % 2), 4.2 + (i % 3) * 0.6, 7);
		h.position.set(x, 0, -1 - (i % 2) * 1.5);
		scene.add(h);
		nbs.push(h);
	});
	for (let i = 0; i < 9; i++) {
		const h = makeHouse(walls[(i + 2) % 6], roofs[(i + 3) % 6], i + 30, 7, 4.4, 6);
		h.position.set(-56 + i * 14, 0, -27 - (i % 2) * 3);
		scene.add(h);
	}
	const trees: THREE.Group[] = [];
	[[-7, 3], [8.5, -7], [21, 2], [-20, 2.5], [35, 3], [-34, 2], [11, -12], [-4, -14], [24, -15], [-18, -16], [50, 1], [-48, 1.5]].forEach(([x, z], i) => {
		const tr = makeTree(i + 3, 0.95 + rnd(i) * 0.5);
		tr.position.set(x, 0, z);
		scene.add(tr);
		trees.push(tr);
	});
	// hills + clouds
	for (let i = 0; i < 7; i++) {
		const hgt = mesh(new THREE.SphereGeometry(38, 20, 12), toon(['#4fae58', '#6cbf5a', '#43a06a'][i % 3]), [-150 + i * 52, -14, -120 - (i % 2) * 30], scene);
		hgt.scale.y = 0.55 + rnd(i) * 0.3;
		hgt.castShadow = false;
	}
	const clouds: THREE.Group[] = [];
	for (let i = 0; i < 8; i++) clouds.push(cloud(scene, -140 + i * 40, 42 + rnd(i) * 30, -150 - rnd(i * 3) * 60, 9 + rnd(i * 7) * 6, i));
	// mailbox
	const mail = new THREE.Group();
	box(0.12, 1.1, 0.12, toon('#7a4b2c'), [0, 0.55, 0], mail);
	box(0.6, 0.35, 0.32, toon('#3f6fd8'), [0, 1.25, 0], mail);
	mail.position.set(5.6, 0, 4.4);
	scene.add(mail);
	// ocean far west + its slab that follows the walking wave
	const sea = box(400, 0.5, 700, toon(0, paintTex('#2f8fd6', 'snow', [40, 70], 8)), [-262, -0.2, 0], scene);
	sea.castShadow = false;
	box(8, 0.12, 700, toon('#f1dc9a'), [-59, 0.06, 0], scene).castShadow = false;
	const slab = box(400, 5, 700, toon(0, paintTex('#2f8fd6', 'snow', [40, 70], 9)), [-500, -3, 0], scene);
	slab.castShadow = false;
	const wave = makeCard(scene, 800, 600, 30, false);
	// flying things
	const dave = makeCard(scene, PW, PH, 1.78);
	const cat = makeCard(scene, 400, 300, 0.75);
	const mug = makeCard(scene, 120, 120, 0.55, false);
	drawCard(mug, 'm', (g) => drawMug(g, 56, 62, 2));
	const couch = new THREE.Group();
	const red = toon('#d8433f');
	box(2.2, 0.45, 1.0, red, [0, 0.42, 0], couch);
	box(2.2, 0.95, 0.3, red, [0, 0.7, -0.42], couch);
	box(0.28, 0.7, 1.0, red, [1.2, 0.55, 0], couch);
	box(0.28, 0.7, 1.0, red, [-1.2, 0.55, 0], couch);
	scene.add(couch);
	const stuff: THREE.Object3D[] = [];
	const fr = new THREE.Group();
	box(0.95, 2.0, 0.8, toon('#bfe6ee'), [0, 0, 0], fr);
	box(0.97, 0.04, 0.82, toon('#6a7a88'), [0, 0.25, 0], fr);
	stuff.push(fr);
	const tb = new THREE.Group();
	mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 20), toon('#fff4dc'), [0, 0.4, 0], tb);
	mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), toon('#7a4b2c'), [0, 0, 0], tb);
	stuff.push(tb);
	const cn = new THREE.Group();
	box(2.2, 0.9, 0.75, toon('#4f8fd0'), [0, 0, 0], cn);
	box(2.3, 0.1, 0.85, toon('#fff4dc'), [0, 0.5, 0], cn);
	stuff.push(cn);
	const st = new THREE.Group();
	box(0.9, 0.9, 0.8, toon('#f4f4f8'), [0, 0, 0], st);
	box(0.6, 0.4, 0.05, toon('#2a2530'), [0, 0, 0.41], st);
	stuff.push(st);
	const sk = new THREE.Group();
	box(0.42, 0.6, 0.4, toon('#d6453a'), [0, 0, 0], sk);
	stuff.push(sk);
	stuff.forEach((s) => scene.add(s));
	const debris: THREE.Mesh[] = [];
	for (let i = 0; i < 12; i++) debris.push(box(0.3 + rnd(i) * 0.4, 0.25 + rnd(i * 3) * 0.3, 0.14, toon(0, paintTex('#fff0d0', 'brick', [0.3, 0.3], 3)), [0, -5, 0], scene));

	const fly = (o: THREE.Object3D, u: number, seed: number, v = 24) => {
		if (u < 0) return void o.position.set(0, -20, 0);
		o.position.set(4.2 + u * v * (0.6 + rnd(seed * 5) * 0.6), 1.2 + rnd(seed * 3) * 1.6 + u * (1 + rnd(seed * 7) * 4) - u * u * 1.5, -0.6 + (rnd(seed) - 0.5) * 2.2 + u * (rnd(seed * 11) * 5));
		o.rotation.set(u * (3 + seed), u * 2, -u * (5 + seed * 1.3));
	};

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const hook = t < 6;
		const windy = t > 36.4;
		const ocean = t > 40.8;
		const burstT = hook ? T_HOOK_BURST : 33.6;
		const b = (t - burstT) * 30;
		hole.visible = hook ? b >= 0 : true;
		debris.forEach((d, i) => fly(d, hook ? (b >= 0 ? (b / 30) * (0.5 + rnd(i) * 0.7) : -1) : -1, i));
		if (hook && b >= 0 && b < 12) {
			fx.push({k: 'star', p: V3(4.1, 1.8, -0.6), age: b, s: 2.6});
			fx.push({k: 'puff', p: V3(4.6, 0.8, 0), age: b, s: 2});
			fx.push({k: 'puff', p: V3(4.6, 2.8, -1.2), age: b, s: 1.6});
		}
		// Dave flying (hook)
		const du = hook ? (t - T_HOOK_BURST) : -1;
		const dp: Partial<Pose> = {armL: [-2.5, -0.3], armR: [2.6, 0.3], eyes: 'wide', mouth: 'scream', legs: 0.8, hair: -1, holdR: 'mug', brow: -1};
		drawCard(dave, pkey(dp), (g) => person(g, DAVE, dp));
		const dx = 4.3 + du * 14;
		placeCard(dave, cam, dx, 1.0 + du * 2.6, -0.6 + du * 2, -1.25 - du * 0.5, tint);
		dave.mesh.visible = du >= 0 && du < 3;
		if (dave.blob) dave.blob.visible = dave.mesh.visible && dave.blob.visible;
		if (hook && du >= 0 && du < 1.9) fx.push({k: 'speed', a: 0.85 * (1 - du / 1.9)});
		// stream of kitchen things
		const s = (i: number) => (hook || t < T_STREAM[i] ? -1 : t - T_STREAM[i]);
		const mu = s(0);
		placeCard(mug, cam, 4.2 + mu * 22, 1.7 + mu * 2.6, -0.4 + mu * 2.4, -mu * 9, tint);
		mug.mesh.visible = mu >= 0;
		const cu = s(1);
		drawCard(cat, 'fly', (g) => drawCat(g, 'fly', 1));
		placeCard(cat, cam, 4.2 + cu * 23, 1.3 + cu * 3.4 - cu * cu * 0.5, -0.8 + cu * 2.6, -0.4 + Math.sin(cu * 9) * 0.3, tint);
		cat.mesh.visible = cu >= 0;
		if (cat.blob) cat.blob.visible = cat.mesh.visible && cat.blob.visible;
		fly(couch, s(2), 2, 21);
		stuff.forEach((o, i) => fly(o, s(3) < 0 ? -1 : s(3) - i * 0.07, i + 3, 22 + i));
		for (let i = 0; i < 4; i++) {
			const a = (t - T_STREAM[i]) * 30;
			if (!hook && a >= 0 && a < 9) fx.push({k: 'puff', p: V3(4.5, 1.6, -0.6), age: a, s: 1.4 + (i === 3 ? 1.4 : 0)});
		}
		if (!hook && t > 33.9 && t < 36.45) fx.push({k: 'speed', a: 0.5});
		// roof of Dave's house pops with "most of the kitchen"
		const roof = house.getObjectByName('roof')!;
		const ru = hook ? -1 : t - T_STREAM[3] - 0.05;
		roof.position.set(ru > 0 ? ru * 16 : 0, 4.6 + (ru > 0 ? ru * 5 : 0), 0);
		roof.rotation.z = ru > 0 ? -ru * 1.4 : 0;
		// wind
		const wa = windy ? sstep(36.4, 37.0, t) : 0;
		trees.forEach((tr, i) => {
			tr.rotation.z = -wa * (1.15 + Math.sin(t * 17 + i) * 0.1);
			tr.scale.y = 1 - wa * 0.15;
		});
		clouds.forEach((c, i) => (c.position.x = -140 + i * 40 + (windy ? (t - 36.4) * 95 : t * 0.6)));
		nbs.forEach((h, i) => {
			const r = h.getObjectByName('roof')!;
			const u = windy ? t - 37.7 - i * 0.42 : -1;
			r.position.set(u > 0 ? u * 22 : 0, (h.children[0] as THREE.Mesh).position.y * 2 + (u > 0 ? u * 6 : 0), 0);
			r.rotation.z = u > 0 ? -u * 2 : windy ? Math.sin(t * 30 + i) * 0.03 * wa : 0;
		});
		const mu2 = windy ? t - 37.2 : -1;
		mail.position.set(5.6 + (mu2 > 0 ? mu2 * 26 : 0), mu2 > 0 ? mu2 * 4 : 0, 4.4);
		mail.rotation.z = mu2 > 0 ? -mu2 * 8 : -wa * 0.5;
		if (windy && !ocean) fx.push({k: 'wind', a: wa});
		// ocean walks in
		const ou = ocean ? clamp((t - 41.0) / 3.9) : 0;
		const wx = lerp(-92, -22, ou);
		const stepPh = Math.sin((t - 41) * 9);
		drawCard(wave, 'w' + Math.round(stepPh * 5), (g) => drawWave(g, stepPh));
		placeCard(wave, cam, wx, Math.abs(Math.cos((t - 41) * 9)) * 0.9, -6, 0, null);
		wave.mesh.visible = ocean;
		slab.position.set(wx - 205, ocean ? 1.2 : -3, 0);
		if (ocean) fx.push({k: 'wind', a: 0.35});
	};
	return {scene, update};
};

// =====================================================================================
// BUS (camera at the front looking back; the bus drives toward +X)
// =====================================================================================
export const T_BUS_BRAKE = 26.9;
export const T_BUS_STOP = 28.36;
export const T_BUS_SPLAT = 29.04;

export const buildBus = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#2a2a7c', '#f08a6a');
	scene.fog = new THREE.Fog('#b0709a', 30, 160);
	lightRig(scene, V3(0.5, 0.75, -0.35), '#ffc78a', 0.95, '#8b8cff', '#5a3fa0', 0.62, 14);
	const tint = new THREE.Color(0.95, 0.88, 0.95);
	const bus = new THREE.Group();
	scene.add(bus);
	const L = 13;
	box(L, 0.12, 2.7, toon(0, paintTex('#5b5f78', 'plain', [4, 1], 3)), [-0.5, -0.06, 0], bus);
	box(L, 0.02, 0.5, toon('#f2c94c'), [-0.5, 0.012, 0], bus).castShadow = false;
	const body = toon(0, paintTex('#f4a63a', 'plain', [4, 1], 4));
	const cream = toon('#fff1d6');
	for (const z of [-1.35, 1.35]) {
		box(L, 0.95, 0.12, body, [-0.5, 0.47, z], bus);
		box(L, 0.4, 0.12, cream, [-0.5, 2.15, z], bus);
		for (let x = -7; x <= 6; x += 1.85) box(0.16, 1.0, 0.14, cream, [x, 1.45, z], bus);
	}
	const roofB = box(L, 0.12, 2.82, cream, [-0.5, 2.4, 0], bus);
	roofB.castShadow = false;
	box(0.14, 2.4, 2.7, body, [-7, 1.2, 0], bus);
	for (const z of [-0.5, 0.5]) {
		const lamp = new THREE.Mesh(new THREE.BoxGeometry(L - 1, 0.05, 0.22), new THREE.MeshBasicMaterial({color: new THREE.Color(1.8, 1.5, 1.0)}));
		lamp.position.set(-0.5, 2.32, z);
		lamp.layers.set(NOINK);
		bus.add(lamp);
		const rail = mesh(new THREE.CylinderGeometry(0.035, 0.035, L - 1, 8), toon('#f2c94c'), [-0.5, 2.02, z * 0.9], bus);
		rail.rotation.z = Math.PI / 2;
	}
	const straps: THREE.Mesh[] = [];
	for (let x = -5; x <= 3; x += 1.0)
		for (const z of [-0.45, 0.45]) {
			if (Math.abs(x - 1.2) < 0.3 && z > 0) continue;
			const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), toon('#d8b43a'));
			s.geometry.translate(0, -0.18, 0);
			s.position.set(x, 2.0, z);
			bus.add(s);
			straps.push(s);
		}
	const seatM = toon(0, paintTex('#3f6fd8', 'plain', [1, 1], 6));
	for (let x = -5.6; x <= 1.2; x += 1.25)
		for (const z of [-0.88, 0.88]) {
			box(0.55, 0.14, 0.8, seatM, [x, 0.5, z], bus);
			box(0.12, 0.75, 0.8, seatM, [x - 0.26, 0.9, z], bus);
			box(0.14, 0.12, 0.82, toon('#ff8a3c'), [x - 0.26, 1.3, z], bus);
			box(0.1, 0.5, 0.1, toon('#6a6f88'), [x, 0.25, z], bus);
		}
	for (const x of [-2.2, 2.4]) mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), toon('#f2c94c'), [x, 1.2, -0.48], bus);
	// driver area (near the camera)
	box(0.5, 0.14, 0.7, toon('#2f2a3a'), [3.2, 0.55, -0.6], bus);
	box(0.12, 0.9, 0.7, toon('#2f2a3a'), [2.95, 1.0, -0.6], bus);
	const wheel = mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 20), toon('#2a2530'), [3.85, 1.15, -0.6], bus);
	wheel.rotation.y = Math.PI / 2;
	wheel.rotation.z = 0.4;
	box(0.5, 0.9, 1.1, toon('#4a4f68'), [4.3, 0.45, -0.6], bus);
	// outside: road + scrolling city
	const road = mesh(new THREE.PlaneGeometry(400, 60), toon(0, paintTex('#55526a', 'road', [50, 6], 7)), [0, -0.5, 0], scene);
	road.rotation.x = -Math.PI / 2;
	const city: {o: THREE.Object3D; x0: number}[] = [];
	const cols = ['#7c6fd8', '#e8709a', '#5b8fe0', '#f2a04c', '#58b8a8', '#b06fd0'];
	const SPAN = 150;
	for (let i = 0; i < 26; i++) {
		const side = i % 2 ? 1 : -1;
		const h = 5 + rnd(i * 3) * 9;
		const g = new THREE.Group();
		box(4.5, h, 4, toon(cols[i % 6]), [0, h / 2 - 0.5, 0], g);
		for (let wy = 1.2; wy < h - 1.2; wy += 1.7)
			for (const wx of [-1.1, 1.1]) {
				const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({color: rnd(i * 7 + wy * 3 + wx) > 0.4 ? '#ffe9a0' : '#3a3a80'}));
				w.position.set(wx, wy, -side * 2.02);
				if (side > 0) w.rotation.y = Math.PI;
				w.layers.set(NOINK);
				g.add(w);
			}
		g.position.set(0, 0, side * (6.5 + rnd(i) * 2));
		scene.add(g);
		city.push({o: g, x0: (i / 26) * SPAN});
	}
	for (let i = 0; i < 10; i++) {
		const g = new THREE.Group();
		mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), toon('#3a3550'), [0, 1.6, 0], g);
		const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({color: new THREE.Color(2, 1.7, 1.0)}));
		bulb.position.set(0, 3.8, 0);
		bulb.layers.set(NOINK);
		g.add(bulb);
		g.position.set(0, 0, (i % 2 ? 1 : -1) * 3.2);
		scene.add(g);
		city.push({o: g, x0: (i / 10) * SPAN + 4});
	}
	// cast
	const dave = makeCard(scene, PW, PH, 1.72);
	const nap: Style = {skin: '#d9a877', shirt: '#59c08a', pants: '#40425c', hair: '#2a2530', hairKind: 'cap', hood: '', goggles: false, scale: 1};
	const lady: Style = {skin: '#ffd9b8', shirt: '#b06fd0', pants: '#5a3a7a', hair: '#e8e2f0', hairKind: 'bun', hood: '', goggles: false, scale: 0.94};
	const drv: Style = {skin: '#c98d5e', shirt: '#3b4a8c', pants: '#2a2f55', hair: '#1f2a55', hairKind: 'cap', hood: '', goggles: false, scale: 1};
	const napper = makeCard(scene, PW, PH, 1.6, false);
	const ladyC = makeCard(scene, PW, PH, 1.5, false);
	const driver = makeCard(scene, PW, PH, 1.6, false);
	const V0 = 15;
	const dist = (t: number) => {
		if (t < T_BUS_BRAKE) return V0 * t;
		const d = T_BUS_STOP - T_BUS_BRAKE;
		const u = clamp((t - T_BUS_BRAKE) / d);
		return V0 * T_BUS_BRAKE + V0 * d * (u - (u * u) / 2);
	};

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const s = dist(t);
		for (const c of city) c.o.position.x = ((((c.x0 - s) % SPAN) + SPAN) % SPAN) - SPAN * 0.72;
		const br = t - T_BUS_BRAKE;
		const dec = br > 0 && t < T_BUS_STOP ? 1 : 0;
		const lurch = br > 0 ? Math.min(1, br * 5) * (t < T_BUS_STOP ? 1 : Math.exp(-(t - T_BUS_STOP) * 5)) : 0;
		bus.rotation.z = -lurch * 0.035 + (br < 0 ? Math.sin(t * 9) * 0.004 : 0);
		bus.position.y = br < 0 ? Math.abs(Math.sin(t * 7.3)) * 0.02 : 0;
		straps.forEach((st, i) => (st.rotation.z = -lurch * 0.9 + Math.sin(t * 5 + i) * 0.08 * (1 - lurch)));
		// Dave: stand, sip, then skid forward and splat on the windshield (= the lens)
		const bl = blinkAt(t, 2);
		let pose: Partial<Pose>;
		let x = 1.2;
		let y = 0;
		let roll = 0;
		let sc = 1;
		if (br < 0) {
			const sip = t > 24.5 && t < 25.05;
			pose = {armL: [-2.9, -0.15], holdL: 'strap', armR: sip ? [0.5, 2.45] : [0.5, 1.6], holdR: 'mug', eyes: bl || sip ? 'closed' : 'happy', mouth: sip ? 'sip' : t > 24.0 && t < 24.5 ? 'grin' : 'smile', lean: Math.sin(t * 2.2) * 0.02};
		} else if (t < T_BUS_STOP) {
			const u = br / (T_BUS_STOP - T_BUS_BRAKE);
			x = 1.2 + u * u * 1.3;
			pose = {armL: [-2.2 + Math.sin(t * 30) * 0.5, -0.5], armR: [2.2 + Math.cos(t * 30) * 0.5, 0.5], eyes: 'wide', mouth: 'o', lean: -0.3, legs: Math.sin(t * 34) * 0.7, hair: -0.8, brow: -1};
		} else if (t < T_BUS_SPLAT) {
			const u = (t - T_BUS_STOP) / (T_BUS_SPLAT - T_BUS_STOP);
			x = 2.5 + u * u * 2.5;
			y = 0.1 + u * 0.16;
			roll = 0;
			pose = {armL: [-2.6, -0.3], armR: [2.6, 0.3], eyes: 'wide', mouth: 'scream', legs: 0.9, hair: -1, brow: -1};
		} else {
			const u = t - T_BUS_SPLAT;
			x = 5.0;
			y = 0.26 - u * 0.22;
			sc = 1;
			pose = {armL: [-2.5, -0.5], armR: [2.5, 0.5], eyes: 'wide', mouth: 'flat', legs: 0.9, look: 0, brow: 1};
			if (u * 30 < 12) fx.push({k: 'star', p: V3(4.9, 1.95, -0.35), age: u * 30, s: 0.22});
			fx.push({k: 'crack', age: u * 30});
		}
		drawCard(dave, pkey(pose), (g) => person(g, DAVE, pose));
		placeCard(dave, cam, x, y, 0.05, roll, tint);
		dave.mesh.scale.y = sc;
		// napper
		const nu = br > 0 ? clamp(br / 1.2) : 0;
		const np: Partial<Pose> = br > 0.12 ? {sit: true, eyes: 'wide', mouth: 'o', armL: [-1.4, -1], armR: [1.4, 1], brow: -1} : {sit: true, eyes: 'closed', mouth: 'o', armL: [0.3, 0.6], armR: [-0.3, -0.6], lean: 0.1};
		drawCard(napper, pkey(np), (g) => person(g, nap, np));
		placeCard(napper, cam, -0.15 + nu * 0.55, 0.12, 0.88, -nu * 0.25, tint);
		if (br < 0 && t > 24.75) fx.push({k: 'zzz', p: V3(0.0, 1.85, 0.75), t});
		const lp: Partial<Pose> = br > 0.1 ? {sit: true, eyes: 'wide', mouth: 'scream', armL: [-2.2, -0.4], armR: [2.2, 0.4]} : {sit: true, eyes: bl ? 'closed' : 'dot', mouth: 'smile'};
		drawCard(ladyC, pkey(lp), (g) => person(g, lady, lp));
		placeCard(ladyC, cam, -1.45 + nu * 0.4, 0.12, -0.88, -nu * 0.2, tint);
		const dp: Partial<Pose> = br > -0.15 && t < T_BUS_STOP + 0.4 ? {sit: true, eyes: 'wide', mouth: 'scream', armL: [0.9, 1.3], armR: [0.6, 1.2], lean: 0.12, brow: 1} : {sit: true, eyes: bl ? 'closed' : 'half', mouth: 'flat', armL: [0.9, 1.3], armR: [0.6, 1.2]};
		drawCard(driver, pkey(dp), (g) => person(g, drv, dp));
		placeCard(driver, cam, 3.12, 0.16, -0.6, 0, tint);
		if (br < 0) fx.push({k: 'speed', a: 0.16});
		if (dec) fx.push({k: 'speed', a: 0.6});
		void road;
	};
	return {scene, update};
};

// =====================================================================================
// SOUTH POLE
// =====================================================================================
export const poleAngle = (t: number) => 0.03 * (t - 45.7) + 0.95 * sstep(48.6, 52.0, t);

export const buildPole = (): SceneApi => {
	const scene = new THREE.Scene();
	makeSky(scene, '#3f8fe0', '#ffe3d0');
	scene.fog = new THREE.Fog('#f4e6ea', 40, 300);
	lightRig(scene, V3(-0.7, 0.42, 0.6), '#ffe9c8', 1.15, '#a8c4ff', '#8f9fe8', 0.62, 26);
	const tint = new THREE.Color(1.0, 0.98, 0.98);
	const snow = mesh(new THREE.PlaneGeometry(900, 900), toon(0, paintTex('#f3f7ff', 'snow', [90, 90], 2)), [0, 0, 0], scene);
	snow.rotation.x = -Math.PI / 2;
	snow.castShadow = false;
	for (let i = 0; i < 14; i++) {
		const m = mesh(new THREE.SphereGeometry(6 + rnd(i) * 14, 16, 10), toon('#eef3ff'), [-150 + i * 24 + rnd(i * 3) * 10, -3, -60 - rnd(i * 5) * 90], scene);
		m.scale.y = 0.3 + rnd(i * 7) * 0.25;
		m.castShadow = false;
	}
	// turning ground: pole + flags + people
	const turn = new THREE.Group();
	scene.add(turn);
	const disc = mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.06, 48), toon(0, paintTex('#e3ecff', 'snow', [6, 6], 4)), [0, 0.03, 0], turn);
	disc.castShadow = false;
	const stripes = (() => {
		const c = document.createElement('canvas');
		c.width = 64;
		c.height = 256;
		const g = c.getContext('2d')!;
		g.fillStyle = '#fff';
		g.fillRect(0, 0, 64, 256);
		g.fillStyle = '#e23b3b';
		for (let i = -2; i < 8; i++) {
			g.beginPath();
			g.moveTo(0, i * 48);
			g.lineTo(64, i * 48 + 40);
			g.lineTo(64, i * 48 + 64);
			g.lineTo(0, i * 48 + 24);
			g.fill();
		}
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	})();
	mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 12), toon(0, stripes), [0, 0.62, 0], turn);
	mesh(new THREE.SphereGeometry(0.24, 20, 14), toon('#cfd8ea', null, '#30385a'), [0, 1.45, 0], turn);
	const flagCols = ['#e23b3b', '#2f6fe0', '#ffd23f', '#3fae4c', '#ff8a3c', '#ffffff', '#7c5fd0', '#e8709a'];
	const flags: THREE.Mesh[] = [];
	for (let i = 0; i < 8; i++) {
		const a = Math.PI * (0.08 + (i / 7) * 0.84);
		const x = Math.cos(a) * 3.6;
		const z = -Math.sin(a) * 3.0;
		mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), toon('#d8dbe6'), [x, 1.2, z], turn);
		flags.push(box(0.7, 0.44, 0.03, toon(flagCols[i]), [x + 0.37, 2.15, z], turn));
	}
	// station hut on stilts
	const hut = new THREE.Group();
	box(11, 3, 5, toon(0, paintTex('#3f6fb0', 'plank', [3, 1], 6)), [0, 4, 0], hut);
	box(11.4, 0.3, 5.4, toon('#e9eef8'), [0, 5.6, 0], hut);
	for (const x of [-4.5, -1.5, 1.5, 4.5]) {
		box(0.3, 2.6, 0.3, toon('#8a90a8'), [x, 1.3, 1.8], hut);
		box(1.1, 0.9, 0.1, toon('#ffe9a0', null, '#b89030'), [x, 4.2, 2.53], hut);
	}
	hut.position.set(9, 0, -26);
	hut.rotation.y = -0.25;
	scene.add(hut);
	// crate + laptop
	const crate = box(0.8, 0.75, 0.6, toon(0, paintTex('#c98a4a', 'plank', [1, 1], 7)), [1.55, 0.375, 1.5], turn);
	void crate;
	const lap = new THREE.Group();
	box(0.56, 0.03, 0.38, toon('#9aa3b5'), [0, 0, 0], lap);
	const scr = box(0.56, 0.38, 0.03, toon('#9aa3b5'), [0, 0.19, -0.19], lap);
	scr.rotation.x = -0.25;
	const sc = document.createElement('canvas');
	sc.width = 256;
	sc.height = 160;
	const sg = sc.getContext('2d')!;
	const scTex = new THREE.CanvasTexture(sc);
	scTex.colorSpace = THREE.SRGBColorSpace;
	const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({map: scTex}));
	face.position.set(0, 0.19, -0.17);
	face.rotation.x = -0.25;
	face.layers.set(NOINK);
	lap.add(face);
	lap.position.set(1.55, 0.77, 1.5);
	lap.rotation.y = -0.5;
	turn.add(lap);
	let scKey = -1;
	const drawScreen = (t: number) => {
		const k = Math.floor(t * 8);
		if (k === scKey) return;
		scKey = k;
		sg.fillStyle = '#eaf3ff';
		sg.fillRect(0, 0, 256, 160);
		sg.fillStyle = '#3f6fd8';
		sg.fillRect(0, 0, 256, 22);
		// empty envelope + spinner
		sg.strokeStyle = INK;
		sg.lineWidth = 6;
		sg.lineJoin = 'round';
		sg.fillStyle = '#fff';
		sg.beginPath();
		sg.rect(38, 52, 110, 76);
		sg.fill();
		sg.stroke();
		sg.beginPath();
		sg.moveTo(38, 52);
		sg.lineTo(93, 96);
		sg.lineTo(148, 52);
		sg.stroke();
		for (let i = 0; i < 8; i++) {
			sg.beginPath();
			sg.arc(200 + Math.cos(i * 0.785) * 22, 90 + Math.sin(i * 0.785) * 22, 5, 0, 7);
			sg.fillStyle = `rgba(36,23,38,${((i - k + 800) % 8) / 8})`;
			sg.fill();
		}
		scTex.needsUpdate = true;
	};
	const mk = (shirt: string, goggles: boolean, scale: number, skin: string): Style => ({skin, shirt, pants: '#30385a', hair: '#000', hairKind: 'hood', hood: shirt, goggles, scale});
	const sA = mk('#e23b3b', true, 1, '#ffd9b8');
	const sB = mk('#2f6fe0', false, 0.96, '#c98d5e');
	const sC = mk('#ffc21f', false, 0.86, '#f2c9a0');
	const A = makeCard(scene, PW, PH, 1.8);
	const B = makeCard(scene, PW, PH, 1.8);
	const C = makeCard(scene, PW, PH, 1.8);
	// far things flying east across the sky
	const fl: {c: Card; y: number; z: number; d: number; r: number}[] = [];
	const fDave = makeCard(scene, PW, PH, 9, false);
	const fCat = makeCard(scene, 400, 300, 5, false);
	const fJet = makeCard(scene, 600, 240, 12, false);
	fl.push({c: fDave, y: 20, z: -75, d: 0, r: -1.3}, {c: fCat, y: 14, z: -70, d: 0.25, r: -0.4}, {c: fJet, y: 33, z: -90, d: 0.12, r: 0});
	const fHouse = makeHouse('#fff0d0', '#e0523c', 3);
	const fCouch = box(5, 2, 2.2, toon('#d8433f'), [0, -30, 0], scene);
	scene.add(fHouse);
	const pos = (x: number, z: number, a: number) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)] as [number, number];

	const update = (t: number, cam: THREE.PerspectiveCamera, fx: Fx[]) => {
		const a = poleAngle(t);
		turn.rotation.y = a;
		flags.forEach((f, i) => (f.rotation.y = Math.sin(t * 5 + i) * 0.25));
		drawScreen(t);
		const bl = (s: number) => blinkAt(t, s);
		const sip = t > 53.45 && t < 54.4;
		const pa: Partial<Pose> = {armR: sip ? [0.5, 2.4] : [0.5, 1.6], holdR: 'mug', armL: [0.15, 0.1], eyes: sip ? 'closed' : 'dot', mouth: sip ? 'sip' : 'smile'};
		const typing = t > 54.6;
		const pb: Partial<Pose> = {armR: [0.75, 1.0 + (typing ? Math.sin(t * 26) * 0.12 : 0)], armL: [0.9, 0.9 + (typing ? Math.cos(t * 26) * 0.12 : 0)], eyes: bl(5) ? 'closed' : t > 55.3 ? 'half' : 'dot', mouth: t > 55.3 ? 'flat' : 'smile', look: 0.8, brow: t > 56.3 ? -0.6 : 0};
		const shrug = t > 56.45;
		const pc: Partial<Pose> = {armL: shrug ? [-1.5, -1.9] : [-2.8, -0.2 + Math.sin(t * 7) * 0.25], armR: shrug ? [1.5, 1.9] : [-0.1, -0.1], eyes: bl(7) ? 'closed' : shrug ? 'dot' : 'happy', mouth: shrug ? 'flat' : 'grin'};
		drawCard(A, pkey(pa), (g) => person(g, sA, pa));
		drawCard(B, pkey(pb), (g) => person(g, sB, pb));
		drawCard(C, pkey(pc), (g) => person(g, sC, pc));
		const [ax, az] = pos(-1.5, 0.7, a);
		const [bx, bz] = pos(0.75, 1.55, a);
		const [cx, cz] = pos(1.3, 0.1, a);
		placeCard(A, cam, ax, 0.06, az, 0, tint);
		placeCard(B, cam, bx, 0.06, bz, 0, tint);
		placeCard(C, cam, cx, 0.06, cz, 0, tint);
		if (sip || (t > 46 && t < 53.4)) fx.push({k: 'steam', p: V3(ax + 0.3, sip ? 1.55 : 1.2, az), t});
		// the rest of the world leaves, far behind them
		const fu = (t - 51.8) / 2.2;
		const dp: Partial<Pose> = {armL: [-2.5, -0.3], armR: [2.6, 0.3], eyes: 'wide', mouth: 'scream', legs: 0.8, hair: -1};
		drawCard(fDave, 'f', (g) => person(g, DAVE, dp));
		drawCard(fCat, 'f', (g) => drawCat(g, 'fly', 1));
		drawCard(fJet, 'f', drawJet);
		fl.forEach((o) => {
			const u = fu - o.d;
			placeCard(o.c, cam, lerp(-75, 85, u), o.y + Math.sin(u * 3) * 3, o.z, o.r - u * 2 * (o.r ? 1 : 0), null);
			o.c.mesh.visible = u > 0 && u < 1;
		});
		const hu = fu - 0.3;
		fHouse.position.set(lerp(-90, 95, hu), hu > 0 && hu < 1 ? 26 + Math.sin(hu * 3) * 4 : -60, -95);
		fHouse.rotation.z = -hu * 5;
		const cu = fu - 0.45;
		fCouch.position.set(lerp(-80, 90, cu), cu > 0 && cu < 1 ? 16 : -60, -72);
		fCouch.rotation.set(cu * 6, cu * 3, cu * 8);
	};
	return {scene, update};
};
