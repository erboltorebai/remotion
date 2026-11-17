import * as THREE from 'three';
import {easeOut, sstep} from './engine';
import {hillP, linePos, pulseU, T_ALARM, T_ALLPRESS, T_CITY, T_COMBINED, T_DRYER, T_GAME_END, T_JUMP, T_OUT1, T_PRESS, T_PULL, T_YOURS, T_ZERO} from './scenes';

export const FPS = 30;
export const DURATION = 1730;
export type SceneId = 'kitchen' | 'street' | 'plant' | 'hill' | 'control' | 'city';
type P3 = [number, number, number];
/** Camera key: at time t the camera moves (ease-out burst, or a glide) to this pose, then holds with a slow push-in. */
export type Key = {t: number; p: P3; l: P3; fov: number; roll?: number; dur?: number; c?: number; creep?: number; glide?: boolean; pf?: (t: number) => P3; lf?: (t: number) => P3};
export type Shot = {id: string; a: number; b: number; scene: SceneId; keys: Key[]; xf?: boolean; expo?: number; sat?: number};
const H = hillP;
const trackP = (t: number): P3 => {
	const q = linePos(pulseU(t));
	return [q.x - 5, q.y * 0.45 + 1.5, q.z + 13];
};
const trackL = (t: number): P3 => {
	const q = linePos(pulseU(t));
	return [q.x, q.y, q.z];
};

export const SHOTS: Shot[] = [
	{id: 'hook_kitchen', a: 0, b: 2.35, scene: 'kitchen', keys: [
		{t: 0, p: [0.2, 1.5, 2.6], l: [0.1, 1.32, -2.6], fov: 44, c: 8},
		{t: T_PRESS - 0.05, p: [-0.05, 1.42, 0.3], l: [-0.2, 1.3, -3], fov: 38, dur: 0.25, c: 9},
		{t: 1.95, p: [0, 8, 9], l: [0, 1.2, -2], fov: 50, dur: 0.5},
	]},
	{id: 'hook_street', a: 2.35, b: 4.25, scene: 'street', xf: true, keys: [
		{t: 2.35, p: [0, 9, 34], l: [0, 2.5, -22], fov: 52, creep: 0.05},
	]},
	{id: 'hook_dark', a: 4.25, b: 5.6, scene: 'kitchen', xf: true, expo: 1.25, keys: [
		{t: 4.25, p: [0.3, 1.5, 1.7], l: [0.1, 1.35, -2.6], fov: 40, roll: 3, c: 9},
	]},
	{id: 'game', a: 5.6, b: 8.55, scene: 'kitchen', keys: [
		{t: 5.6, p: [-1.5, 1.6, 3.9], l: [-2.15, 1.7, -2.5], fov: 46, c: 7},
		{t: 6.95, p: [-2.1, 1.7, 1.3], l: [-2.45, 2.15, -3.4], fov: 40, dur: 0.3, c: 5},
	]},
	{id: 'hood', a: 8.55, b: 12.5, scene: 'street', xf: true, keys: [
		{t: 8.55, p: [0, 4.5, 24], l: [0, 3, -10], fov: 50},
		{t: 9.2, p: [0, 24, 48], l: [0, 0, -30], fov: 54, dur: 2.3, glide: true},
	]},
	{id: 'one_mw', a: 12.5, b: 15.75, scene: 'kitchen', keys: [
		{t: 12.5, p: [-0.3, 1.4, -0.5], l: [-0.38, 1.28, -3.05], fov: 34, c: 12},
		{t: 13.7, p: [0.15, 1.45, 1.7], l: [0.1, 1.3, -2.6], fov: 40, dur: 0.3, c: 9},
		{t: T_DRYER - 0.08, p: [1.9, 1.5, 2.1], l: [2.25, 1.3, -1.9], fov: 38, dur: 0.25, c: 10},
	]},
	{id: 'plant', a: 15.75, b: 21.84, scene: 'plant', xf: true, keys: [
		{t: 15.75, p: [-22, 2, 14], l: [-16, 13, -32], fov: 58},
		{t: 16.9, p: [40, 2.5, 16], l: [52, 13, -32], fov: 58, dur: 2.9, glide: true},
		{t: T_COMBINED - 0.05, p: [30, 7, 54], l: [34, 13, -32], fov: 62, roll: -4, dur: 0.3},
		{t: 20.85, p: [-1.2, 1.55, 12.6], l: [-1.5, 1.4, 7.5], fov: 36, dur: 0.25, c: 10},
	]},
	{id: 'wait', a: 21.84, b: 23.8, scene: 'kitchen', xf: true, keys: [
		{t: 21.84, p: [0.45, 1.55, 0.9], l: [0.6, 1.5, -2.25], fov: 34, roll: 3, c: 12},
	]},
	{id: 'grid_night', a: 23.8, b: 28.9, scene: 'plant', xf: true, expo: 1.25, keys: [
		{t: 23.8, p: [-4, 2, 12], l: [-12, 11, -10], fov: 56},
		{t: 25.85, p: [0, 0, 0], l: [0, 0, 0], pf: trackP, lf: trackL, fov: 54, dur: 0.4, creep: 0},
		{t: 28.3, p: [50, 2.2, 37], l: [59.5, 2.7, 28], fov: 42, dur: 0.35},
	]},
	{id: 'hill', a: 28.9, b: 35.3, scene: 'hill', xf: true, expo: 1.2, keys: [
		{t: 28.9, p: H(2.6, 2.0, 7.5), l: H(-0.4, 1.35, 0), fov: 44},
		{t: 29.75, p: H(-7.4, 2.0, 8.5), l: H(-8.1, 1.3, 0), fov: 44, dur: 1.7, glide: true},
		{t: 31.95, p: H(-9.5, 2.6, 10.5), l: H(-11.8, 2.5, 0), fov: 54, dur: 0.3},
		{t: 34.3, p: H(1.8, 1.7, 5.2), l: H(-0.7, 1.4, 0), fov: 40, dur: 0.3, c: 8},
	]},
	{id: 'heart', a: 35.3, b: 42.6, scene: 'control', xf: true, expo: 1.15, keys: [
		{t: 35.3, p: [0, 1.7, 7.6], l: [0, 2.0, -3], fov: 52},
		{t: 36.6, p: [0, 2.2, 3.6], l: [-0.3, 3.0, -3.4], fov: 40, dur: 0.35},
		{t: 38.0, p: [0, 1.7, 7.4], l: [0, 2.0, -3], fov: 52, dur: 0.3},
		{t: T_ALARM, p: [0, 1.6, 7.0], l: [0, 2.0, -3], fov: 55, roll: 5, dur: 0.2},
		{t: 40.15, p: [2.6, 1.6, 6.0], l: [4.5, 1.9, 0.3], fov: 46, roll: -4, dur: 0.3},
	]},
	{id: 'city', a: 42.6, b: 44.95, scene: 'city', expo: 1.2, keys: [
		{t: 42.6, p: [-10, 2.5, 26], l: [-10, 20, -38], fov: 60},
		{t: 42.95, p: [8, 2.5, 26], l: [14, 20, -38], fov: 60, dur: 1.9, glide: true},
	]},
	{id: 'yours', a: 44.95, b: 46.05, scene: 'street', keys: [
		{t: 44.95, p: [1.5, 1.8, 17], l: [1.0, 2.9, 0], fov: 42, c: 5},
	]},
	{id: 'real', a: 46.05, b: 48.15, scene: 'kitchen', expo: 1.3, keys: [
		{t: 46.05, p: [0.5, 1.5, 1.0], l: [0.6, 1.45, -2.25], fov: 36, roll: -3, c: 12},
	]},
	{id: 'brit', a: 48.15, b: 51.85, scene: 'control', xf: true, keys: [
		{t: 48.15, p: [0, 1.7, 7.6], l: [0, 2.0, -3], fov: 52},
		{t: 49.2, p: [0.3, 2.0, 3.8], l: [0, 3.0, -3.4], fov: 42, dur: 0.3},
		{t: 50.25, p: [0, 1.7, 7.4], l: [0, 1.9, -3], fov: 52, dur: 0.3},
	]},
	{id: 'kettles', a: 51.85, b: 54.1, scene: 'street', xf: true, keys: [
		{t: 51.85, p: [0, 9, 30], l: [0, 5, -20], fov: 52},
		{t: 52.0, p: [0, 17, 40], l: [0, 4, -26], fov: 54, dur: 1.9, glide: true},
	]},
	{id: 'end', a: 54.1, b: 57.8, scene: 'kitchen', xf: true, expo: 1.3, keys: [
		{t: 54.1, p: [0.9, 1.35, 4.4], l: [0.9, 0.75, -0.7], fov: 42, c: 8},
		{t: T_ZERO - 0.12, p: [1.1, 1.0, 2.9], l: [1.1, 0.85, -0.7], fov: 38, dur: 0.3, c: 12},
	]},
];

export const FLASH_AT = [5.6, 46.05];
export const WHIP_AT = [12.5, 42.6, 44.95];
export const KICKS = [T_PRESS, T_OUT1, T_ALLPRESS, T_COMBINED, T_JUMP + 0.4, T_JUMP + 0.9, T_ALARM, T_PULL + 0.2, T_CITY, T_YOURS, T_GAME_END];
export const XF = 0.12;

export const shotAt = (t: number) => {
	const i = SHOTS.findIndex((s) => t >= s.a && t < s.b);
	return i < 0 ? SHOTS.length - 1 : i;
};

export type CamState = {p: THREE.Vector3; l: THREE.Vector3; fov: number; roll: number; c: number};
const keyState = (k: Key, t: number): CamState => {
	const p = new THREE.Vector3(...(k.pf ? k.pf(t) : k.p));
	const l = new THREE.Vector3(...(k.lf ? k.lf(t) : k.l));
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
		const x = (t - ks[i].t) / (ks[i].dur ?? 0.33);
		const u = ks[i].glide ? sstep(0, 1, x) : easeOut(x);
		if (x < 1) {
			const prev = keyState(ks[i - 1], t);
			cur.p.lerpVectors(prev.p, cur.p, u);
			cur.l.lerpVectors(prev.l, cur.l, u);
			cur.fov = prev.fov + (cur.fov - prev.fov) * u;
			cur.roll = prev.roll + (cur.roll - prev.roll) * u;
			cur.c = prev.c + (cur.c - prev.c) * u;
		}
	}
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
