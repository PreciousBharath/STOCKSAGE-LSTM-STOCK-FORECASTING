import { LineChart, FlaskConical, Telescope, BarChart3, Cpu, BookOpen, Zap, Gauge, Upload, Bell, Brain } from 'lucide-react';
import createApp from './core/createApp.jsx';
import { LabProvider } from './lib/lstm.jsx';
import Studio from './pages/Studio.jsx';
import Forecast from './pages/Forecast.jsx';
import Explorer from './pages/Explorer.jsx';
import Runs from './pages/Runs.jsx';
import HowItWorks from './pages/HowItWorks.jsx';

export default createApp({
  name: 'StockSage',
  storageKey: 'stocksage',
  logo: LineChart,
  accent: ['#f59e0b', '#ef4444'],
  defaultTheme: 'dark',
  github: 'https://github.com/PreciousBharath/STOCKSAGE-LSTM-STOCK-FORECASTING',
  stack: 'TensorFlow.js LSTM',
  Provider: LabProvider,
  heroTitle: 'Train an LSTM on stock prices — in your browser, in seconds.',
  heroText: 'A deep-learning lab for time series: tune hyper-parameters, watch loss curves live, benchmark against baselines and forecast with uncertainty bands.',
  heroFeatures: [
    [Cpu, 'GPU training via TensorFlow.js', 'Stacked LSTM, dropout, Adam — no server needed'],
    [Gauge, 'Honest evaluation', 'Hold-out test, RMSE, MAPE, direction accuracy, baselines'],
    [Upload, 'Bring your own data', 'Upload any Date/Close CSV from NSE or Yahoo'],
  ],
  heroStats: [['LSTM', 'deep learning'], ['4', 'baselines'], ['100%', 'in-browser']],
  registerText: 'Save experiments and hyper-parameters',
  roles: ['Data scientist', 'Student', 'Trader', 'Researcher', 'Educator'],
  demo: { name: 'Bharath Kumar', email: 'demo@stocksage.app', password: 'Demo@1234', role: 'Data scientist' },
  promo: ['⚡ Pro tip', 'Start with window 20, 1×32 units, 15 epochs.'],
  notifications: [[Zap, 'WebGL backend ready', 'Training runs on your GPU'], [Brain, 'New: experiment tracker', 'Compare every run side by side'], [Bell, 'Upload real data', 'Date + Close CSV supported']],
  nav: [
    { section: 'Deep learning lab', items: [
      { to: '/', label: 'Training studio', icon: FlaskConical, page: Studio, tag: 'GPU' },
      { to: '/forecast', label: 'Forecast', icon: Telescope, page: Forecast },
      { to: '/runs', label: 'Experiments', icon: BarChart3, page: Runs },
    ] },
    { section: 'Learn', items: [
      { to: '/data', label: 'Data explorer', icon: LineChart, page: Explorer },
      { to: '/how', label: 'How LSTMs work', icon: BookOpen, page: HowItWorks },
    ] },
  ],
});
