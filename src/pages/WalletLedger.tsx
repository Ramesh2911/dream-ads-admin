import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, Search, ArrowDown, ArrowUp, Activity, Inbox, ArrowRight,
  ChevronLeft, ChevronRight, Receipt,
} from 'lucide-react';
import api from '../lib/api';
import { Badge } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';

interface Entry {
  _id: string;
  user: { name: string; email?: string; referralCode?: string } | null;
  wallet: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  note?: string;
  createdAt: string;
}
interface LedgerData { entries: Entry[]; total: number; page: number; pages: number }
interface Stats {
  totals: {
    outstanding: number; outstandingVideo: number; outstandingSocial: number;
    credits: number; creditsVideo: number; creditsSocial: number;
    debits: number; debitsVideo: number; debitsSocial: number;
    entries: number;
  };
  days: { date: string; credits: number; debits: number; creditCount: number; debitCount: number }[];
  byReason: { reason: string; type: string; total: number; count: number }[];
}

const REASON_TONE: Record<string, string> = {
  watch_reward: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25',
  task_reward: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25',
  referral_reward: 'text-accent-violet bg-accent-violet/10 border-accent-violet/25',
  referral_commission: 'text-accent-pink bg-accent-pink/10 border-accent-pink/25',
  withdrawal: 'text-accent-red bg-accent-red/10 border-accent-red/25',
  deposit: 'text-accent-green bg-accent-green/10 border-accent-green/25',
  voucher_purchase: 'text-accent-gold bg-accent-goldDark/10 border-accent-goldDark/25',
  chat_access: 'text-accent-blue bg-brand-blueLight/10 border-brand-blueLight/25',
  admin_adjustment: 'text-accent-pink bg-accent-pink/10 border-accent-pink/25',
  signup_bonus: 'text-accent-green bg-accent-green/10 border-accent-green/25',
  recharge: 'text-accent-green bg-accent-green/10 border-accent-green/25',
};
const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;

const human = (r: string) => r.replace(/_/g, ' ');

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

export default function WalletLedger() {
  const [wallet, setWallet] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ledger-stats'],
    queryFn: async (): Promise<Stats> => (await api.get('/admin/ledger-stats')).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', wallet, type, search, page],
    queryFn: async (): Promise<LedgerData> =>
      (await api.get('/admin/ledger', {
        params: {
          wallet: wallet || undefined,
          type: type || undefined,
          search: search || undefined,
          page,
          limit: 30,
        },
      })).data.data,
    placeholderData: (prev) => prev,
  });

  const t = stats?.totals;
  const statsChips = [
    { label: 'Circulating', value: stats ? formatCoins(t!.outstanding) : null, icon: Wallet, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: stats ? `V ${formatCoins(t!.outstandingVideo)} · S ${formatCoins(t!.outstandingSocial)}` : '' },
    { label: 'Credits issued', value: stats ? formatCoins(t!.credits) : null, icon: ArrowDown, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: stats ? `V ${formatCoins(t!.creditsVideo)} · S ${formatCoins(t!.creditsSocial)}` : '' },
    { label: 'Debits spent', value: stats ? formatCoins(t!.debits) : null, icon: ArrowUp, chip: 'bg-accent-red/15 text-accent-red border-accent-red/25', sub: stats ? `V ${formatCoins(t!.debitsVideo)} · S ${formatCoins(t!.debitsSocial)}` : '' },
    { label: 'Ledger entries', value: stats ? t!.entries : null, icon: Activity, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: 'immutable record' },
  ];

  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const byReason = stats?.byReason ?? [];
  const maxReason = Math.max(1, ...byReason.map((r) => r.total));

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 30 + 1;
  const end = Math.min(page * 30, total);

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Wallet className="w-5 h-5 text-accent-gold" /></span>
            Wallet & Ledger
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Immutable transaction history, balances and flow analytics</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {/* stats chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statsChips.map((s, i) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cn('p-2.5 rounded-xl border shrink-0', s.chip)}><s.icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{s.label}</p>
              <p className="text-xl font-extrabold text-white tabular-nums leading-tight">{s.value ?? '—'}</p>
              {s.sub && <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Activity className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Coin flow</h3>
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green" /> credits</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent-red" /> debits</span>
            </span>
          </div>
          {statsLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ledCredits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="credits" name="Credits" fill="url(#ledCredits)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line dataKey="debits" name="Debits" type="monotone" stroke="#F87171" strokeWidth={2.5} dot={{ r: 3, fill: '#F87171', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Receipt className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Top reasons</h3>
          </div>
          {statsLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!statsLoading && byReason.length === 0 && (
            <p className="text-sm text-zinc-500 py-8 text-center">No ledger activity yet.</p>
          )}
          <div className="space-y-2.5">
            {byReason.map((r, i) => (
              <div key={`${r.reason}-${r.type}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div
                  className={cn('absolute inset-y-0 left-0 opacity-15', r.type === 'credit' ? 'bg-accent-green' : 'bg-accent-red')}
                  style={{ width: `${Math.max(6, Math.round((r.total / maxReason) * 100))}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white capitalize truncate">{human(r.reason)}</p>
                    <p className="text-[10px] text-zinc-500">{r.count} entries</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-bold tabular-nums', r.type === 'credit' ? 'text-accent-green' : 'text-accent-red')}>
                      {r.type === 'credit' ? '+' : '−'}{formatCoins(r.total)}
                    </p>
                    <p className="text-[10px] text-zinc-600">{r.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ledger list */}
      <div className="glass overflow-hidden animate-fade-in">
        {/* toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-white/[0.08]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="field-gold !py-2 pl-10"
              placeholder="Search by user name, email or code…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              {[{ k: '', l: 'All wallets' }, { k: 'video', l: 'Video' }, { k: 'social', l: 'Social' }].map((w) => (
                <button
                  key={w.k}
                  onClick={() => { setWallet(w.k); setPage(1); }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    wallet === w.k
                      ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  {w.l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              {[{ k: '', l: 'All' }, { k: 'credit', l: 'Credits' }, { k: 'debit', l: 'Debits' }].map((x) => (
                <button
                  key={x.k}
                  onClick={() => { setType(x.k); setPage(1); }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    type === x.k
                      ? x.k === 'credit'
                        ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                        : x.k === 'debit'
                        ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                        : 'bg-white/[0.1] text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                  )}
                >
                  {x.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* rows */}
        {isLoading ? (
          <div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05]">
                <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse" />
                <div className="flex-1 space-y-2"><div className="h-3.5 w-36 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-52 rounded bg-white/[0.04] animate-pulse" /></div>
                <div className="h-6 w-20 rounded-full bg-white/[0.05] animate-pulse" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-accent-gold" />
            </div>
            <p className="text-white font-semibold">No ledger entries found</p>
            <p className="mt-1 text-sm text-zinc-500">Adjust filters — transactions appear here the moment coins move.</p>
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={e._id}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.4fr)_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
            >
              <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold">
                    {e.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className={cn('absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-base-950 flex items-center justify-center', e.type === 'credit' ? 'bg-accent-green' : 'bg-accent-red')}>
                    {e.type === 'credit' ? <ArrowDown className="w-2 h-2 text-base-950" /> : <ArrowUp className="w-2 h-2 text-base-950" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{e.user?.name ?? 'Unknown user'}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{e.user?.email ?? e.user?.referralCode ?? '—'}</p>
                </div>
              </div>
              <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-0.5">
                <p className={cn('text-base font-extrabold tabular-nums', e.type === 'credit' ? 'text-accent-green' : 'text-accent-red')}>
                  {e.type === 'credit' ? '+' : '−'}{formatCoins(e.amount)}
                </p>
                <Badge variant={e.wallet === 'video' ? 'info' : 'warning'}>{e.wallet}</Badge>
              </div>
              <div className="min-w-0">
                <span className={cn('inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold capitalize', REASON_TONE[e.reason] ?? 'bg-white/[0.08] text-zinc-300 border-white/10')}>
                  {human(e.reason)}
                </span>
                {e.note && <p className="text-[11px] text-zinc-600 truncate mt-1.5">{e.note}</p>}
              </div>
              <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Balance after</p>
                  <p className="text-sm font-bold text-zinc-200 tabular-nums">{formatCoins(e.balanceAfter)}</p>
                </div>
                <div className="text-right shrink-0 w-24">
                  <p className="text-[11px] text-zinc-400" title={formatDate(e.createdAt)}>{rel(e.createdAt)}</p>
                  <p className="text-[10px] text-zinc-600 hidden md:block">{formatDate(e.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* pagination */}
        {data && data.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
            <p className="text-xs text-zinc-500">
              Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-zinc-500 px-2">Page {page} / {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* footnote */}
      <p className="mt-4 text-[11px] text-zinc-600 flex items-center gap-1.5">
        <ArrowRight className="w-3 h-3" />
        All balance changes are recorded in an immutable ledger. Manual adjustments require a reason and are fully audited (Users → Adjust wallet).
      </p>
    </div>
  );
}
