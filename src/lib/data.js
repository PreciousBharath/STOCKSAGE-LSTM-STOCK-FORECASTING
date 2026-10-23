import { rng, gauss } from '../core/store.js';

// Synthetic sample series (clearly labelled) — upload a real CSV for real markets
export const SAMPLES = [
  { id: 'TECHNOVA', name: 'TechNova (synthetic IT large-cap)', start: 1450, mu: 0.0006, sigma: 0.015, season: 0.02, seed: 11 },
  { id: 'BHARATBANK', name: 'BharatBank (synthetic private bank)', start: 980, mu: 0.0004, sigma: 0.013, season: 0.015, seed: 23 },
  { id: 'GREENGRID', name: 'GreenGrid (synthetic energy)', start: 310, mu: 0.0009, sigma: 0.021, season: 0.03, seed: 37 },
  { id: 'NIFTYSIM', name: 'NIFTY-Sim (synthetic index)', start: 17200, mu: 0.0005, sigma: 0.009, season: 0.01, seed: 41 },
  { id: 'CRYPTOX', name: 'Crypto-X (synthetic high volatility)', start: 2400, mu: 0.001, sigma: 0.038, season: 0.05, seed: 53 },
];

export function generate(s, n = 1000) {
  const r = rng(s.seed); const out = []; let p = s.start; let regime = 1;
  const d = new Date('2022-10-24');
  for (let i = 0; out.length < n; i++) {
    d.setDate(d.getDate() + 1); if (d.getDay() === 0 || d.getDay() === 6) continue;
    if (r() < 0.006) regime = r() < 0.5 ? -1 : 1.6;
    const jump = r() < 0.01 ? gauss(r) * s.sigma * 4 : 0;
    const ret = s.mu * regime + s.sigma * gauss(r) + s.season * 0.05 * Math.sin((2 * Math.PI * out.length) / 63) + jump;
    p = Math.max(1, p * Math.exp(ret));
    out.push({ date: d.toISOString().slice(0, 10), close: +p.toFixed(2) });
  }
  return out;
}

export function parsePriceCSV(text) {
  const lines = text.trim().split(/\r?\n/); const head = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
  const di = head.findIndex((h) => h.includes('date')); let ci = head.findIndex((h) => h === 'close' || h === 'close price'); if (ci < 0) ci = head.findIndex((h) => h.includes('close'));
  if (di < 0 || ci < 0) throw new Error('CSV needs Date and Close columns');
  const rows = lines.slice(1).map((l) => { const c = l.split(',').map((x) => x.trim().replace(/"/g, '')); return { date: c[di], close: Number(c[ci]) }; }).filter((r) => r.date && r.close > 0);
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (rows.length < 120) throw new Error('Need at least 120 rows of price history');
  return rows;
}

export const sma = (a, n) => a.map((_, i) => (i < n - 1 ? null : a.slice(i - n + 1, i + 1).reduce((x, y) => x + y, 0) / n));
export function metrics(actual, pred, prevActual) {
  const n = actual.length; let se = 0, ae = 0, ape = 0, dir = 0;
  for (let i = 0; i < n; i++) { const e = pred[i] - actual[i]; se += e * e; ae += Math.abs(e); ape += Math.abs(e) / actual[i];
    if (Math.sign(pred[i] - prevActual[i]) === Math.sign(actual[i] - prevActual[i])) dir++; }
  return { rmse: Math.sqrt(se / n), mae: ae / n, mape: ape / n, dir: dir / n };
}
