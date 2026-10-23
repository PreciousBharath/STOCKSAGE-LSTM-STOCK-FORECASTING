import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Brain, CalendarRange } from 'lucide-react';
import { useLab } from '../lib/lstm.jsx';
import { Card, PageHead, Badge, Empty, Tabs, Stat } from '../core/ui.jsx';

export default function Forecast() {
  const L = useLab(); const nav = useNavigate();
  const [days, setDays] = useState(20); const [fc, setFc] = useState(null);
  useEffect(() => { let on = true; if (L.status === 'done') L.forecast(days).then((f) => on && setFc(f)); return () => { on = false; }; }, [L.status, days, L.result]); // eslint-disable-line
  if (L.status !== 'done') return (<><PageHead title="Forecast" crumbs="StockSage / Forecast" /><Card><Empty icon={Brain} title="Train a model first" text="The forecast uses the LSTM you train in the studio." action={<button className="btn btn-primary" onClick={() => nav('/')}>Open training studio</button>} /></Card></>);
  const hist = L.series.slice(-90); const last = hist[hist.length - 1];
  const d0 = new Date(last.date); const fdates = []; while (fdates.length < days) { d0.setDate(d0.getDate() + 1); if (d0.getDay() % 6) fdates.push(d0.toISOString().slice(0, 10)); }
  const sigma = L.result.resid;
  const data = [...hist.map((h) => ({ d: h.date, price: h.close })), ...(fc || []).map((v, i) => ({ d: fdates[i], fc: +v.toFixed(2), band: [+(v - 1.96 * sigma * Math.sqrt(i + 1)).toFixed(2), +(v + 1.96 * sigma * Math.sqrt(i + 1)).toFixed(2)] }))];
  if (fc) data[hist.length - 1].fc = last.close;
  const end = fc ? fc[fc.length - 1] : last.close; const chg = ((end - last.close) / last.close) * 100;
  return (
    <>
      <PageHead title="Price forecast" crumbs="StockSage / Forecast" sub={`${L.dsName} · recursive multi-step forecast from your trained LSTM`}>
        <Tabs value={days} onChange={setDays} options={[5, 10, 20, 40].map((d) => ({ id: d, label: d + ' days' }))} />
      </PageHead>
      <div className="grid g4 stagger">
        <Stat icon={CalendarRange} label="Last close" value={last.close} decimals={2} prefix="₹" />
        <Stat icon={chg >= 0 ? TrendingUp : TrendingDown} label={`Forecast in ${days} trading days`} value={end} decimals={2} prefix="₹" color={chg >= 0 ? '#10b981' : '#ef4444'} />
        <Stat icon={chg >= 0 ? TrendingUp : TrendingDown} label="Expected change" value={chg} decimals={2} suffix="%" color={chg >= 0 ? '#10b981' : '#ef4444'} />
        <Stat icon={Brain} label="95% band at horizon" value={1.96 * sigma * Math.sqrt(days)} decimals={2} prefix="±₹" color="#8b5cf6" />
      </div>
      <Card className="mt16 fade-up" title="Forecast with uncertainty" sub="Shaded band widens with √horizon using the model's test residuals" action={<Badge kind={chg >= 0 ? 'ok' : 'bad'}>{chg >= 0 ? 'Bullish' : 'Bearish'} bias</Badge>}>
        <div style={{ height: 380 }}><ResponsiveContainer><ComposedChart data={data} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={50} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} /><Tooltip /><Legend />
          <Area dataKey="band" name="95% interval" stroke="none" fill="var(--accent)" fillOpacity={0.15} isAnimationActive={false} />
          <Line dataKey="price" name="History" stroke="var(--text)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="fc" name="LSTM forecast" stroke="var(--accent)" strokeWidth={3} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        </ComposedChart></ResponsiveContainer></div>
      </Card>
      {fc && <Card className="mt16 fade-up" title="Forecast table"><div className="table-wrap"><table className="tbl"><thead><tr><th>Date</th><th>Forecast</th><th>Low (95%)</th><th>High (95%)</th><th>vs last close</th></tr></thead>
        <tbody>{fc.map((v, i) => <tr key={i}><td>{fdates[i]}</td><td className="mono bold">₹{v.toFixed(2)}</td><td className="mono small">₹{(v - 1.96 * sigma * Math.sqrt(i + 1)).toFixed(2)}</td><td className="mono small">₹{(v + 1.96 * sigma * Math.sqrt(i + 1)).toFixed(2)}</td>
          <td><Badge kind={v >= last.close ? 'ok' : 'bad'}>{(((v - last.close) / last.close) * 100).toFixed(2)}%</Badge></td></tr>)}</tbody></table></div>
        <p className="small faint mt12">Educational forecast only — not investment advice.</p></Card>}
    </>
  );
}
