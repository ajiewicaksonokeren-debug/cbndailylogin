import { db } from './db';
import type { Level, Rules } from './points';
import { nextReset } from './points';
import {
  DEFAULT_BOARD, DEFAULT_INTEGRATION, DEFAULT_LEVELS, DEFAULT_POPUP, DEFAULT_RULES,
  type BoardCfg, type IntegrationCfg, type PopupCfg,
} from './defaults';

type Stored = { rules: RulesSlot; levels: Level[]; popup: PopupCfg; board: BoardCfg; integration: IntegrationCfg };
// Rule changes apply from the next daily reset, so a day never mixes two rule sets.
export type RulesSlot = { prev: Rules; next: Rules; from: number };

const DEFAULTS: Stored = {
  rules: { prev: DEFAULT_RULES, next: DEFAULT_RULES, from: 0 },
  levels: DEFAULT_LEVELS,
  popup: DEFAULT_POPUP,
  board: DEFAULT_BOARD,
  integration: DEFAULT_INTEGRATION,
};

export async function getSetting<K extends keyof Stored>(k: K): Promise<Stored[K]> {
  const row = await db.setting.findUnique({ where: { key: k } });
  const v = row?.value as Stored[K] | undefined;
  if (!v) return DEFAULTS[k];
  return (Array.isArray(v) ? v : { ...DEFAULTS[k], ...v }) as Stored[K];
}

export async function setSetting<K extends keyof Stored>(k: K, value: Stored[K]) {
  const json = value as object;
  await db.setting.upsert({ where: { key: k }, create: { key: k, value: json }, update: { value: json } });
}

export const rulesAt = (slot: RulesSlot, at: number) => (at >= slot.from ? slot.next : slot.prev);
export const getRules = async (at = Date.now()) => rulesAt(await getSetting('rules'), at);

export async function saveRules(next: Rules, at = Date.now()) {
  const slot = await getSetting('rules');
  const current = rulesAt(slot, at);
  const from = nextReset(at, current.reset);
  await setSetting('rules', { prev: current, next, from });
  return from;
}
