// lib/docs/cascade/rename-detector.ts
import { sha256 } from "../../kb/hash.js";

export interface Namable {
  key: string;
  name: string;
  [k: string]: unknown;
}

export interface RenameResult<T extends Namable> {
  added: T[];
  removed: T[];
  renamed: Array<{ from: T; to: T }>;
}

export function detectRenames<T extends Namable>(oldItems: T[], newItems: T[]): RenameResult<T> {
  const oldByKey = new Map<string, T>();
  const newByKey = new Map<string, T>();
  for (const o of oldItems) oldByKey.set(o.key, o);
  for (const n of newItems) newByKey.set(n.key, n);

  const renamed: Array<{ from: T; to: T }> = [];
  const stillAdded: T[] = [];
  const stillRemoved: T[] = [];

  for (const [key, n] of newByKey) {
    const o = oldByKey.get(key);
    if (o && o.name !== n.name) {
      renamed.push({ from: o, to: n });
    }
  }

  for (const [key, n] of newByKey) {
    if (!oldByKey.has(key)) stillAdded.push(n);
  }
  for (const [key, o] of oldByKey) {
    if (!newByKey.has(key)) stillRemoved.push(o);
  }
  return { added: stillAdded, removed: stillRemoved, renamed };
}

export function payloadHash(item: unknown): string {
  return sha256(item);
}
