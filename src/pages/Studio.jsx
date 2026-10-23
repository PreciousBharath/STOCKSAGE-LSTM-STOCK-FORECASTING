import { useRef } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, ComposedChart } from 'recharts';
import { Play, Square, Upload, Cpu, Target, Timer, Compass } from 'lucide-react';
import { useLab } from '../lib/lstm.jsx';
import { SAMPLES, parsePriceCSV } from '../lib/data.js';
import { Card, PageHead, Slider, Badge, Stat } from '../core/ui.jsx';
import { useApp } from '../core/context.jsx';

export default function Studio() {
  const L = useLab(); const { toast } = useApp(); const ref = useRef();
  const busy = L.status === 'training'; const R = L.result;
  const set = (k) => (v) => L.setHp({ ...L.hp, [k]: v });
  const pct = busy ? (L.history.length / L.hp.epochs) * 100 : L.status === 'done' ? 100 : 0;
  const eta = L.history.length ? (L.history[L.history.length - 1].t / L.history.length) * (L.hp.epochs - L.history.length) : 0;
  const tail = R ? R.train.slice(-120).map((v, i, a) => ({ d: R.trainDates[R.trainDates.length - a.length + i], train: v })) : [];
  const test = R ? R.dates.map((d, i) => ({ d, actual: R.actual[i], pred: +R.pred[i].toFixed(2) })) : [];
  function upload(f) { f.text().then((t) => { try { const rows = parsePriceCSV(t); L.setCustom({ name: f.name.replace(/\.csv$/i, ''), rows }); L.setDsId('CUSTOM'); toast(`Loaded ${rows.length} rows from ${f.name}`, 'ok'); } catch (e) { toast(e.message, 'bad'); } }); }
  return (
    <>
      <PageHead title="LSTM training studio" crumbs="StockSage / Studio" sub="Train a recurrent neural network on price history — right here in your browser with TensorFlow.js">
        <input ref={ref} type="file" accept=".csv" hidden onChange={(e) => { e.target.files[0] && upload(e.target.files[0]); e.target.value = ''; }} />
        <button className="btn btn-ghost btn-sm" onClick={() => ref.current.click()}><Upload size={15} /> Upload CSV</button>
        {busy ? <button className="btn btn-danger" onClick={L.stop}><Square size={15} /> Stop</button> : <button className="btn btn-primary" onClick={L.train}><Play size={16} /> Train model</button>}
      </PageHead>
      <div className="grid g-1-2 stagger">
        <Card title="Dataset & hyper-parameters">
          <label className="field"><span>Dataset</span><select className="input" value={L.dsId} disabled={busy} onChange={(e) => L.setDsId(e.target.value)}>
            {SAMPLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}{L.custom && <option value="CUSTOM">📁 {L.custom.name} (uploaded)</option>}</select></label>
          <div className="small faint mb12">{L.series.length} trading days · {L.series[0].date} → {L.series[L.series.length - 1].date}. Upload a CSV with Date & Close columns (e.g. exported from NSE/Yahoo) to train on real data.</div>
          <Slider label="Look-back window" value={L.hp.window} min={10} max={60} unit=" days" onChange={set('window')} />
          <Slider label="LSTM units per layer" value={L.hp.units} min={8} max={96} step={8} onChange={set('units')} />
          <Slider label="Stacked LSTM layers" value={L.hp.layers} min={1} max={3} onChange={set('layers')} />
          <Slider label="Epochs" value={L.hp.epochs} min={5} max={60} onChange={set('epochs')} />
          <Slider label="Learning rate" value={L.hp.lr} min={0.0005} max={0.01} step={0.0005} onChange={set('lr')} />
          <Slider label="Dropout" value={L.hp.dropout} min={0} max={0.4} step={0.05} onChange={set('dropout')} />
          <Slider label="Train split" value={L.hp.split} min={0.6} max={0.92} step={0.01} fmt={(v) => Math.round(v * 100) + '%'} onChange={set('split')} />
        </Card>
        <div className="grid" style={{ gap: 18, alignContent: 'start' }}>
          <Card title="Training progress" sub={busy ? `Epoch ${L.history.length}/${L.hp.epochs} · ETA ${eta.toFixed(0)}s` : L.status === 'done' ? `Finished in ${R.seconds.toFixed(1)}s · ${R.params.toLocaleString()} parameters` : 'Press “Train model” to start'}
            action={busy ? <Badge kind="info"><span className="spinner" style={{ width: 12, height: 12 }} /> training</Badge> : L.status === 'done' ? <Badge kind="ok">trained</Badge> : <Badge kind="mute">idle</Badge>}>
            <div className="progress mb16"><i style={{ width: pct + '%' }} /></div>
            <div style={{ height: 230 }}><ResponsiveContainer><LineChart data={L.history} margin={{ left: -6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="epoch" tickLine={false} axisLine={false} /><YAxis scale="log" domain={['auto', 'auto']} tickLine={false} axisLine={false} tickFormatter={(v) => v.toExponential(0)} /><Tooltip formatter={(v) => v.toExponential(3)} /><Legend />
              <Line dataKey="loss" name="Train MSE" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} /><Line dataKey="val" name="Validation MSE" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart></ResponsiveContainer></div>
          </Card>
          {R && (
            <div className="grid g4" style={{ gap: 12 }}>
              <Stat icon={Target} label="Test RMSE" value={R.m.lstm.rmse} decimals={2} prefix="₹" />
              <Stat icon={Cpu} label="Test MAPE" value={R.m.lstm.mape * 100} decimals={2} suffix="%" color="#10b981" />
              <Stat icon={Compass} label="Direction accuracy" value={R.m.lstm.dir * 100} decimals={1} suffix="%" color="#f59e0b" />
              <Stat icon={Timer} label="Training time" value={R.seconds} decimals={1} suffix="s" color="#ec4899" />
            </div>)}
        </div>
      </div>
      {R && (<>
        <Card className="mt16 fade-up" title="Predicted vs actual — held-out test period" sub={`${R.actual.length} unseen trading days (one-step-ahead predictions)`}>
          <div style={{ height: 330 }}><ResponsiveContainer><ComposedChart data={[...tail, ...test]} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={50} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} /><Tooltip /><Legend />
            <Area dataKey="train" name="Training data" stroke="var(--faint)" fill="var(--faint)" fillOpacity={0.1} dot={false} isAnimationActive={false} />
            <Line dataKey="actual" name="Actual" stroke="var(--text)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="pred" name="LSTM prediction" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart></ResponsiveContainer></div>
        </Card>
        <Card className="mt16 fade-up" title="LSTM vs baselines" sub="Same test period">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Model</th><th>RMSE</th><th>MAE</th><th>MAPE</th><th>Direction accuracy</th></tr></thead>
            <tbody>{[['lstm', '⭐ LSTM (yours)'], ['naive', 'Naïve (yesterday\'s close)'], ['sma5', '5-day moving average'], ['linear', '10-day linear trend']].map(([k, n]) => (
              <tr key={k}><td className="bold small">{n}</td><td className="mono">{R.m[k].rmse.toFixed(2)}</td><td className="mono">{R.m[k].mae.toFixed(2)}</td><td className="mono">{(R.m[k].mape * 100).toFixed(2)}%</td>
                <td>{k === 'naive' ? <span className="small faint">n/a (predicts no change)</span> : <div className="row" style={{ gap: 8 }}><div className="progress" style={{ width: 90 }}><i style={{ width: R.m[k].dir * 100 + '%' }} /></div><span className="mono small">{(R.m[k].dir * 100).toFixed(1)}%</span></div>}</td></tr>))}</tbody></table></div>
          <p className="small faint mt12">Beating the naïve baseline on price data is hard — markets are close to a random walk. Treat forecasts as an ML exercise, not trading advice.</p>
        </Card>
      </>)}
    </>
  );
}
