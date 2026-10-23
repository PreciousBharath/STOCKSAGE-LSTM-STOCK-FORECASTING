import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Waves } from 'lucide-react';
import { useLab } from '../lib/lstm.jsx';
import { sma } from '../lib/data.js';
import { Card, PageHead, Stat } from '../core/ui.jsx';

export default function Explorer() {
  const L = useLab(); const c = L.series.map((d) => d.close);
  const s20 = sma(c, 20), s50 = sma(c, 50);
  const std = c.map((_, i) => { if (i < 19) return null; const w = c.slice(i - 19, i + 1); const m = w.reduce((a, b) => a + b, 0) / 20; return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / 20); });
  const rets = c.slice(1).map((v, i) => Math.log(v / c[i]));
  let peak = c[0]; const dd = c.map((v) => { peak = Math.max(peak, v); return +(((v - peak) / peak) * 100).toFixed(2); });
  const data = L.series.map((d, i) => ({ d: d.date, close: d.close, s20: s20[i] && +s20[i].toFixed(2), s50: s50[i] && +s50[i].toFixed(2), bb: std[i] ? [+(s20[i] - 2 * std[i]).toFixed(2), +(s20[i] + 2 * std[i]).toFixed(2)] : null, dd: dd[i] }));
  const bins = 31; const mn = Math.min(...rets), mx = Math.max(...rets); const hist = Array.from({ length: bins }, (_, i) => ({ r: ((mn + ((mx - mn) * (i + 0.5)) / bins) * 100).toFixed(1), n: 0 }));
  rets.forEach((r) => { hist[Math.min(bins - 1, Math.floor(((r - mn) / (mx - mn)) * bins))].n++; });
  const vol = Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length) * Math.sqrt(252) * 100;
  const total = (c[c.length - 1] / c[0] - 1) * 100; const cagr = (Math.pow(c[c.length - 1] / c[0], 252 / c.length) - 1) * 100;
  return (
    <>
      <PageHead title="Data explorer" crumbs="StockSage / Explorer" sub={L.dsName} />
      <div className="grid g4 stagger">
        <Stat icon={total >= 0 ? TrendingUp : TrendingDown} label="Total return" value={total} decimals={1} suffix="%" color={total >= 0 ? '#10b981' : '#ef4444'} />
        <Stat icon={Activity} label="CAGR" value={cagr} decimals={1} suffix="%" color="#0ea5e9" />
        <Stat icon={Waves} label="Annualised volatility" value={vol} decimals={1} suffix="%" color="#f59e0b" />
        <Stat icon={TrendingDown} label="Max drawdown" value={Math.min(...dd)} decimals={1} suffix="%" color="#ef4444" />
      </div>
      <Card className="mt16 fade-up" title="Price with SMA 20/50 & Bollinger bands"><div style={{ height: 360 }}><ResponsiveContainer><ComposedChart data={data} margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={60} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} /><Tooltip /><Legend />
        <Area dataKey="bb" name="Bollinger (20, 2σ)" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} />
        <Line dataKey="close" name="Close" stroke="var(--text)" dot={false} strokeWidth={1.6} isAnimationActive={false} />
        <Line dataKey="s20" name="SMA 20" stroke="#f59e0b" dot={false} strokeWidth={1.6} isAnimationActive={false} /><Line dataKey="s50" name="SMA 50" stroke="#0ea5e9" dot={false} strokeWidth={1.6} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer></div></Card>
      <div className="grid g2 mt16 stagger">
        <Card title="Daily log-return distribution" sub="Fat tails = higher risk"><div style={{ height: 240 }}><ResponsiveContainer><BarChart data={hist} margin={{ left: -18 }}>
          <XAxis dataKey="r" unit="%" tickLine={false} axisLine={false} interval={4} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="n" name="Days" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card title="Drawdown" sub="% below previous peak"><div style={{ height: 240 }}><ResponsiveContainer><AreaChart data={data} margin={{ left: -10 }}>
          <XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={60} /><YAxis unit="%" tickLine={false} axisLine={false} /><Tooltip />
          <Area dataKey="dd" name="Drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></Card>
      </div>
    </>
  );
}
