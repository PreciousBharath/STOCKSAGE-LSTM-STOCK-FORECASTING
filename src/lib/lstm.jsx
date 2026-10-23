import { createContext, useContext, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

setWasmPaths(new URL('./tfjs/', document.baseURI).href);
// Small recurrent nets train fastest on WebAssembly (SIMD); fall back to WebGL, then plain JS
export const BACKENDS = ['wasm', 'webgl', 'cpu'];
export async function pickBackend(name) {
  for (const b of [name, ...BACKENDS.filter((x) => x !== name)]) { try { if (await tf.setBackend(b)) { await tf.ready(); return tf.getBackend(); } } catch { /* try next */ } }
  return tf.getBackend();
}
import { SAMPLES, generate, metrics, sma } from './data.js';
import { usePersist } from '../core/context.jsx';
import { uid } from '../core/store.js';

const Ctx = createContext(null);
export const useLab = () => useContext(Ctx);

export function LabProvider({ children }) {
  const [dsId, setDsId] = usePersist('ds', 'TECHNOVA');
  const [custom, setCustom] = useState(null);
  const [hp, setHp] = usePersist('hp2', { window: 20, units: 32, layers: 1, epochs: 15, lr: 0.004, split: 0.85, dropout: 0.05 });
  const [status, setStatus] = useState('idle'); // idle | training | done
  const [backend, setBackend] = usePersist('backend', 'wasm'); const [active, setActive] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [runs, setRuns] = usePersist('runs', []);
  const model = useRef(null); const stopFlag = useRef(false); const scaler = useRef(null);
  const series = custom && dsId === 'CUSTOM' ? custom.rows : generate(SAMPLES.find((s) => s.id === dsId) || SAMPLES[0]);
  const dsName = dsId === 'CUSTOM' && custom ? custom.name : (SAMPLES.find((s) => s.id === dsId) || SAMPLES[0]).name;

  async function train() {
    setStatus('training'); setHistory([]); setResult(null); stopFlag.current = false;
    setActive(await pickBackend(backend));
    const closes = series.map((d) => d.close); const W = hp.window; const nTrain = Math.floor(closes.length * hp.split);
    const tr = closes.slice(0, nTrain); const mn = Math.min(...tr), mx = Math.max(...tr); const sc = (v) => (v - mn) / (mx - mn); const inv = (v) => v * (mx - mn) + mn;
    scaler.current = { mn, mx };
    const scaled = closes.map(sc); const X = [], Y = [];
    for (let i = W; i < closes.length; i++) { X.push(scaled.slice(i - W, i).map((v) => [v])); Y.push(scaled[i]); }
    const cut = nTrain - W; const xs = tf.tensor3d(X.slice(0, cut)), ys = tf.tensor2d(Y.slice(0, cut), [cut, 1]);
    model.current?.dispose();
    const m = tf.sequential();
    for (let l = 0; l < hp.layers; l++) m.add(tf.layers.lstm({ units: hp.units, returnSequences: l < hp.layers - 1, recurrentInitializer: 'glorotUniform', ...(l === 0 ? { inputShape: [W, 1] } : {}) }));
    if (hp.dropout > 0) m.add(tf.layers.dropout({ rate: hp.dropout }));
    m.add(tf.layers.dense({ units: 16, activation: 'relu' })); m.add(tf.layers.dense({ units: 1 }));
    m.compile({ optimizer: tf.train.adam(hp.lr), loss: 'meanSquaredError' });
    model.current = m; const t0 = performance.now();
    await new Promise((r) => setTimeout(r, 30));
    await m.fit(xs, ys, { epochs: hp.epochs, batchSize: 64, validationSplit: 0.1, shuffle: true, yieldEvery: 'never',
      callbacks: { onEpochEnd: async (ep, logs) => { setHistory((h) => [...h, { epoch: ep + 1, loss: logs.loss, val: logs.val_loss, t: (performance.now() - t0) / 1000 }]); if (stopFlag.current) m.stopTraining = true; await new Promise((r) => setTimeout(r, 0)); } } });
    xs.dispose(); ys.dispose();
    // evaluate on the held-out tail
    const xt = tf.tensor3d(X.slice(cut)); const pt = m.predict(xt); const pred = Array.from(await pt.data()).map(inv); xt.dispose(); pt.dispose();
    const actual = closes.slice(nTrain); const prev = closes.slice(nTrain - 1, -1); const dates = series.slice(nTrain).map((d) => d.date);
    const naive = prev; const s5 = sma(closes, 5).slice(nTrain - 1, -1);
    // linear-regression baseline on the same window (least squares on last W points trend)
    const lin = actual.map((_, i) => { const seg = closes.slice(nTrain + i - 10, nTrain + i); const n = seg.length; const xm = (n - 1) / 2; const ym = seg.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0; seg.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; }); return ym + (num / den) * (n - xm); });
    const res = {
      dates, actual, pred, train: closes.slice(0, nTrain), trainDates: series.slice(0, nTrain).map((d) => d.date),
      m: { lstm: metrics(actual, pred, prev), naive: metrics(actual, naive, prev), sma5: metrics(actual, s5, prev), linear: metrics(actual, lin, prev) },
      params: m.countParams(), backend: tf.getBackend(), seconds: (performance.now() - t0) / 1000, resid: Math.sqrt(actual.reduce((a, v, i) => a + (pred[i] - v) ** 2, 0) / actual.length),
    };
    setResult(res); setStatus('done');
    setRuns((r) => [{ id: uid(), at: Date.now(), ds: dsName, hp: { ...hp }, rmse: res.m.lstm.rmse, mape: res.m.lstm.mape, dir: res.m.lstm.dir, params: res.params, seconds: res.seconds }, ...r].slice(0, 30));
  }

  async function forecast(days) {
    if (!model.current || !scaler.current) return null;
    const { mn, mx } = scaler.current; const closes = series.map((d) => d.close); let win = closes.slice(-hp.window).map((v) => (v - mn) / (mx - mn)); const out = [];
    for (let i = 0; i < days; i++) { const t = tf.tensor3d([win.map((v) => [v])]); const p = model.current.predict(t); const v = (await p.data())[0]; t.dispose(); p.dispose(); out.push(v * (mx - mn) + mn); win = [...win.slice(1), v]; }
    return out;
  }

  return <Ctx.Provider value={{ backend, setBackend, active, dsId, setDsId, custom, setCustom, hp, setHp, status, history, result, runs, setRuns, series, dsName, train, stop: () => { stopFlag.current = true; }, forecast }}>{children}</Ctx.Provider>;
}
