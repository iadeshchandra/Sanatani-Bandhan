/**
 * preview/mocks/mockFirestore.ts — DEV-ONLY Firestore stub for screenshots.
 * onSnapshot/getDocs immediately return the mock crisis events.
 */
import { MOCK_EVENTS } from './mockData';

type Snap = { docs: Array<{ id: string; data: () => unknown }> };

function snap(): Snap {
  return { docs: MOCK_EVENTS.map((e) => ({ id: e.id, data: () => e })) };
}

export function collection(..._args: unknown[]) {
  return { __mock: 'collection', _args };
}
export function doc(..._args: unknown[]) {
  return { __mock: 'doc', _args };
}
export function query(..._args: unknown[]) {
  return { __mock: 'query', _args };
}
export function where(..._args: unknown[]) {
  return { __mock: 'where', _args };
}
export function orderBy(..._args: unknown[]) {
  return { __mock: 'orderBy', _args };
}
export function limit(..._args: unknown[]) {
  return { __mock: 'limit', _args };
}
export function onSnapshot(
  _q: unknown,
  next: (snap: Snap) => void,
  _err?: (e: unknown) => void
): () => void {
  const t = window.setTimeout(() => next(snap()), 30);
  return () => window.clearTimeout(t);
}
export async function getDocs(_q?: unknown): Promise<Snap> {
  return snap();
}
export async function getDoc(_d?: unknown): Promise<{ exists: () => boolean; data: () => null }> {
  return { exists: () => false, data: () => null };
}
export async function setDoc(..._args: unknown[]): Promise<void> {}
export async function updateDoc(..._args: unknown[]): Promise<void> {}
export async function addDoc(..._args: unknown[]): Promise<{ id: string }> {
  return { id: 'mock-doc' };
}
export function serverTimestamp(): unknown {
  return Date.now();
}
export function increment(_n: number): unknown {
  return _n;
}
export function arrayUnion(..._args: unknown[]): unknown {
  return _args;
}
export function arrayRemove(..._args: unknown[]): unknown {
  return _args;
}
export function Timestamp(..._args: unknown[]): unknown {
  return { toMillis: () => Date.now() };
}
/* --- stubs for src/lib/firebase.ts init path (never exercised) --- */
export function getFirestore(..._args: unknown[]): unknown {
  return { __mock: 'db' };
}
export function initializeFirestore(..._args: unknown[]): unknown {
  return { __mock: 'db' };
}
export function enableMultiTabIndexedDbPersistence(..._args: unknown[]): Promise<void> {
  return Promise.resolve();
}
export function connectFirestoreEmulator(..._args: unknown[]): void {}
export function collectionGroup(..._args: unknown[]) {
  return { __mock: 'collectionGroup', _args };
}
export function writeBatch(..._args: unknown[]) {
  return {
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {},
  };
}
export function runTransaction(..._args: unknown[]): Promise<unknown> {
  return Promise.resolve(null);
}
