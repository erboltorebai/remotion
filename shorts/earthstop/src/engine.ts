import * as THREE from 'three';

// ---------- helpers ----------
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const rnd = (i: number) => {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const NOINK = 1; // layer for cards / sky: never outlined by world ink

// ---------- painted textures ----------
export const paintTex = (
	base: string,
	kind: 'plain' | 'brick' | 'plank' | 'tile' | 'grass' | 'snow' | 'road' | 'roof' = 'plain',
	rep: [number, number] = [1, 1],
	seed = 1,
) => {
	const S = 256;
	const c = document.createElement('canvas');
	c.width = c.height = S;
	const g = c.getContext('2d')!;
	g.fillStyle = base;
	g.fillRect(0, 0, S, S);
	// brush blotches (tileable: draw wrapped copies)
	for (let i = 0; i < 70; i++) {
		const x = rnd(seed * 31 + i) * S;
		const y = rnd(seed * 57 + i * 3) * S;
		const r = 14 + rnd(seed + i * 7) * 40;
		const dark = rnd(seed * 3 + i * 11) > 0.5;
		g.fillStyle = dark ? 'rgba(20,10,60,0.05)' : 'rgba(255,245,210,0.07)';
		for (const ox of [-S, 0, S])
			for (const oy of [-S, 0, S]) {
				g.beginPath();
				g.ellipse(x + ox, y + oy, r, r * (0.4 + rnd(i) * 0.5), rnd(i * 5) * 3, 0, 7);
				g.fill();
			}
	}
	g.strokeStyle = 'rgba(25,12,40,0.45)';
	g.lineWidth = 3;
	const line = (x1: number, y1: number, x2: number, y2: number) => {
		g.beginPath();
		g.moveTo(x1, y1);
		g.lineTo(x2, y2);
		g.stroke();
	};
	if (kind === 'brick') {
		g.strokeStyle = 'rgba(60,25,30,0.35)';
		for (let r = 0; r < 8; r++) {
			line(0, r * 32, S, r * 32);
			for (let k = 0; k < 4; k++) if (rnd(seed + r * 9 + k) > 0.35) line(k * 64 + (r % 2) * 32, r * 32, k * 64 + (r % 2) * 32, r * 32 + 32);
		}
	} else if (kind === 'plank') {
		for (let r = 0; r < 4; r++) {
			line(0, r * 64, S, r * 64);
			line(rnd(seed + r) * S, r * 64, rnd(seed + r) * S, r * 64 + 64);
		}
	} else if (kind === 'tile') {
		for (let r = 0; r < 4; r++) {
			line(0, r * 64, S, r * 64);
			line(r * 64, 0, r * 64, S);
		}
	} else if (kind === 'roof') {
		g.strokeStyle = 'rgba(60,20,20,0.4)';
		for (let r = 0; r < 8; r++) {
			line(0, r * 32, S, r * 32);
			for (let k = 0; k < 8; k++) line(k * 32 + (r % 2) * 16, r * 32, k * 32 + (r % 2) * 16, r * 32 + 32);
		}
	} else if (kind === 'grass' || kind === 'snow') {
		g.strokeStyle = kind === 'grass' ? 'rgba(20,70,30,0.35)' : 'rgba(90,120,190,0.25)';
		g.lineWidth = 2.5;
		for (let i = 0; i < 60; i++) {
			const x = rnd(seed + i * 13) * S;
			const y = rnd(seed + i * 17) * S;
			if (kind === 'grass') {
				line(x, y, x - 3, y - 9);
				line(x + 4, y, x + 6, y - 8);
			} else line(x, y, x + 14, y + 1);
		}
	} else if (kind === 'road') {
		g.fillStyle = 'rgba(255,240,200,0.8)';
		g.fillRect(40, 120, 110, 14);
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(rep[0], rep[1]);
	t.anisotropy = 4;
	return t;
};

const grad = (() => {
	const d = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
	const t = new THREE.DataTexture(d, 2, 1, THREE.RGBAFormat);
	t.minFilter = t.magFilter = THREE.NearestFilter;
	t.needsUpdate = true;
	return t;
})();

export const toon = (color: string | number, map: THREE.Texture | null = null, emissive: string | number = 0) =>
	new THREE.MeshToonMaterial({color: map ? 0xffffff : color, map, gradientMap: grad, emissive});

export const mesh = (
	g: THREE.BufferGeometry,
	m: THREE.Material,
	p: [number, number, number] = [0, 0, 0],
	parent: THREE.Object3D | null = null,
) => {
	const o = new THREE.Mesh(g, m);
	o.position.set(...p);
	o.castShadow = o.receiveShadow = true;
	if (parent) parent.add(o);
	return o;
};
export const box = (
	w: number,
	h: number,
	d: number,
	m: THREE.Material,
	p: [number, number, number],
	parent: THREE.Object3D | null = null,
) => mesh(new THREE.BoxGeometry(w, h, d), m, p, parent);

// ---------- character / sprite cards ----------
export type Card = {
	mesh: THREE.Mesh;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	tex: THREE.CanvasTexture;
	key: string;
	w: number;
	h: number;
	blob: THREE.Mesh | null;
};
const blobTex = (() => {
	let t: THREE.Texture | null = null;
	return () => {
		if (t) return t;
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		const g = c.getContext('2d')!;
		const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
		gr.addColorStop(0, 'rgba(20,10,50,0.55)');
		gr.addColorStop(0.7, 'rgba(20,10,50,0.4)');
		gr.addColorStop(1, 'rgba(20,10,50,0)');
		g.fillStyle = gr;
		g.fillRect(0, 0, 64, 64);
		t = new THREE.CanvasTexture(c);
		return t;
	};
})();

/** A camera-facing card. Design space is dw x dh pixels, world size is hWorld tall, origin at the feet. */
export const makeCard = (parent: THREE.Object3D, dw: number, dh: number, hWorld: number, blob = true, res = 2): Card => {
	const canvas = document.createElement('canvas');
	canvas.width = dw * res;
	canvas.height = dh * res;
	const ctx = canvas.getContext('2d')!;
	ctx.scale(res, res);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	const wWorld = (hWorld * dw) / dh;
	const g = new THREE.PlaneGeometry(wWorld, hWorld);
	g.translate(0, hWorld / 2, 0);
	const m = new THREE.MeshBasicMaterial({map: tex, alphaToCoverage: true, alphaTest: 0.02, side: THREE.DoubleSide});
	const o = new THREE.Mesh(g, m);
	o.layers.set(NOINK);
	o.castShadow = true;
	o.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5});
	parent.add(o);
	let b: THREE.Mesh | null = null;
	if (blob) {
		b = new THREE.Mesh(
			new THREE.PlaneGeometry(wWorld * 0.75, wWorld * 0.4),
			new THREE.MeshBasicMaterial({map: blobTex(), transparent: true, depthWrite: false}),
		);
		b.rotation.x = -Math.PI / 2;
		b.layers.set(NOINK);
		b.renderOrder = 2;
		parent.add(b);
	}
	return {mesh: o, canvas, ctx, tex, key: '', w: dw, h: dh, blob: b};
};

/** Redraw only when the pose key changes. */
export const drawCard = (c: Card, key: string, fn: (g: CanvasRenderingContext2D) => void) => {
	if (c.key === key) return;
	c.key = key;
	c.ctx.clearRect(0, 0, c.w, c.h);
	fn(c.ctx);
	c.tex.needsUpdate = true;
};

/** Place a card at the feet position, facing the camera (yaw only), with optional roll around its middle. */
export const placeCard = (c: Card, cam: THREE.Camera, x: number, y: number, z: number, roll = 0, tint: THREE.Color | null = null, flip = false, groundY = 0) => {
	const m = c.mesh;
	m.position.set(x, y, z);
	const yaw = Math.atan2(cam.position.x - x, cam.position.z - z);
	m.rotation.set(0, yaw, 0);
	if (roll) {
		// roll around the card centre, not the feet
		const h = (m.geometry as THREE.PlaneGeometry).parameters.height / 2;
		m.rotation.order = 'YXZ';
		m.rotation.z = roll;
		m.position.y += h - Math.cos(roll) * h;
		m.position.x += Math.sin(roll) * h * Math.cos(yaw);
		m.position.z -= Math.sin(roll) * h * Math.sin(yaw);
	}
	m.scale.x = flip ? -1 : 1;
	if (tint) (m.material as THREE.MeshBasicMaterial).color.copy(tint);
	if (c.blob) {
		c.blob.position.set(x, groundY + 0.02, z);
		const lift = clamp(1 - (y - groundY) / 4);
		(c.blob.material as THREE.MeshBasicMaterial).opacity = lift;
		c.blob.visible = lift > 0.02;
	}
};

// ---------- sky dome ----------
export const makeSky = (scene: THREE.Scene, top: string, horizon: string, stars = false) => {
	const m = new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {top: {value: new THREE.Color(top)}, hor: {value: new THREE.Color(horizon)}, stars: {value: stars ? 1 : 0}, shift: {value: 0}, streak: {value: 1}},
		vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
		fragmentShader: `varying vec3 d; uniform vec3 top; uniform vec3 hor; uniform float stars; uniform float shift; uniform float streak;
		float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
		void main(){ vec3 n = normalize(d); float t = pow(clamp(n.y*1.15+0.02,0.,1.), 0.55); vec3 c = mix(hor, top, t);
		if(stars>0.5){ vec2 uv = vec2(atan(n.x,n.z)*14. + shift, n.y*22.); vec2 id = floor(uv); vec2 f = fract(uv)-.5; float r = h(id);
		  float s = smoothstep(.09+.1*r, .0, length(f*vec2(streak, 1.))) * step(.72, r); c += vec3(1.,.95,.8)*s*1.6; }
		gl_FragColor = vec4(c, 1.); }`,
	});
	const o = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m);
	o.layers.set(NOINK);
	o.frustumCulled = false;
	scene.add(o);
	return m;
};

// ---------- post pipeline ----------
const quadVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const inkFS = `
varying vec2 vUv; uniform sampler2D tColor, tDepthAll, tNormal, tDepthW; uniform vec2 px; uniform float near, far, inkW; uniform vec3 inkCol;
float lz(float d){ return near*far/(far - d*(far-near)); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float z0 = lz(texture2D(tDepthW, vUv).x);
  vec3 n0 = texture2D(tNormal, vUv).xyz*2.-1.;
  float w = inkW * mix(1., .65, clamp((z0-6.)/80., 0., 1.));
  float dE = 0., nE = 0., zmin = z0;
  for(int i=0;i<8;i++){
    float a = float(i)*0.7853982; vec2 o = vec2(cos(a), sin(a))*px*w;
    float z = lz(texture2D(tDepthW, vUv+o).x); vec3 n = texture2D(tNormal, vUv+o).xyz*2.-1.;
    dE = max(dE, abs(z-z0)/min(z,z0)); nE = max(nE, 1.-dot(n,n0)); zmin = min(zmin, z);
  }
  float slope = clamp(abs(n0.z), .12, 1.);
  float e = max(smoothstep(.035/slope, .07/slope, dE), smoothstep(.25, .5, nE));
  float zAll = lz(texture2D(tDepthAll, vUv).x);
  e *= step(zmin*0.985, zAll);           // a card in front hides world ink
  e *= 1. - smoothstep(150., 320., zmin); // fade far lines
  gl_FragColor = vec4(mix(col, inkCol, e), 1.);
}`;
const dofFS = `
varying vec2 vUv; uniform sampler2D tA, tDepthAll; uniform vec2 px; uniform float near, far, focus, cInf, sat, con, vig, expo; uniform vec3 lift, tintc;
float lz(float d){ return near*far/(far - d*(far-near)); }
float coc(vec2 uv){ float z = lz(texture2D(tDepthAll, uv).x); return cInf * clamp((z-focus)/z, -0.5, 1.); }
void main(){
  float c0 = coc(vUv); vec3 acc = texture2D(tA, vUv).rgb; float wsum = 1.;
  if(cInf > 0.01){
    float r0 = abs(c0);
    for(int i=1;i<=20;i++){
      float fi = float(i); float r = sqrt(fi/20.); float a = fi*2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a))*r*px*max(r0, 1.5);
      float cs = abs(coc(uv)); float w = (r0 > 0.7) ? clamp(cs/max(r0*r, .5), 0., 1.) : clamp(cs - r0, 0., 1.)*0.;
      acc += texture2D(tA, uv).rgb*w; wsum += w;
    }
  }
  vec3 c = acc/wsum * expo;
  c = c*tintc + lift*(1.-c);
  float l = dot(c, vec3(.299,.587,.114));
  c = mix(vec3(l), c, sat);
  c = mix(c, c*c*(3.-2.*c), con);
  vec2 q = vUv-.5; c *= 1. - vig*dot(q,q)*1.6;
  gl_FragColor = vec4(max(c, 0.), 1.);
}`;
const finalFS = `
varying vec2 vUv; uniform sampler2D tA, tB; uniform float xf, flash, whip; uniform vec2 px;
vec3 samp(sampler2D t, vec2 uv){ if(whip < .5) return texture2D(t, uv).rgb; vec3 a = vec3(0.); for(int i=0;i<12;i++){ a += texture2D(t, uv + vec2((float(i)/11.-.5)*whip*px.x, 0.)).rgb; } return a/12.; }
void main(){
  vec3 c = samp(tA, vUv); if(xf > 0.001) c = mix(c, samp(tB, vUv), xf);
  c = mix(c, vec3(1.), flash);
  c = pow(clamp(c, 0., 1.), vec3(1./2.2));
  gl_FragColor = vec4(c, 1.);
}`;

export type Look = {focus: number; cInf: number; sat: number; con: number; vig: number; expo: number; lift: [number, number, number]; tint: [number, number, number]};
export const LOOK0: Look = {focus: 6, cInf: 0, sat: 1.12, con: 0.35, vig: 0.35, expo: 1, lift: [0.015, 0.015, 0.04], tint: [1, 1, 1]};

export class Pipeline {
	r: THREE.WebGLRenderer;
	w: number;
	h: number;
	rtC: THREE.WebGLRenderTarget;
	rtN: THREE.WebGLRenderTarget;
	rtA: THREE.WebGLRenderTarget;
	out: THREE.WebGLRenderTarget[];
	quad: THREE.Mesh;
	qs = new THREE.Scene();
	qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	ink: THREE.ShaderMaterial;
	dof: THREE.ShaderMaterial;
	fin: THREE.ShaderMaterial;
	nmat = new THREE.MeshNormalMaterial();

	constructor(canvas: HTMLCanvasElement, w: number, h: number) {
		this.w = w;
		this.h = h;
		const r = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
		r.setPixelRatio(1);
		r.setSize(w, h, false);
		r.shadowMap.enabled = true;
		r.shadowMap.type = THREE.PCFSoftShadowMap;
		r.outputColorSpace = THREE.LinearSRGBColorSpace;
		r.toneMapping = THREE.NoToneMapping;
		this.r = r;
		const mk = (samples: number, depth: boolean) => {
			const t = new THREE.WebGLRenderTarget(w, h, {type: THREE.HalfFloatType, samples, depthBuffer: depth});
			if (depth) t.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
			t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
			return t;
		};
		this.rtC = mk(4, true);
		this.rtN = mk(0, true);
		this.rtA = mk(0, false);
		this.out = [mk(0, false), mk(0, false)];
		const px = new THREE.Vector2(1 / w, 1 / h);
		const k = h / 1920;
		this.ink = new THREE.ShaderMaterial({
			vertexShader: quadVS,
			fragmentShader: inkFS,
			uniforms: {tColor: {value: null}, tDepthAll: {value: null}, tNormal: {value: null}, tDepthW: {value: null}, px: {value: px}, near: {value: 0.1}, far: {value: 500}, inkW: {value: 2.4 * k}, inkCol: {value: new THREE.Color(0x030303)}},
		});
		this.dof = new THREE.ShaderMaterial({
			vertexShader: quadVS,
			fragmentShader: dofFS,
			uniforms: {tA: {value: null}, tDepthAll: {value: null}, px: {value: px}, near: {value: 0.1}, far: {value: 500}, focus: {value: 6}, cInf: {value: 0}, sat: {value: 1}, con: {value: 0}, vig: {value: 0}, expo: {value: 1}, lift: {value: new THREE.Vector3()}, tintc: {value: new THREE.Vector3(1, 1, 1)}},
		});
		this.fin = new THREE.ShaderMaterial({
			vertexShader: quadVS,
			fragmentShader: finalFS,
			uniforms: {tA: {value: null}, tB: {value: null}, xf: {value: 0}, flash: {value: 0}, whip: {value: 0}, px: {value: px}},
		});
		this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ink);
		this.quad.frustumCulled = false;
		this.qs.add(this.quad);
	}

	pass(m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
		this.quad.material = m;
		this.r.setRenderTarget(target);
		this.r.render(this.qs, this.qc);
	}

	/** Render one shot into out[slot]. */
	shot(scene: THREE.Scene, cam: THREE.PerspectiveCamera, look: Look, slot: number, inkOn = true) {
		const r = this.r;
		const k = this.h / 1920;
		cam.layers.enableAll();
		r.setRenderTarget(this.rtC);
		r.render(scene, cam);
		// world-only normals + depth for the ink
		cam.layers.set(0);
		const bg = scene.background;
		scene.background = null;
		scene.overrideMaterial = this.nmat;
		const sm = r.shadowMap.autoUpdate;
		r.shadowMap.autoUpdate = false;
		r.setRenderTarget(this.rtN);
		r.setClearColor(0x8080ff, 1);
		r.clear();
		r.render(scene, cam);
		r.shadowMap.autoUpdate = sm;
		scene.overrideMaterial = null;
		scene.background = bg;
		cam.layers.enableAll();
		r.setClearColor(0x000000, 1);
		const u = this.ink.uniforms;
		u.tColor.value = this.rtC.texture;
		u.tDepthAll.value = this.rtC.depthTexture;
		u.tNormal.value = this.rtN.texture;
		u.tDepthW.value = this.rtN.depthTexture;
		u.near.value = cam.near;
		u.far.value = cam.far;
		u.inkW.value = inkOn ? 2.4 * k : 0;
		this.pass(this.ink, this.rtA);
		const d = this.dof.uniforms;
		d.tA.value = this.rtA.texture;
		d.tDepthAll.value = this.rtC.depthTexture;
		d.near.value = cam.near;
		d.far.value = cam.far;
		d.focus.value = look.focus;
		d.cInf.value = look.cInf * k;
		d.sat.value = look.sat;
		d.con.value = look.con;
		d.vig.value = look.vig;
		d.expo.value = look.expo;
		d.lift.value.set(...look.lift);
		d.tintc.value.set(...look.tint);
		this.pass(this.dof, this.out[slot]);
	}

	present(xf: number, flash: number, whip: number) {
		const u = this.fin.uniforms;
		u.tA.value = this.out[0].texture;
		u.tB.value = this.out[1].texture;
		u.xf.value = xf;
		u.flash.value = flash;
		u.whip.value = whip * (this.h / 1920);
		this.pass(this.fin, null);
	}
}

/** Standard light rig: warm key with shadows + blue-violet fill. */
export const lightRig = (scene: THREE.Scene, sunDir: THREE.Vector3, sunCol: number | string, sunI: number, skyCol: number | string, groundCol: number | string, ambI: number, area = 30) => {
	const sun = new THREE.DirectionalLight(sunCol, sunI * Math.PI);
	sun.position.copy(sunDir.clone().normalize().multiplyScalar(60));
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	const c = sun.shadow.camera;
	c.left = -area;
	c.right = area;
	c.top = area;
	c.bottom = -area;
	c.near = 1;
	c.far = 160;
	sun.shadow.bias = -0.0006;
	sun.shadow.normalBias = 0.04;
	sun.shadow.radius = 2.5;
	scene.add(sun, sun.target);
	const hemi = new THREE.HemisphereLight(skyCol, groundCol, ambI * Math.PI);
	scene.add(hemi);
	return {sun, hemi};
};
