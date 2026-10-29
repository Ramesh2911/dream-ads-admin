import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Landmark, IndianRupee, Clock3, AlertTriangle, Smartphone, Building2, CheckCircle2,
  XCircle, Banknote, Inbox, ChevronLeft, ChevronRight, Send, Wallet,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface WdItem {
  _id: string; user: { name: string; email?: string; mobile?: string } | null;
  amount: number; wallet: string; method: string; destination: string;
  status: string; paymentRef?: string; rejectionReason?: string; createdAt: string;
}
interface DpItem {
  _id: string; user: { name: string; email?: string } | null;
  amount: number; gateway: string; status: string; gatewayRef?: string; createdAt: string;
}
interface WdData { withdrawals: WdItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface DpData { deposits: DpItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface FinStats {
  withdrawals: {
    pending: { count: number; sum: number }; approved: { count: number; sum: number };
    paid: { count: number; sum: number }; rejected: { count: number; sum: number };
    inflight: number; inflightCount: number;
  };
  deposits: { pending: { count: number; sum: number }; completed: { count: number; sum: number }; failed: { count: number; sum: number } };
  days: { date: string; paid: number; paidCount: number; deposits: number; depositCount: number }[];
  byMethod: { method: string; count: number; sum: number }[];
  byWallet: { wallet: string; count: number; sum: number }[];
  byGateway: { gateway: string; count: number; sum: number }[];
}

const METHOD_TONE: Record<string, string> = {
  upi: 'text-accent-violet bg-accent-violet/10 border-accent-violet/25',
  bank: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25',
  paytm: 'text-accent-pink bg-accent-pink/10 border-accent-pink/25',
};
const WD_STATUS: Record<string, { cls: string; dot: string }> = {
  pending: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  approved: { cls: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25', dot: 'bg-accent-blue' },
  paid: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  rejected: { cls: 'text-accent-red bg-accent-red/10 border-accent-red/25', dot: 'bg-accent-red' },
};
const DP_STATUS: Record<string, { cls: string; dot: string }> = {
  pending: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  completed: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  failed: { cls: 'text-accent-red bg-accent-red/10 border-accent-red/25', dot: 'bg-accent-red' },
};
const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

function StatusPill({ status, map }: { status: string; map: Record<string, { cls: string; dot: string }> }) {
  const s = map[status] ?? { cls: 'bg-white/[0.08] text-zinc-300 border-white/10', dot: 'bg-zinc-500' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize', s.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} /> {status}
    </span>
  );
}

type Confirm =
  | null
  | { kind: 'approve'; id: string; name: string; amount: number; wallet: string; destination?: string; method?: string }
  | { kind: 'reject'; id: string; name: string; amount: number; wallet: string; destination?: string; method?: string }
  | { kind: 'paid'; id: string; name: string; amount: number; wallet: string; destination?: string; method?: string }
  | { kind: 'complete'; id: string; name: string; amount: number }
  | { kind: 'fail'; id: string; name: string; amount: number };

export default function Finance() {
  const [tab, setTab] = useState<'withdrawals' | 'deposits'>('withdrawals');
  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Landmark className="w-5 h-5 text-accent-gold" /></span>
            Finance Operations
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Review payout requests and deposits — every action is audited</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {tab === 'withdrawals' ? <Withdrawals onTab={setTab} /> : <Deposits onTab={setTab} />}

      {/* tab switcher (bottom, sticky-feel) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:left-auto lg:right-8 lg:translate-x-0">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-base-950/80 backdrop-blur-xl border border-white/[0.1] shadow-glow-goldSoft">
          {([['withdrawals', 'Withdrawals', Landmark], ['deposits', 'Deposits', Wallet]] as const).map(([k, l, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                'flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all',
                tab === k
                  ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function useFinanceStats() {
  return useQuery({
    queryKey: ['finance-stats'],
    queryFn: async (): Promise<FinStats> => (await api.get('/admin/finance-stats')).data.data,
  });
}

function FinanceOverview({ stats, statsLoading, children }: { stats?: FinStats; statsLoading: boolean; children?: ReactNode }) {
  const t = stats?.withdrawals;
  const d = stats?.deposits;
  const statsChips = [
    { label: 'In-flight payouts', value: stats ? formatCoins(t!.inflight) : null, icon: Clock3, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: stats ? `${t!.inflightCount} awaiting completion` : '' },
    { label: 'Paid out (all time)', value: stats ? formatCoins(t!.paid.sum) : null, icon: Banknote, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: stats ? `${t!.paid.count} payouts` : '' },
    { label: 'Deposits completed', value: stats ? formatCoins(d!.completed.sum) : null, icon: IndianRupee, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: stats ? `${d!.completed.count} deposits` : '' },
    { label: 'Needs review', value: stats ? (t!.pending.count + d!.pending.count) : null, icon: AlertTriangle, chip: 'bg-accent-pink/15 text-accent-pink border-accent-pink/25', sub: stats ? `${t!.pending.count} payouts · ${d!.pending.count} deposits` : '' },
  ];

  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const maxBreak = Math.max(1, ...(stats?.byMethod ?? []).map((r) => r.sum), ...(stats?.byGateway ?? []).map((r) => r.sum));

  return (
    <>
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

      {/* chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Landmark className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Money flow</h3>
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green" /> deposits</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent-gold" /> payouts</span>
            </span>
          </div>
          {statsLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="finDeposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="deposits" name="Deposits in" fill="url(#finDeposits)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line dataKey="paid" name="Payouts out" type="monotone" stroke="#FFD86F" strokeWidth={2.5} dot={{ r: 3, fill: '#FFD86F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Banknote className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Channels</h3>
          </div>
          {statsLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!statsLoading && (stats?.byMethod.length ?? 0) === 0 && (stats?.byGateway.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500 py-8 text-center">No payout or deposit activity yet.</p>
          )}
          <div className="space-y-2">
            {(stats?.byMethod ?? []).map((r) => (
              <div key={`m-${r.method}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-accent-violet opacity-15" style={{ width: `${Math.max(6, Math.round((r.sum / maxBreak) * 100))}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    {r.method === 'upi' ? <Smartphone className="w-3.5 h-3.5 text-accent-violet shrink-0" /> : r.method === 'bank' ? <Building2 className="w-3.5 h-3.5 text-accent-blue shrink-0" /> : <Banknote className="w-3.5 h-3.5 text-accent-pink shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white uppercase truncate">{r.method}</p>
                      <p className="text-[10px] text-zinc-500">{r.count} payouts · active</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-zinc-200 tabular-nums shrink-0">{formatCoins(r.sum)}</p>
                </div>
              </div>
            ))}
            {(stats?.byGateway ?? []).map((r) => (
              <div key={`g-${r.gateway}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-accent-green opacity-15" style={{ width: `${Math.max(6, Math.round((r.sum / maxBreak) * 100))}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <IndianRupee className="w-3.5 h-3.5 text-accent-green shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white capitalize truncate">{r.gateway}</p>
                      <p className="text-[10px] text-zinc-500">{r.count} deposits</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-zinc-200 tabular-nums shrink-0">{formatCoins(r.sum)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {children}
    </>
  );
}

function Pagination({ page, pages, total, start, end, setPage }: { page: number; pages: number; total: number; start: number; end: number; setPage: (fn: (p: number) => number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
      <p className="text-xs text-zinc-500">
        Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-xs text-zinc-500 px-2">Page {page} / {pages}</span>
        <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-ghost !py-1.5 disabled:opacity-40">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Withdrawals({ onTab }: { onTab: (t: 'withdrawals' | 'deposits') => void }) {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState('');
  const [payRef, setPayRef] = useState('');
  const qc = useQueryClient();
  const { can } = useAuth();
  const { data: stats, isLoading: statsLoading } = useFinanceStats();
  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals', status, page],
    queryFn: async (): Promise<WdData> => (await api.get('/admin/withdrawals', { params: { status, page, limit: 30 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const mut = useMutation({
    mutationFn: ({ id, status, paymentRef, rejectionReason }: { id: string; status: string; paymentRef?: string; rejectionReason?: string }) =>
      api.put(`/admin/withdrawals/${id}`, { status, paymentRef, rejectionReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['withdrawals'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); qc.invalidateQueries({ queryKey: ['ledger-stats'] }); },
  });

  const items = data?.withdrawals ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 30 + 1;
  const end = Math.min(page * 30, total);
  const manage = can('finance.approve');

  const openConfirm = (c: Confirm) => {
    if (!c) return;
    if (c.kind === 'reject') setReason('');
    if (c.kind === 'paid') setPayRef('TXN' + Date.now());
    setConfirm(c);
  };
  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'approve') mut.mutate({ id: confirm.id, status: 'approved' });
    if (confirm.kind === 'reject') mut.mutate({ id: confirm.id, status: 'rejected', rejectionReason: reason || undefined });
    if (confirm.kind === 'paid') mut.mutate({ id: confirm.id, status: 'paid', paymentRef: payRef || undefined });
    setConfirm(null);
  };

  return (
    <>
      <FinanceOverview stats={stats} statsLoading={statsLoading}>
        <div className="glass overflow-hidden animate-fade-in">
          {/* status pills */}
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.08]">
            {['pending', 'approved', 'paid', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border',
                  status === s
                    ? s === 'pending' ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/30 shadow-glow-goldSoft'
                    : s === 'paid' ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                    : s === 'rejected' ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                    : 'bg-brand-blue/15 text-accent-blue border-brand-blue/30'
                    : 'bg-white/[0.04] text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.08]'
                )}
              >
                {s} <span className="ml-1 opacity-60">{counts[s] ?? 0}</span>
              </button>
            ))}
            <button onClick={() => onTab('deposits')} className="ml-auto text-xs text-accent-gold hover:underline flex items-center gap-1">
              Switch to deposits <span aria-hidden>→</span>
            </button>
          </div>

          {isLoading ? (
            <div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05]">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2"><div className="h-3.5 w-36 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-52 rounded bg-white/[0.04] animate-pulse" /></div>
                  <div className="h-6 w-20 rounded-full bg-white/[0.05] animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-accent-gold" />
              </div>
              <p className="text-white font-semibold">No {status} withdrawals</p>
              <p className="mt-1 text-sm text-zinc-500">Requests appear here the moment users request a payout.</p>
            </div>
          ) : (
            items.map((w, i) => (
              <div
                key={w._id}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1.5fr)_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {w.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.user?.name ?? 'Unknown user'}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{w.user?.mobile ?? w.user?.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-1">
                  <p className="text-base font-extrabold text-accent-gold tabular-nums">{formatCoins(w.amount)}</p>
                  <Badge variant={w.wallet === 'video' ? 'info' : 'warning'}>{w.wallet}</Badge>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <span className={cn('inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase', METHOD_TONE[w.method] ?? 'bg-white/[0.08] text-zinc-300 border-white/10')}>
                    {w.method}
                  </span>
                  <p className="text-[11px] text-zinc-500 truncate" title={w.destination}>{w.destination}</p>
                  {w.status === 'paid' && w.paymentRef && <p className="text-[10px] text-zinc-600 truncate">ref: {w.paymentRef}</p>}
                  {w.status === 'rejected' && w.rejectionReason && <p className="text-[10px] text-accent-red/70 truncate">reason: {w.rejectionReason}</p>}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex flex-col md:items-end gap-1">
                    <StatusPill status={w.status} map={WD_STATUS} />
                    <p className="text-[11px] text-zinc-600 md:text-right" title={formatDate(w.createdAt)}>{rel(w.createdAt)}</p>
                  </div>
                  {manage && w.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => openConfirm({ kind: 'approve', id: w._id, name: w.user?.name ?? 'user', amount: w.amount, wallet: w.wallet, destination: w.destination, method: w.method })} className="btn-ghost !py-1.5 px-3 text-xs text-accent-green">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => openConfirm({ kind: 'reject', id: w._id, name: w.user?.name ?? 'user', amount: w.amount, wallet: w.wallet, destination: w.destination, method: w.method })} className="btn-ghost !py-1.5 px-3 text-xs text-accent-red">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {manage && w.status === 'approved' && (
                    <button onClick={() => openConfirm({ kind: 'paid', id: w._id, name: w.user?.name ?? 'user', amount: w.amount, wallet: w.wallet, destination: w.destination, method: w.method })} className="btn-gold !py-1.5 px-3 text-xs">
                      <Send className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          <Pagination page={page} pages={data?.pages ?? 1} total={total} start={start} end={end} setPage={setPage} />
        </div>
      </FinanceOverview>

      {/* confirm modal */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'reject' ? 'Reject withdrawal' : confirm?.kind === 'paid' ? 'Mark payout as paid' : confirm?.kind === 'approve' ? 'Approve withdrawal' : confirm?.kind === 'complete' ? 'Complete deposit' : confirm?.kind === 'fail' ? 'Fail deposit' : ''}
      >
        {confirm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Banknote className="w-4 h-4 text-accent-gold" /></span>
              <div>
                <p className="text-sm text-white font-semibold">{confirm.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatCoins(confirm.amount)}
                  {'wallet' in confirm && <> · {confirm.wallet} wallet</>}
                </p>
                {'destination' in confirm && confirm.destination ? (
                  <p className="text-xs text-zinc-400 font-mono mt-1.5 break-all bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5" title={confirm.destination}>
                    {confirm.destination}
                  </p>
                ) : null}
              </div>
            </div>
            {confirm.kind === 'reject' && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Rejection reason (optional)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="field-gold resize-none" placeholder="e.g. invalid destination, failed verification…" />
                <p className="mt-1.5 text-[11px] text-zinc-600">Coins are refunded to the {confirm.wallet} wallet automatically.</p>
              </div>
            )}
            {confirm.kind === 'paid' && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Payment reference</label>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="field-gold" placeholder="UTR / transaction id" />
              </div>
            )}
            {confirm.kind === 'complete' && <p className="text-sm text-zinc-400">{formatCoins(confirm.amount)} will be credited to the user's social wallet and recorded in the ledger.</p>}
            {confirm.kind === 'fail' && <p className="text-sm text-zinc-400">Mark this deposit as failed. No coins are credited.</p>}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setConfirm(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button
                onClick={runConfirm}
                disabled={mut.isPending || (confirm.kind === 'paid' && !payRef.trim())}
                className={cn(
                  'btn !py-2 px-4 text-xs disabled:opacity-50',
                  confirm.kind === 'reject' || confirm.kind === 'fail'
                    ? 'bg-accent-red/90 hover:bg-accent-red text-white'
                    : 'btn-gold'
                )}
              >
                {mut.isPending ? 'Saving…' : confirm.kind === 'approve' ? 'Approve' : confirm.kind === 'reject' ? 'Reject & refund' : confirm.kind === 'paid' ? 'Confirm paid' : confirm.kind === 'complete' ? 'Complete' : 'Mark failed'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Deposits({ onTab }: { onTab: (t: 'withdrawals' | 'deposits') => void }) {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const qc = useQueryClient();
  const { can } = useAuth();
  const { data: stats, isLoading: statsLoading } = useFinanceStats();
  const { data, isLoading } = useQuery({
    queryKey: ['deposits', status, page],
    queryFn: async (): Promise<DpData> => (await api.get('/admin/deposits', { params: { status, page, limit: 30 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/deposits/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); qc.invalidateQueries({ queryKey: ['finance-stats'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); qc.invalidateQueries({ queryKey: ['ledger-stats'] }); },
  });

  const items = data?.deposits ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 30 + 1;
  const end = Math.min(page * 30, total);
  const manage = can('finance.approve');

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'complete') mut.mutate({ id: confirm.id, status: 'completed' });
    if (confirm.kind === 'fail') mut.mutate({ id: confirm.id, status: 'failed' });
    setConfirm(null);
  };

  return (
    <>
      <FinanceOverview stats={stats} statsLoading={statsLoading}>
        <div className="glass overflow-hidden animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.08]">
            {['pending', 'completed', 'failed'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border',
                  status === s
                    ? s === 'pending' ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/30 shadow-glow-goldSoft'
                    : s === 'completed' ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                    : 'bg-accent-red/15 text-accent-red border-accent-red/30'
                    : 'bg-white/[0.04] text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.08]'
                )}
              >
                {s} <span className="ml-1 opacity-60">{counts[s] ?? 0}</span>
              </button>
            ))}
            <button onClick={() => onTab('withdrawals')} className="ml-auto text-xs text-accent-gold hover:underline flex items-center gap-1">
              Switch to withdrawals <span aria-hidden>→</span>
            </button>
          </div>

          {isLoading ? (
            <div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05]">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1 space-y-2"><div className="h-3.5 w-36 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-52 rounded bg-white/[0.04] animate-pulse" /></div>
                  <div className="h-6 w-20 rounded-full bg-white/[0.05] animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green/20 to-brand-blue/10 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-accent-green" />
              </div>
              <p className="text-white font-semibold">No {status} deposits</p>
              <p className="mt-1 text-sm text-zinc-500">Deposit requests show up here instantly for review.</p>
            </div>
          ) : (
            items.map((d, i) => (
              <div
                key={d._id}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1.2fr)_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-green/70 to-accent-blue/50 transition-all" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-green/80 to-brand-blue/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {d.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{d.user?.name ?? 'Unknown user'}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{d.user?.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-2">
                  <p className="text-base font-extrabold text-accent-green tabular-nums">+{formatCoins(d.amount)}</p>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold capitalize bg-white/[0.08] text-zinc-300 border-white/10">
                    {d.gateway}
                  </span>
                </div>
                <div className="min-w-0">
                  <StatusPill status={d.status} map={DP_STATUS} />
                  {d.gatewayRef && <p className="text-[10px] text-zinc-600 truncate mt-1">ref: {d.gatewayRef}</p>}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <p className="text-[11px] text-zinc-600" title={formatDate(d.createdAt)}>{rel(d.createdAt)}</p>
                  {manage && d.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => setConfirm({ kind: 'complete', id: d._id, name: d.user?.name ?? 'user', amount: d.amount })} className="btn-ghost !py-1.5 px-3 text-xs text-accent-green">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </button>
                      <button onClick={() => setConfirm({ kind: 'fail', id: d._id, name: d.user?.name ?? 'user', amount: d.amount })} className="btn-ghost !py-1.5 px-3 text-xs text-accent-red">
                        <XCircle className="w-3.5 h-3.5" /> Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          <Pagination page={page} pages={data?.pages ?? 1} total={total} start={start} end={end} setPage={setPage} />
        </div>
      </FinanceOverview>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'complete' ? 'Complete deposit' : 'Fail deposit'}
      >
        {confirm && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-green/10 border border-accent-green/20"><IndianRupee className="w-4 h-4 text-accent-green" /></span>
              <div>
                <p className="text-sm text-white font-semibold">{confirm.name}</p>
                <p className="text-xs text-zinc-500">{formatCoins(confirm.amount)}</p>
              </div>
            </div>
            {confirm.kind === 'complete' && <p className="text-sm text-zinc-400">Coins will be credited to the user's social wallet and recorded in the ledger.</p>}
            {confirm.kind === 'fail' && <p className="text-sm text-zinc-400">Mark this deposit as failed. No coins are credited.</p>}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setConfirm(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button
                onClick={runConfirm}
                disabled={mut.isPending}
                className={cn('btn !py-2 px-4 text-xs disabled:opacity-50', confirm.kind === 'fail' ? 'bg-accent-red/90 hover:bg-accent-red text-white' : 'btn-gold')}
              >
                {mut.isPending ? 'Saving…' : confirm.kind === 'complete' ? 'Complete' : 'Mark failed'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
