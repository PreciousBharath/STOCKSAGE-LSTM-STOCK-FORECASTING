// Tiny inference engine for scikit-learn MLP weights exported as JSON
const act = { relu: (x) => (x > 0 ? x : 0), tanh: Math.tanh, logistic: (x) => 1 / (1 + Math.exp(-x)), identity: (x) => x };

export function forward(model, x, standardize = true) {
  let h = standardize ? x.map((v, i) => (v - model.mean[i]) / (model.scale[i] || 1)) : x;
  const L = model.weights.length;
  for (let l = 0; l < L; l++) {
    const W = model.weights[l], b = model.biases[l]; const out = new Array(b.length);
    for (let j = 0; j < b.length; j++) { let s = b[j]; for (let i = 0; i < h.length; i++) s += h[i] * W[i][j]; out[j] = s; }
    const f = l === L - 1 ? model.out : model.activation;
    if (f === 'softmax') { const m = Math.max(...out); const e = out.map((v) => Math.exp(v - m)); const z = e.reduce((a, c) => a + c, 0); h = e.map((v) => v / z); }
    else h = out.map(act[f]);
  }
  return h;
}

// Local explanation: change in output when each feature is replaced by the dataset mean (occlusion / baseline attribution)
export function explain(predict, x, baseline, names) {
  const p = predict(x);
  return names.map((n, i) => { const xb = [...x]; xb[i] = baseline[i]; return { name: n, value: x[i], impact: p - predict(xb) }; })
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/); const head = lines[0].split(',').map((s) => s.trim());
  return lines.slice(1).filter(Boolean).map((l) => { const c = l.split(','); const o = {}; head.forEach((h, i) => { const v = c[i]?.trim(); o[h] = v !== '' && !isNaN(v) ? Number(v) : v; }); return o; });
}
