import * as THREE from 'three';
import {clamp, easeOut} from './engine';
import {poleAngle, T_BRAKE2, T_BUS_BRAKE, T_BUS_SPLAT, T_HOOK_BURST, T_HOOK_STOP, T_K_JOLT, T_K_SMASH} from './scenes';

export const FPS = 30;
export const DURATION = 1725;
export type SceneId = 'space' | 'street' | 'kitchen' | 'bus' | 'pole';
type P3 = [number, number, number];
/** Camera key: at time t the camera bursts (ease-out over dur) to this pose, then holds with a slow push-in. */
export type Key = {t: number; p: P3; l: P3; fov: number; roll?: number; dur?: number; c?: number; loc?: boolean; creep?: number; lf?: (t: number) => P3};
export type Shot = {id: string; a: number; b: number; scene: SceneId; keys: Key[]; xf?: boolean; sat?: number};

export const SHOTS: Shot[] = [
	{id: 'hook_space', a: 0, b: 1.95, scene: 'space', keys: [
		{t: 0, p: [0, 1, 23], l: [0, 0, 0], fov: 42},
		{t: T_HOOK_STOP, p: [0, 0.6, 18.5], l: [0, 0, 0], fov: 42, roll: 4, dur: 0.3},
		{t: 1.4, p: [1.0, 0.6, 14], l: [0.6, 0, 4.9], fov: 40, dur: 0.55},
	]},
	{id: 'hook_street', a: 1.95, b: 5.2, scene: 'street', xf: true, keys: [
		{t: 1.95, p: [10.5, 1.5, 10], l: [4, 2.3, -0.6], fov: 48},
		{t: T_HOOK_BURST + 0.04, p: [10.5, 1.5, 10], l: [26, 6, 4], lf: (t) => [5.5 + (t - T_HOOK_BURST) * 13, 1.9 + (t - T_HOOK_BURST) * 2.4, -0.6 + (t - T_HOOK_BURST) * 2], fov: 52, roll: -5, dur: 0.25, creep: 0},
		{t: 4.2, p: [11.5, 1.6, 6.5], l: [4, 2.1, -0.6], fov: 34, roll: 5, dur: 0.35, c: 6},
	]},
	{id: 'kitchen', a: 5.2, b: 10.75, scene: 'kitchen', keys: [
		{t: 5.2, p: [-0.2, 1.7, 7.6], l: [-0.2, 1.35, -2], fov: 48},
		{t: 6.05, p: [-0.75, 1.5, 2.3], l: [-0.95, 1.22, -2.1], fov: 40, dur: 0.4, c: 11},
		{t: 8.55, p: [0.7, 1.25, 5.2], l: [0.1, 0.95, -1], fov: 46, dur: 0.4, c: 6},
		{t: 9.52, p: [0, 9, 8], l: [0, 1, -1], fov: 55, dur: 0.5},
		{t: 10.25, p: [0, 26, 14], l: [0, 1, -1], fov: 55, dur: 0.6},
	]},
	{id: 'limb', a: 10.75, b: 16.78, scene: 'space', xf: true, keys: [
		{t: 10.6, p: [0, 26, 70], l: [0, 2, 0], fov: 40},
		{t: 10.85, p: [1.5, 4.6, 27], l: [0, 5.8, 0], fov: 44, dur: 0.6},
		{t: 13.95, p: [1.5, 4.2, 25], l: [0, 7.2, 0], fov: 44, dur: 0.35},
		{t: 15.7, p: [1.2, 4.0, 24], l: [0, 6.6, 0], fov: 46, roll: -3, dur: 0.3},
	]},
	{id: 'question', a: 16.78, b: 18.64, scene: 'kitchen', xf: true, keys: [
		{t: 16.78, p: [-0.7, 1.52, 1.0], l: [-0.88, 1.42, -2.1], fov: 34, roll: 3, c: 13},
		{t: 17.5, p: [-0.75, 1.55, 0.3], l: [-0.86, 1.5, -2.1], fov: 34, roll: 3, dur: 0.25, c: 13},
	]},
	{id: 'yousee', a: 18.64, b: 21.78, scene: 'kitchen', keys: [
		{t: 18.64, p: [-0.4, 1.5, 3.2], l: [-0.9, 1.25, -2.1], fov: 40, c: 9},
		{t: 20.45, p: [-1.15, 1.42, -0.5], l: [-1.3, 1.3, -2.05], fov: 30, dur: 0.25, c: 14},
		{t: 21.05, p: [1.0, 0.55, 3.9], l: [0.95, 0.33, 1.5], fov: 34, dur: 0.25, c: 13},
		{t: 21.52, p: [-0.2, 1.7, 7.4], l: [-0.2, 1.4, -2], fov: 48, dur: 0.25},
	]},
	{id: 'bus', a: 21.78, b: 29.36, scene: 'bus', xf: true, sat: 1.08, keys: [
		{t: 21.78, p: [6.4, 1.55, 0.15], l: [-6, 1.3, 0], fov: 50},
		{t: 23.95, p: [5.3, 1.5, 0.1], l: [1.2, 1.18, 0.05], fov: 40, dur: 0.3, c: 9},
		{t: 24.82, p: [5.3, 1.5, 0.1], l: [-0.12, 1.22, 0.86], fov: 24, dur: 0.22, c: 9},
		{t: 25.45, p: [6.4, 1.55, 0.15], l: [-6, 1.3, 0], fov: 50, dur: 0.3},
		{t: T_BUS_BRAKE, p: [6.4, 1.5, 0.15], l: [-6, 1.35, 0], fov: 53, roll: -4, dur: 0.2},
	]},
	{id: 'brake_space', a: 29.36, b: 31.22, scene: 'space', keys: [
		{t: 29.36, p: [0, 0.8, 21], l: [0, 0, 0], fov: 42},
		{t: T_BRAKE2, p: [0, 0.5, 16.5], l: [0, 0, 0], fov: 42, roll: -5, dur: 0.3},
	]},
	{id: 'brake_kitchen', a: 31.22, b: 33.9, scene: 'kitchen', keys: [
		{t: 31.22, p: [-0.3, 1.6, 7.3], l: [0, 1.3, -1.5], fov: 48},
		{t: 32.24, p: [0.2, 1.55, 6.6], l: [1.3, 1.4, -1.5], fov: 46, roll: -4, dur: 0.3},
		{t: T_K_SMASH - 0.06, p: [1.0, 1.5, 5.4], l: [3.9, 1.5, -0.9], fov: 44, roll: -6, dur: 0.22},
	]},
	{id: 'stream', a: 33.9, b: 36.5, scene: 'street', keys: [
		{t: 33.9, p: [11, 1.6, 10.5], l: [5, 2.1, -0.6], fov: 48},
		{t: 34.18, p: [11, 1.6, 10.5], l: [7.5, 2.6, 0], fov: 48, roll: -2, dur: 0.25},
		{t: 35.1, p: [11.3, 1.6, 11], l: [8, 2.8, 0], fov: 50, roll: 2, dur: 0.25},
		{t: 35.86, p: [12.5, 1.8, 13], l: [6, 4.2, -0.6], fov: 54, roll: -4, dur: 0.25},
	]},
	{id: 'wind', a: 36.5, b: 40.9, scene: 'street', keys: [
		{t: 36.5, p: [-2, 1.2, 16], l: [4, 4.2, 0], fov: 52, roll: 6},
		{t: 37.8, p: [9, 1.4, 15], l: [15, 4.6, -1], fov: 50, roll: -6, dur: 0.35},
		{t: 39.5, p: [0, 2.2, 23], l: [8, 6.5, -4], fov: 58, roll: 8, dur: 0.35},
	]},
	{id: 'ocean', a: 40.9, b: 44.86, scene: 'street', keys: [
		{t: 40.9, p: [-6, 1.7, 26], l: [-44, 9, -6], fov: 55},
		{t: 43.05, p: [-2, 1.5, 23], l: [-27, 12, -6], fov: 60, roll: -5, dur: 0.35},
	]},
	{id: 'safe_space', a: 44.86, b: 45.76, scene: 'space', keys: [
		{t: 44.7, p: [0, 0.5, 17], l: [0, 0, 0], fov: 42},
		{t: 44.86, p: [0, -14, 9.5], l: [0, -4.4, 0], fov: 38, dur: 0.75},
	]},
	{id: 'pole', a: 45.76, b: 57.6, scene: 'pole', xf: true, keys: [
		{t: 45.76, p: [0, 2.0, 8.6], l: [0, 1.5, 0], fov: 50},
		{t: 46.35, p: [0, 1.6, 6.6], l: [0, 1.2, 0], fov: 44, dur: 0.4, c: 5},
		{t: 48.65, p: [0, 11, 6.5], l: [0, 0.3, 0], fov: 46, dur: 0.45},
		{t: 51.88, p: [0, 0.8, 6.8], l: [0, 4.4, -10], fov: 60, dur: 0.4},
		{t: 53.42, p: [-1.2, 1.5, 3.6], l: [-1.5, 1.4, 0.7], fov: 32, dur: 0.3, c: 13, loc: true},
		{t: 54.82, p: [1.3, 1.45, 5.6], l: [1.15, 1.1, 1.5], fov: 38, dur: 0.35, c: 10, loc: true},
		{t: 56.42, p: [0.95, 1.45, 5.0], l: [1.0, 1.2, 1.5], fov: 34, dur: 0.3, c: 10, loc: true},
	]},
];

export const FLASH_AT = [5.2, 29.36]; // white flash after the hook / the splat
export const WHIP_AT = [33.9, 36.5, 40.9, 31.22];
export const KICKS = [T_HOOK_STOP, T_HOOK_BURST, T_BUS_BRAKE, T_BUS_SPLAT, T_BRAKE2, T_K_JOLT, T_K_SMASH, 34.2, 34.72, 35.12, 35.9];
export const XF = 0.12; // half length of a dissolve (s)

export const shotAt = (t: number) => {
	let i = SHOTS.findIndex((s) => t >= s.a && t < s.b);
	if (i < 0) i = SHOTS.length - 1;
	return i;
};

export type CamState = {p: THREE.Vector3; l: THREE.Vector3; fov: number; roll: number; c: number};
const keyState = (k: Key, t: number): CamState => {
	const p = new THREE.Vector3(...k.p);
	const l = new THREE.Vector3(...(k.lf ? k.lf(t) : k.l));
	if (k.loc) {
		const a = poleAngle(t);
		for (const v of [p, l]) v.set(v.x * Math.cos(a) + v.z * Math.sin(a), v.y, -v.x * Math.sin(a) + v.z * Math.cos(a));
	}
	// slow push-in while holding
	const hold = Math.max(0, t - k.t);
	p.lerp(l, 1 - Math.exp(-hold * (k.creep ?? 0.028)));
	return {p, l, fov: k.fov, roll: k.roll ?? 0, c: k.c ?? 0};
};

export const camAt = (shot: Shot, t: number, f: number): CamState => {
	const ks = shot.keys;
	let i = 0;
	for (let j = 0; j < ks.length; j++) if (t >= ks[j].t) i = j;
	const cur = keyState(ks[i], t);
	if (i > 0) {
		const u = easeOut((t - ks[i].t) / (ks[i].dur ?? 0.33));
		if (u < 1) {
			const prev = keyState(ks[i - 1], t);
			cur.p.lerpVectors(prev.p, cur.p, u);
			cur.l.lerpVectors(prev.l, cur.l, u);
			cur.fov = prev.fov + (cur.fov - prev.fov) * u;
			cur.roll = prev.roll + (cur.roll - prev.roll) * u;
			cur.c = prev.c + (cur.c - prev.c) * u;
		}
	}
	// impact kicks: flip sign every frame, decay over 7 frames
	for (const kt of KICKS) {
		const n = f - Math.round(kt * FPS);
		if (n >= 0 && n < 7) {
			const amp = 0.09 * (1 - n / 7) * (n % 2 ? -1 : 1) * (cur.p.distanceTo(cur.l) / 8);
			cur.p.y += amp;
			cur.l.y += amp * 0.6;
			cur.roll += amp * 6;
		}
	}
	return cur;
};

export const flashAt = (f: number) => {
	let v = 0;
	for (const t of FLASH_AT) {
		const n = f - Math.round(t * FPS);
		if (n >= -1 && n < 3) v = Math.max(v, [0.55, 0.9, 0.5, 0.2][n + 1]);
	}
	return v;
};
export const whipAt = (f: number) => {
	let v = 0;
	for (const t of WHIP_AT) {
		const n = f - Math.round(t * FPS);
		if (n >= -2 && n < 3) v = Math.max(v, [60, 140, 150, 80, 30][n + 2]);
	}
	return v;
};
void clamp;
