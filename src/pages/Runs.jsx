import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { FlaskConical, Trash2, Trophy } from 'lucide-react';
import { useLab } from '../lib/lstm.jsx';
import { Card, PageHead, Badge, Empty } from '../core/ui.jsx';

export default function Runs() {
  const L = useLab(); const best = [...L.runs].sort((a, b) => a.mape - b.mape)[0];
  return (
    <>
      <PageHead title="Experiment tracker" crumbs="StockSage / Experiments" sub="Every training run is logged so you can compare hyper-parameters">
        {L.runs.length > 0 && <button className="btn btn-danger btn-sm" onClick={() => confirm('Clear all runs?') && L.setRuns([])}><Trash2 size={15} /> Clear</button>}
      </PageHead>
      {!L.runs.length ? <Card><Empty icon={FlaskConical} title="No experiments yet" text="Train a model in the studio — each run appears here." /></Card> : (<>
        <div className="grid g-1-2 stagger">
          <div className="hero-banner"><Trophy size={26} /><h2 className="mt8">Best run · {(best.mape * 100).toFixed(2)}% MAPE</h2>
            <p>{best.ds}<br />window {best.hp.window} · {best.hp.layers}×LSTM({best.hp.units}) · {best.hp.epochs} epochs · lr {best.hp.lr} · dropout {best.hp.dropout}</p></div>
          <Card title="Model size vs error" sub="Bubble = direction accuracy"><div style={{ height: 210 }}><ResponsiveContainer><ScatterChart margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="params" type="number" name="Params" tickLine={false} axisLine={false} /><YAxis dataKey="m" type="number" name="MAPE %" unit="%" tickLine={false} axisLine={false} /><ZAxis dataKey="d" range={[60, 260]} name="Dir %" /><Tooltip />
            <Scatter data={L.runs.map((r) => ({ params: r.params, m: +(r.mape * 100).toFixed(2), d: +(r.dir * 100).toFixed(1) }))} fill="var(--accent)" /></ScatterChart></ResponsiveContainer></div></Card>
        </div>
        <Card className="mt16 fade-up" title={`${L.runs.length} runs`}><div className="table-wrap"><table className="tbl"><thead><tr><th>When</th><th>Dataset</th><th>Window</th><th>Architecture</th><th>Epochs</th><th>LR</th><th>Params</th><th>RMSE</th><th>MAPE</th><th>Direction</th><th>Time</th></tr></thead>
          <tbody>{L.runs.map((r) => <tr key={r.id}><td className="small">{new Date(r.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="small">{r.ds.split(' (')[0]}</td><td>{r.hp.window}</td>
            <td className="small">{r.hp.layers}× LSTM({r.hp.units})</td><td>{r.hp.epochs}</td><td className="mono small">{r.hp.lr}</td><td className="mono small">{r.params.toLocaleString()}</td><td className="mono small">{r.rmse.toFixed(2)}</td>
            <td>{r === best ? <Badge kind="ok">{(r.mape * 100).toFixed(2)}%</Badge> : <span className="mono small">{(r.mape * 100).toFixed(2)}%</span>}</td><td className="mono small">{(r.dir * 100).toFixed(1)}%</td><td className="small">{r.seconds.toFixed(1)}s</td></tr>)}</tbody></table></div></Card>
      </>)}
    </>
  );
}
