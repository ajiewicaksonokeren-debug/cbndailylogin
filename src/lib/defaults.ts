import type { Level, Rules } from './points';

// Values from the design. All numbers still need business approval.
export const DEFAULT_RULES: Rules = {
  base: 10,
  cycle: 50,
  expiryMonths: 12,
  reset: '00:00:00',
  tiers: [
    { from: 1, to: 6, m: 1 },
    { from: 7, to: 13, m: 1.2 },
    { from: 14, to: 29, m: 1.5 },
    { from: 30, to: null, m: 2 },
  ],
  milestones: [
    { day: 7, bonus: 100 },
    { day: 14, bonus: 200 },
    { day: 30, bonus: 500 },
    { day: 60, bonus: 1000 },
    { day: 100, bonus: 2000 },
  ],
};

export const DEFAULT_LEVELS: Level[] = [
  { name: 'Basic', min: 0, bonus: 0, perk: 'Poin dasar', color: '#8FD0F5' },
  { name: 'Silver', min: 1000, bonus: 5, perk: '+5% poin harian', color: '#C9D3DD' },
  { name: 'Gold', min: 5000, bonus: 10, perk: '+10% · 1 Streak Freeze/bulan', color: '#F5C451' },
  { name: 'Platinum', min: 15000, bonus: 20, perk: '+20% · 2 Streak Freeze/bulan', color: '#7C8CF8' },
];

export type PopupCfg = {
  on: boolean;
  prio: boolean; // billing popup first (enforced by native app)
  onb: boolean; // wait for onboarding (enforced by native app)
  title: string;
  cta: string;
  heroId: string | null;
  successId: string | null;
};
export const DEFAULT_POPUP: PopupCfg = { on: true, prio: true, onb: true, title: 'Check-in Harian', cta: 'Klaim Poin', heroId: null, successId: null };

export type BoardCfg = { p: boolean; s: boolean; top: number; mode: 'ini' | 'anon' };
export const DEFAULT_BOARD: BoardCfg = { p: true, s: true, top: 10, mode: 'ini' };

export type FieldKey = 'customer_id' | 'nama' | 'paket' | 'area' | 'cybro_tier' | 'status';
export type IntegrationCfg = {
  url: string;
  path: string;
  auth: 'key' | 'oauth';
  tokenUrl: string;
  clientId: string;
  secretEnc: string | null; // AES-GCM, never sent to browser
  cacheMin: number;
  timeoutSec: number;
  map: Record<FieldKey, string>;
  lastTest: { ok: boolean; ms: number; at: number } | null;
};
export const DEFAULT_INTEGRATION: IntegrationCfg = {
  url: '',
  path: '/customers?ids={ids}',
  auth: 'key',
  tokenUrl: '',
  clientId: '',
  secretEnc: null,
  cacheMin: 60,
  timeoutSec: 3,
  map: {
    customer_id: 'id_pelanggan',
    nama: 'nama_lengkap',
    paket: 'produk.nama_paket',
    area: 'alamat.kota',
    cybro_tier: 'loyalty.tier',
    status: 'status_layanan',
  },
  lastTest: null,
};

export const SEGMENTS = ['Cybro Silver+', 'Jakarta', 'Surabaya', 'Batam', 'Paket 100 Mbps+'] as const;
