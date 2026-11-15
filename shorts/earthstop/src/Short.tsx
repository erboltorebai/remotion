import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {clamp, LOOK0, Pipeline, rnd} from './engine';
import {buildBus, buildKitchen, buildPole, buildSpace, buildStreet, Fx, SceneApi} from './scenes';
import {camAt, flashAt, FPS, SceneId, shotAt, SHOTS, whipAt, XF} from './story';
import words from './words.json';

const W = 1080;
const H = 1920;
const INK = '#241726';

type Rig = {pipe: Pipeline; scenes: Partial<Record<SceneId, SceneApi>>; cam: THREE.PerspectiveCamera};
const builders: Record<SceneId, () => SceneApi> = {space: buildSpace, street: buildStreet, kitchen: buildKitchen, bus: buildBus, pole: buildPole};

// ---------- 2D effect sprites (flat cartoon, composited over the 3D picture) ----------
const drawFx = (g: CanvasRenderingContext2D, fx: Fx[], cam: THREE.PerspectiveCamera, f: number) => {
	const proj = (p: THREE.Vector3) => {
		const v = p.clone().project(cam);
		const d = p.distanceTo(cam.position);
		const s = (H / 2 / Math.tan((cam.fov * Math.PI) / 360) / d) * (v.z < 1 ? 1 : 0); // px per metre
		return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, s};
	};
	g.lineCap = 'round';
	g.lineJoin = 'round';
	for (const e of fx) {
		if (e.k === 'speed' || e.k === 'wind') {
			const n = e.k === 'speed' ? 26 : 34;
			for (let i = 0; i < n; i++) {
				const seed = i * 7 + Math.floor(f / 2) * 13;
				const y = rnd(seed) * H;
				const len = (160 + rnd(seed + 1) * 420) * (e.k === 'wind' ? 1.4 : 1);
				const x = rnd(seed + 2) * (W + len) - len + (f % 2) * 60;
				g.globalAlpha = e.a * (0.35 + rnd(seed + 3) * 0.5);
				g.strokeStyle = '#fff';
				g.lineWidth = 4 + rnd(seed + 4) * 7;
				g.beginPath();
				g.moveTo(x, y);
				if (e.k === 'wind') g.quadraticCurveTo(x + len / 2, y - 26 + rnd(seed + 5) * 52, x + len, y);
				else g.lineTo(x + len, y);
				g.stroke();
			}
			g.globalAlpha = 1;
		} else if (e.k === 'star') {
			const q = proj(e.p);
			const u = e.age / 12;
			const r = q.s * e.s * (0.35 + 0.65 * Math.min(1, e.age / 3));
			g.globalAlpha = clamp(1.6 - u * 1.6);
			g.beginPath();
			for (let i = 0; i < 20; i++) {
				const a = (i / 20) * Math.PI * 2 + 0.2;
				const rr = i % 2 ? r * 0.45 : r * (0.85 + rnd(i) * 0.3);
				g.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
			}
			g.closePath();
			g.fillStyle = '#ffe14a';
			g.fill();
			g.lineWidth = 9;
			g.strokeStyle = INK;
			g.stroke();
			g.beginPath();
			for (let i = 0; i < 20; i++) {
				const a = (i / 20) * Math.PI * 2 + 0.2;
				const rr = (i % 2 ? r * 0.45 : r * 0.9) * 0.5;
				g.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr);
			}
			g.closePath();
			g.fillStyle = '#fff';
			g.fill();
			g.globalAlpha = 1;
		} else if (e.k === 'puff') {
			const q = proj(e.p);
			const u = e.age / 12;
			g.globalAlpha = clamp(1.4 - u * 1.4);
			for (let i = 0; i < 6; i++) {
				const a = i * 1.05;
				const d = q.s * e.s * 0.5 * (0.3 + u);
				g.beginPath();
				g.arc(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d * 0.7, q.s * e.s * (0.22 + rnd(i) * 0.12) * (1 - u * 0.4), 0, 7);
				g.fillStyle = '#f6efe6';
				g.fill();
				g.lineWidth = 7;
				g.strokeStyle = INK;
				g.stroke();
			}
			g.globalAlpha = 1;
		} else if (e.k === 'spark') {
			const q = proj(e.p);
			const u = e.age / 16;
			g.globalAlpha = clamp(1.5 - u * 1.5);
			const r = q.s * e.s * (0.25 + u * 0.5);
			g.lineWidth = 9;
			g.strokeStyle = '#ffe14a';
			for (let i = 0; i < 6; i++) {
				const a = i * 1.047 + e.p.x;
				g.beginPath();
				g.moveTo(q.x + Math.cos(a) * r * 0.5, q.y + Math.sin(a) * r * 0.5);
				g.lineTo(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r);
				g.stroke();
			}
			g.globalAlpha = 1;
		} else if (e.k === 'skid') {
			// brake marks around the globe
			const u = e.a / 16;
			g.globalAlpha = clamp(1.3 - u * 1.3);
			g.strokeStyle = '#fff';
			g.lineWidth = 12;
			const q = proj(e.p);
			for (let i = 0; i < 3; i++) {
				g.beginPath();
				g.ellipse(q.x, q.y, q.s * (5.9 + i * 0.5), q.s * (1.2 + i * 0.25), -0.12, Math.PI * 0.08, Math.PI * 0.42);
				g.stroke();
				g.beginPath();
				g.ellipse(q.x, q.y, q.s * (5.9 + i * 0.5), q.s * (1.2 + i * 0.25), -0.12, Math.PI * 0.6, Math.PI * 0.92);
				g.stroke();
			}
			g.globalAlpha = 1;
		} else if (e.k === 'q') {
			const q = proj(e.p);
			const pop = Math.min(1, e.age / 4);
			const sc = (q.s * 0.75 * (0.4 + 0.6 * pop) * (1 + 0.25 * Math.max(0, 1 - e.age / 6))) / 100;
			g.save();
			g.translate(q.x, q.y);
			g.rotate(0.2 + Math.sin(e.age * 0.2) * 0.06);
			g.scale(sc, sc);
			g.font = '900 150px Inter, sans-serif';
			g.textAlign = 'center';
			g.lineWidth = 26;
			g.strokeStyle = INK;
			g.strokeText('?', 0, 50);
			g.fillStyle = '#ffe14a';
			g.fillText('?', 0, 50);
			g.restore();
		} else if (e.k === 'zzz') {
			const q = proj(e.p);
			for (let i = 0; i < 3; i++) {
				const u = (e.t * 0.9 + i / 3) % 1;
				g.globalAlpha = Math.sin(u * Math.PI);
				g.font = `900 ${q.s * (0.16 + u * 0.16)}px Inter, sans-serif`;
				g.lineWidth = q.s * 0.035;
				g.strokeStyle = INK;
				const x = q.x + u * q.s * 0.35 + Math.sin(u * 9) * 8;
				const y = q.y - u * q.s * 0.6;
				g.strokeText('z', x, y);
				g.fillStyle = '#fff';
				g.fillText('z', x, y);
			}
			g.globalAlpha = 1;
		} else if (e.k === 'steam') {
			const q = proj(e.p);
			g.strokeStyle = '#fff';
			for (let i = 0; i < 2; i++) {
				const u = (e.t * 0.7 + i * 0.5) % 1;
				g.globalAlpha = Math.sin(u * Math.PI) * 0.8;
				g.lineWidth = q.s * 0.022;
				const x = q.x + (i - 0.5) * q.s * 0.07;
				const y = q.y - u * q.s * 0.25;
				g.beginPath();
				g.moveTo(x, y);
				g.bezierCurveTo(x + q.s * 0.05, y - q.s * 0.05, x - q.s * 0.05, y - q.s * 0.1, x, y - q.s * 0.15);
				g.stroke();
			}
			g.globalAlpha = 1;
		} else if (e.k === 'pour') {
			const a = proj(e.a);
			const b = proj(e.b);
			g.beginPath();
			g.moveTo(a.x, a.y);
			g.quadraticCurveTo(b.x + (a.x - b.x) * 0.15, a.y, b.x, b.y);
			g.lineWidth = a.s * 0.05;
			g.strokeStyle = INK;
			g.stroke();
			g.lineWidth = a.s * 0.028;
			g.strokeStyle = '#7a4420';
			g.stroke();
		} else if (e.k === 'sonic') {
			const q = proj(e.p);
			g.strokeStyle = INK;
			for (let pass = 0; pass < 2; pass++)
				for (let i = 0; i < 4; i++) {
					g.lineWidth = pass ? q.s * 0.16 : q.s * 0.3;
					g.strokeStyle = pass ? '#fff' : INK;
					g.beginPath();
					g.arc(q.x - q.s * 1.2, q.y, q.s * (0.8 + i * 0.75), -0.75, 0.75);
					g.stroke();
				}
		} else if (e.k === 'crack') {
			g.strokeStyle = '#fff';
			g.lineWidth = 6;
			g.globalAlpha = 0.9;
			const n = Math.min(9, 3 + Math.floor(e.age));
			for (let i = 0; i < n; i++) {
				const a = i * 0.7 + 0.3;
				let x = W / 2;
				let y = H * 0.44;
				g.beginPath();
				g.moveTo(x, y);
				for (let k = 1; k <= 5; k++) {
					x += Math.cos(a + (rnd(i * 9 + k) - 0.5) * 0.9) * 150;
					y += Math.sin(a + (rnd(i * 9 + k) - 0.5) * 0.9) * 150;
					g.lineTo(x, y);
				}
				g.stroke();
			}
			g.globalAlpha = 1;
		}
	}
};

// ---------- subtitles: 2-4 words, current word highlighted ----------
type Wd = {w: string; s: number; e: number};
const CAPS = (() => {
	const out: Wd[][] = [];
	let cur: Wd[] = [];
	(words as Wd[]).forEach((w, i, all) => {
		cur.push(w);
		const end = /[.,?!]$/.test(w.w);
		const next = all[i + 1];
		const len = cur.reduce((a, c) => a + c.w.length + 1, 0);
		if (!next || (end && cur.length >= 2) || cur.length >= 4 || len > 17 || (next && next.s - w.e > 0.35) || (/[.?!]$/.test(w.w))) {
			out.push(cur);
			cur = [];
		}
	});
	return out;
})();

const Captions: React.FC<{t: number}> = ({t}) => {
	let ci = 0;
	for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0].s - 0.04) ci = i;
	const cap = CAPS[ci];
	const stroke = '#1b1024';
	const sh: string[] = [];
	for (let a = 0; a < 16; a++) sh.push(`${(Math.cos((a / 16) * 6.283) * 9).toFixed(1)}px ${(Math.sin((a / 16) * 6.283) * 9).toFixed(1)}px 0 ${stroke}`);
	sh.push(`0 14px 0 ${stroke}`);
	return (
		<div style={{position: 'absolute', left: 60, right: 60, top: H * 0.685, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 104, lineHeight: 1.08, letterSpacing: -1, textShadow: sh.join(','), color: '#fff'}}>
			{cap.map((w, i) => {
				const on = t >= w.s - 0.04 && (i === cap.length - 1 || t < cap[i + 1].s - 0.04);
				return (
					<span key={i} style={{color: on ? '#ffe14a' : '#fff', display: 'inline-block', margin: '0 13px', transform: on ? 'scale(1.08)' : 'none'}}>
						{w.w}
					</span>
				);
			})}
		</div>
	);
};

export const Short: React.FC<{captions: boolean; rs: number}> = ({captions, rs}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const glRef = useRef<HTMLCanvasElement>(null);
	const fxRef = useRef<HTMLCanvasElement>(null);
	const rig = useRef<Rig | null>(null);
	const t = frame / FPS;

	useLayoutEffect(() => {
		if (!rig.current) {
			const k = rs;
			rig.current = {pipe: new Pipeline(glRef.current!, Math.round(W * k), Math.round(H * k)), scenes: {}, cam: new THREE.PerspectiveCamera(45, W / H, 0.1, 900)};
		}
		const {pipe, scenes, cam} = rig.current;
		const render = (si: number, slot: number) => {
			const shot = SHOTS[si];
			const api = (scenes[shot.scene] ??= builders[shot.scene]());
			const cs = camAt(shot, t, frame);
			cam.fov = cs.fov;
			cam.position.copy(cs.p);
			cam.up.set(0, 1, 0);
			cam.lookAt(cs.l);
			cam.rotateZ((cs.roll * Math.PI) / 180);
			cam.updateProjectionMatrix();
			cam.updateMatrixWorld(true);
			const fx: Fx[] = [];
			api.update(t, cam, fx);
			pipe.shot(api.scene, cam, {...LOOK0, focus: cs.p.distanceTo(cs.l), cInf: cs.c, sat: shot.sat ?? LOOK0.sat}, slot);
			return {fx, cam: cam.clone()};
		};
		const si = shotAt(t);
		const shot = SHOTS[si];
		const next = SHOTS[si + 1];
		const prev = SHOTS[si - 1];
		let xf = 0;
		let main: {fx: Fx[]; cam: THREE.PerspectiveCamera};
		if (next && next.xf && shot.b - t < XF) {
			// first half of a dissolve: current shot + incoming
			xf = 0.5 * (1 - (shot.b - t) / XF);
			render(si + 1, 1);
			main = render(si, 0);
		} else if (shot.xf && prev && t - shot.a < XF) {
			xf = 0.5 * (1 - (t - shot.a) / XF);
			render(si - 1, 1);
			main = render(si, 0);
		} else main = render(si, 0);
		pipe.present(xf, flashAt(frame), whipAt(frame));
		const g = fxRef.current!.getContext('2d')!;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, W, H);
		g.globalAlpha = 1;
		if (xf < 0.3) drawFx(g, main.fx, main.cam, frame);
	}, [frame, t, width, height, rs]);

	const style = useMemo(() => ({position: 'absolute' as const, left: 0, top: 0, width: W, height: H}), []);
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			{/* layout is authored at 1080x1920; the composition is 720x1280 so that --scale 2 gives exactly 1440x2560 */}
			<div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${width / W})`, transformOrigin: '0 0'}}>
				<canvas ref={glRef} style={style} />
				<canvas ref={fxRef} width={W} height={H} style={style} />
				{captions ? <Captions t={t} /> : null}
			</div>
		</AbsoluteFill>
	);
};
