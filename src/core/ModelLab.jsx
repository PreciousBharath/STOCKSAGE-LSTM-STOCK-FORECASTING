import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Brain, Target, Gauge, Layers, Trophy } from 'lucide-react';
import { Card, PageHead, Stat, Badge, HEX } from './ui.jsx';

function Network({ layers }) {
  const W = 640, H = 230; const cols = layers.length; const maxShow = 9;
  const xs = layers.map((_, i) => 40 + (i * (W - 80)) / (cols - 1));
  const nodes = layers.map((n, i) => { const k = Math.min(n, maxShow); return Array.from({ length: k }, (_, j) => ({ x: xs[i], y: H / 2 + (j - (k - 1) / 2) * 22 })); });
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%">
      {nodes.slice(0, -1).map((col, i) => col.map((a, j) => nodes[i + 1].map((b, k) => <line key={`${i}-${j}-${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeOpacity=".12" />)))}
      {nodes.map((col, i) => col.map((a, j) => <circle key={`${i}-${j}`} cx={a.x} cy={a.y} r="7" fill={i === 0 ? '#0ea5e9' : i === cols - 1 ? '#ef4444' : 'var(--accent)'} stroke="var(--surface)" strokeWidth="2" />))}
      {layers.map((n, i) => <text key={i} x={xs[i]} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--muted)" fontWeight="700">{i === 0 ? `Input ${n}` : i === cols - 1 ? `Output ${n}` : `Dense ${n}`}</text>)}
    </svg>
  );
}

export default function ModelLab({ M, title = 'Model lab', task = 'classification', crumbs, classes = ['Negative', 'Positive'], featLabel = (f) => f, primary = 'Deep Neural Net' }) {
  const best = M.compare.find((c) => c.model === primary) || M.compare[0];
  const loss = M.loss_curve.map((v, i) => ({ epoch: i + 1, loss: v, val: M.val_curve?.[i] }));
  const imp = M.importance.slice(0, 12).map(([f, v]) => ({ f: featLabel(f), v }));
  const metrics = task === 'classification' ? ['accuracy', 'precision', 'recall', 'f1', 'auc'] : ['r2', 'mae', 'rmse', 'mape'];
  return (
    <>
      <PageHead title={title} crumbs={crumbs} sub={`Trained on ${M.train_size.toLocaleString()} rows · evaluated on ${M.test_size.toLocaleString()} held-out rows · ${M.epochs} epochs`}>
        <Badge kind="acc"><Brain size={13} /> {M.model.params.toLocaleString()} parameters</Badge>
      </PageHead>
      <div className="grid g4 stagger">
        {task === 'classification' ? (<>
          <Stat icon={Target} label="Accuracy (test)" value={best.accuracy * 100} suffix="%" decimals={1} />
          <Stat icon={Gauge} label="ROC-AUC" value={best.auc} decimals={3} color="#10b981" />
          <Stat icon={Trophy} label="F1 score" value={best.f1} decimals={3} color="#f59e0b" />
          <Stat icon={Layers} label="Recall (sensitivity)" value={best.recall * 100} suffix="%" decimals={1} color="#ec4899" />
        </>) : (<>
          <Stat icon={Target} label="R² (test)" value={best.r2} decimals={3} />
          <Stat icon={Gauge} label="MAE" value={best.mae} prefix="₹" color="#10b981" />
          <Stat icon={Trophy} label="RMSE" value={best.rmse} prefix="₹" color="#f59e0b" />
          <Stat icon={Layers} label="MAPE" value={best.mape * 100} suffix="%" decimals={1} color="#ec4899" />
        </>)}
      </div>
      <div className="grid g-2-1 mt16 stagger">
        <Card title="Network architecture" sub={`MLP ${M.model.layers.join(' → ')} · ReLU · Adam · L2 · early stopping`}><Network layers={M.model.layers} /></Card>
        <Card title="Model comparison" sub="Same split, same features">
          <div className="table-wrap"><table className="tbl"><thead><tr><th>Model</th>{metrics.slice(0, 3).map((m) => <th key={m}>{m}</th>)}</tr></thead>
            <tbody>{M.compare.map((c) => <tr key={c.model}><td className="small bold">{c.model === primary ? '⭐ ' : ''}{c.model}</td>{metrics.slice(0, 3).map((m) => <td key={m} className="mono small">{m === 'mae' || m === 'rmse' ? Math.round(c[m]).toLocaleString('en-IN') : c[m].toFixed(3)}</td>)}</tr>)}</tbody></table></div>
        </Card>
      </div>
      <div className="grid g2 mt16 stagger">
        <Card title="Training curve" sub="Loss per epoch (and validation score)">
          <div style={{ height: 250 }}><ResponsiveContainer><LineChart data={loss} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="epoch" tickLine={false} axisLine={false} /><YAxis yAxisId="l" tickLine={false} axisLine={false} /><YAxis yAxisId="v" orientation="right" tickLine={false} axisLine={false} domain={['auto', 'auto']} /><Tooltip /><Legend />
            <Line yAxisId="l" dataKey="loss" name="Training loss" stroke="var(--accent)" dot={false} strokeWidth={2.5} />
            {M.val_curve?.length > 0 && <Line yAxisId="v" dataKey="val" name="Validation score" stroke="#10b981" dot={false} strokeWidth={2} />}
          </LineChart></ResponsiveContainer></div>
        </Card>
        <Card title="Permutation feature importance" sub="Drop in score when a feature is shuffled">
          <div style={{ height: 250 }}><ResponsiveContainer><BarChart data={imp} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide /><YAxis type="category" dataKey="f" width={140} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="v" name="Importance" radius={[0, 6, 6, 0]}>{imp.map((x, i) => <Cell key={x.f} fill={HEX[i % HEX.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
      {task === 'classification' ? (
        <div className="grid g3 mt16 stagger">
          <Card title="ROC curve" sub={`AUC = ${best.auc.toFixed(3)}`}>
            <div style={{ height: 240 }}><ResponsiveContainer><AreaChart data={M.roc.map(([x, y]) => ({ x, y }))} margin={{ left: -18 }}>
              <XAxis dataKey="x" type="number" domain={[0, 1]} tickLine={false} axisLine={false} /><YAxis domain={[0, 1]} tickLine={false} axisLine={false} /><Tooltip />
              <Area dataKey="y" name="TPR" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2.5} type="monotone" /></AreaChart></ResponsiveContainer></div>
          </Card>
          <Card title="Confusion matrix" sub="Test set, threshold 0.5">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 6, alignItems: 'center' }}>
              <span /><b className="small" style={{ textAlign: 'center' }}>Pred {classes[0]}</b><b className="small" style={{ textAlign: 'center' }}>Pred {classes[1]}</b>
              {M.confusion.map((row, i) => [<b key={'l' + i} className="small">True {classes[i]}</b>, ...row.map((v, j) => {
                const tot = M.confusion.flat().reduce((a, b) => a + b, 0); return (
                  <div key={i + '-' + j} style={{ aspectRatio: '1.4', borderRadius: 12, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, color: i === j ? '#fff' : 'var(--text)', background: i === j ? `linear-gradient(135deg, var(--accent), var(--accent2))` : `color-mix(in srgb, var(--bad) ${Math.round((v / tot) * 300)}%, var(--surface2))` }}>
                    {v}<span style={{ fontSize: 11, fontWeight: 600, opacity: .8 }}>{((v / tot) * 100).toFixed(1)}%</span></div>); })])}
            </div>
          </Card>
          <Card title="Calibration" sub="Predicted vs observed rate">
            <div style={{ height: 240 }}><ResponsiveContainer><ScatterChart margin={{ left: -18 }}>
              <XAxis dataKey="pred" type="number" domain={[0, 1]} tickLine={false} axisLine={false} name="Predicted" /><YAxis dataKey="obs" type="number" domain={[0, 1]} tickLine={false} axisLine={false} name="Observed" /><ZAxis dataKey="n" range={[60, 300]} /><Tooltip />
              <Scatter data={M.calibration} fill="var(--accent)" /><Scatter data={[{ pred: 0, obs: 0, n: 1 }, { pred: 1, obs: 1, n: 1 }]} line={{ stroke: 'var(--faint)', strokeDasharray: '4 4' }} fill="transparent" /></ScatterChart></ResponsiveContainer></div>
          </Card>
        </div>
      ) : (
        <Card className="mt16 fade-up" title="Predicted vs actual" sub="Test set sample">
          <div style={{ height: 300 }}><ResponsiveContainer><ScatterChart margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="a" type="number" name="Actual" tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + Math.round(v / 1000) + 'k'} /><YAxis dataKey="p" type="number" name="Predicted" tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + Math.round(v / 1000) + 'k'} /><Tooltip />
            <Scatter data={M.pred_vs_actual.map(([a, p]) => ({ a, p }))} fill="var(--accent)" fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div>
        </Card>
      )}
    </>
  );
}
