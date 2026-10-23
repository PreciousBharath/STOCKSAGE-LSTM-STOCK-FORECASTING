import { useLab } from '../lib/lstm.jsx';
import { Card, PageHead, Badge } from '../core/ui.jsx';

function Cell() {
  const box = (x, y, t, c) => <g><rect x={x} y={y} width="54" height="34" rx="8" fill={c} /><text x={x + 27} y={y + 22} textAnchor="middle" fill="#fff" fontWeight="700" fontSize="13">{t}</text></g>;
  return (
    <svg viewBox="0 0 640 260" width="100%">
      <rect x="40" y="30" width="560" height="200" rx="22" fill="var(--surface2)" stroke="var(--border)" />
      <line x1="10" y1="60" x2="630" y2="60" stroke="#f59e0b" strokeWidth="3" /><text x="18" y="50" fontSize="12" fill="#f59e0b" fontWeight="700">cell state Cₜ₋₁ → Cₜ</text>
      <line x1="10" y1="200" x2="630" y2="200" stroke="var(--accent)" strokeWidth="3" /><text x="18" y="222" fontSize="12" fill="var(--accent)" fontWeight="700">hidden hₜ₋₁ → hₜ</text>
      {box(110, 130, 'σ', '#ef4444')}{box(220, 130, 'σ', '#10b981')}{box(310, 130, 'tanh', '#0ea5e9')}{box(430, 130, 'σ', '#8b5cf6')}
      <text x="137" y="182" textAnchor="middle" fontSize="11" fill="var(--muted)">forget gate</text><text x="247" y="182" textAnchor="middle" fontSize="11" fill="var(--muted)">input gate</text>
      <text x="337" y="182" textAnchor="middle" fontSize="11" fill="var(--muted)">candidate</text><text x="457" y="182" textAnchor="middle" fontSize="11" fill="var(--muted)">output gate</text>
      {[137, 247, 337, 457].map((x) => <line key={x} x1={x} y1="130" x2={x} y2="62" stroke="var(--faint)" strokeDasharray="4 4" />)}
      <circle cx="137" cy="60" r="12" fill="var(--surface)" stroke="#ef4444" strokeWidth="2" /><text x="137" y="65" textAnchor="middle" fontSize="14">×</text>
      <circle cx="292" cy="60" r="12" fill="var(--surface)" stroke="#10b981" strokeWidth="2" /><text x="292" y="65" textAnchor="middle" fontSize="14">+</text>
      <text x="320" y="252" textAnchor="middle" fontSize="12" fill="var(--muted)">xₜ (price window) enters every gate</text>
    </svg>
  );
}

export default function HowItWorks() {
  const { hp } = useLab();
  return (
    <>
      <PageHead title="How it works" crumbs="StockSage / Architecture" sub="Long Short-Term Memory networks for time-series forecasting" />
      <div className="grid g-3-2 stagger">
        <Card title="Inside an LSTM cell"><Cell /><p className="small muted mt12">Gates decide what to forget, what new information to store and what to output, letting the network keep useful patterns across many time steps — ideal for sequences such as prices.</p></Card>
        <Card title="Your current architecture">
          {[['Input', `${hp.window} days × 1 feature (min-max scaled close)`], ...Array.from({ length: hp.layers }, (_, i) => [`LSTM ${i + 1}`, `${hp.units} units${i < hp.layers - 1 ? ', return sequences' : ''}`]), ...(hp.dropout ? [['Dropout', `rate ${hp.dropout}`]] : []), ['Dense', '16 units · ReLU'], ['Output', '1 unit · next-day scaled close']].map(([k, v], i) => (
            <div key={i} className="list-item"><Badge kind={i === 0 ? 'info' : k === 'Output' ? 'bad' : 'acc'}>{k}</Badge><span className="small">{v}</span></div>))}
          <div className="tile small mt12">Loss: MSE · Optimiser: Adam (lr {hp.lr}) · Batch 64 · 10% validation · shuffled windows</div>
        </Card>
      </div>
      <div className="grid g3 mt16 stagger">
        {[['1. Windowing', 'Each training sample is the previous N closing prices; the label is the next close. Data is scaled with min/max from the training period only (no look-ahead leakage).'],
          ['2. Training in the browser', 'TensorFlow.js runs the LSTM on a WebAssembly SIMD backend (or WebGL / plain JS). Loss curves stream live after every epoch, and you can stop training at any time.'],
          ['3. Honest evaluation', 'The last part of the series is never seen during training. We compare against naïve, moving-average and linear-trend baselines and report direction accuracy.']].map(([t, d]) => (
          <Card key={t} title={t}><p className="small muted">{d}</p></Card>))}
      </div>
    </>
  );
}
