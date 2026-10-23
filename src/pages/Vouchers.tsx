import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Ticket, Gift, Smartphone, Package, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  Search, Inbox, Copy, Check, Boxes, Layers, Crown, IndianRupee,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface VoucherItem {
  _id: string; title: string; description?: string; provider: string;
  coinCost: number; faceValue?: number; imageUrl?: string; isActive: boolean;
  stock?: number; createdAt: string;
  redemptions: { pending: number; fulfilled: number; failed: number; total: number };
}
interface RedeemItem {
  _id: string; user: { name: string; email?: string; referralCode?: string } | null;
  voucher: { title: string; provider: string; coinCost: number; faceValue?: number } | null;
  code?: string; status: string; createdAt: string;
}
interface RedeemData { redemptions: RedeemItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface VStats {
  totals: { activePackages: number; inactivePackages: number; stock: number; pending: number; fulfilled: number; failed: number; totalRedemptions: number };
  days: { date: string; pending: number; fulfilled: number; failed: number }[];
  topVouchers: { voucherId: string | null; title: string; coinCost: number; provider: string; count: number }[];
}

const PROVIDER_TONE: Record<string, { cls: string; icon: typeof Ticket }> = {
  recharge: { cls: 'from-accent-violet/25 to-accent-violet/5 text-accent-violet', icon: Smartphone },
  voucher: { cls: 'from-accent-gold/25 to-accent-gold/5 text-accent-gold', icon: Ticket },
  gift: { cls: 'from-accent-pink/25 to-accent-pink/5 text-accent-pink', icon: Gift },
};
const RD_STATUS: Record<string, { cls: string; dot: string }> = {
  pending: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  fulfilled: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
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

const emptyForm = { title: '', description: '', provider: 'voucher', coinCost: '', faceValue: '', stock: '', isActive: true };
type FormState = typeof emptyForm;

export default function Vouchers() {
  const [tab, setTab] = useState<'packages' | 'redemptions'>('packages');
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Ticket className="w-5 h-5 text-accent-gold" /></span>
            Recharge & Vouchers
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Manage packages and fulfill redemptions</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {tab === 'packages' ? <Packages onTab={setTab} /> : <Redemptions onTab={setTab} />}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:left-auto lg:right-8 lg:translate-x-0">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-base-950/80 backdrop-blur-xl border border-white/[0.1] shadow-glow-goldSoft">
          {([['packages', 'Packages', Package], ['redemptions', 'Redemptions', Layers]] as const).map(([k, l, Icon]) => (
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

function useVStats() {
  return useQuery({
    queryKey: ['voucher-stats'],
    queryFn: async (): Promise<VStats> => (await api.get('/admin/voucher-stats')).data.data,
  });
}

function VOverview({ stats, statsLoading, children }: { stats?: VStats; statsLoading: boolean; children?: ReactNode }) {
  const t = stats?.totals;
  const statsChips = [
    { label: 'Active packages', value: stats ? t!.activePackages : null, icon: Package, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: stats ? `${t!.inactivePackages} disabled` : '' },
    { label: 'Stock remaining', value: stats ? t!.stock : null, icon: Boxes, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: 'across active packages' },
    { label: 'Fulfilled', value: stats ? t!.fulfilled : null, icon: CheckCircle2, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: stats ? `${t!.totalRedemptions} total redemptions` : '' },
    { label: 'Pending fulfillment', value: stats ? t!.pending : null, icon: Layers, chip: 'bg-accent-pink/15 text-accent-pink border-accent-pink/25', sub: stats ? `${t!.failed} failed` : '' },
  ];
  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  const top = stats?.topVouchers ?? [];
  const maxTop = Math.max(1, ...top.map((r) => r.count));

  return (
    <>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Layers className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Redemptions · last 7 days</h3>
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green" /> fulfilled</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent-gold" /> pending</span>
            </span>
          </div>
          {statsLoading ? (
            <div className="h-[230px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="vchFul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="fulfilled" name="Fulfilled" fill="url(#vchFul)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line dataKey="pending" name="Pending" type="monotone" stroke="#FFD86F" strokeWidth={2.5} dot={{ r: 3, fill: '#FFD86F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Crown className="w-4 h-4 text-accent-gold" /></span>
            <h3 className="font-semibold text-white">Most redeemed</h3>
          </div>
          {statsLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!statsLoading && top.length === 0 && (
            <p className="text-sm text-zinc-500 py-8 text-center">No redemptions yet.</p>
          )}
          <div className="space-y-2.5">
            {top.map((r, i) => {
              const tone = PROVIDER_TONE[r.provider] ?? { cls: 'from-brand-blue/25 to-brand-blue/5 text-accent-blue', icon: Package };
              return (
                <div key={r.voucherId ?? `t-${i}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-accent-gold opacity-15" style={{ width: `${Math.max(6, Math.round((r.count / maxTop) * 100))}%` }} />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className={cn('p-1.5 rounded-lg bg-gradient-to-br shrink-0', r.provider === 'recharge' ? 'text-accent-violet' : r.provider === 'gift' ? 'text-accent-pink' : 'text-accent-gold')}>
                        <tone.icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                        <p className="text-[10px] text-zinc-500">{r.count} redemptions · {formatCoins(r.coinCost)} coins</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-accent-gold shrink-0">#{i + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {children}
    </>
  );
}

function Packages({ onTab }: { onTab: (t: 'packages' | 'redemptions') => void }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<VoucherItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<VoucherItem | null>(null);
  const qc = useQueryClient();
  const { can } = useAuth();
  const manage = can('vouchers.manage');
  const { data: stats, isLoading: statsLoading } = useVStats();
  const { data, isLoading } = useQuery({
    queryKey: ['vouchers'],
    queryFn: async (): Promise<{ vouchers: VoucherItem[] }> => (await api.get('/admin/vouchers')).data.data,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['voucher-stats'] }); qc.invalidateQueries({ queryKey: ['voucher-redemptions'] }); };
  const createMut = useMutation({
    mutationFn: () => api.post('/admin/vouchers', {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      provider: form.provider,
      coinCost: Number(form.coinCost),
      faceValue: form.faceValue ? Number(form.faceValue) : undefined,
      stock: form.stock ? Number(form.stock) : undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); setFormOpen(false); setForm(emptyForm); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save package'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/vouchers/${editing!._id}`, {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      provider: form.provider,
      coinCost: Number(form.coinCost),
      faceValue: form.faceValue ? Number(form.faceValue) : undefined,
      stock: form.stock ? Number(form.stock) : undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save package'),
  });
  const toggleMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/vouchers/${id}/toggle`),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/vouchers/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormErr(''); setFormOpen(true); };
  const openEdit = (v: VoucherItem) => {
    setEditing(v);
    setForm({
      title: v.title, description: v.description ?? '', provider: v.provider,
      coinCost: String(v.coinCost), faceValue: v.faceValue != null ? String(v.faceValue) : '',
      stock: v.stock != null ? String(v.stock) : '', isActive: v.isActive,
    });
    setFormErr(''); setFormOpen(true);
  };
  const valid = form.title.trim().length >= 2 && form.provider.trim().length >= 2 && Number(form.coinCost) > 0 && !(createMut.isPending || updateMut.isPending);

  const vouchers = (data?.vouchers ?? []).filter((v) =>
    !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <VOverview stats={stats} statsLoading={statsLoading}>
        <div className="glass overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/[0.08]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="field-gold !py-2 pl-10" placeholder="Search packages…" />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button onClick={onTab.bind(null, 'redemptions')} className="btn-ghost !py-2 px-3 text-xs">
                <Layers className="w-3.5 h-3.5" /> Redemptions
              </button>
              {manage && (
                <button onClick={openCreate} className="btn-gold !py-2 px-3.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> New package
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-accent-gold" />
              </div>
              <p className="text-white font-semibold">No packages found</p>
              <p className="mt-1 text-sm text-zinc-500">{search ? 'Try a different search.' : 'Create your first recharge or gift package.'}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {vouchers.map((v, i) => {
                const tone = PROVIDER_TONE[v.provider] ?? { cls: 'from-brand-blue/25 to-brand-blue/5 text-accent-blue', icon: Package };
                const Icon = tone.icon;
                return (
                  <div key={v._id} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-accent-gold/30 transition-all animate-fade-in overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-accent-gold/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between mb-3">
                      <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', tone.cls)}><Icon className="w-5 h-5" /></div>
                      <div className="flex items-center gap-2">
                        {manage ? (
                          <button
                            onClick={() => toggleMut.mutate(v._id)}
                            title={v.isActive ? 'Disable' : 'Enable'}
                            className={cn(
                              'relative w-10 h-6 rounded-full transition-colors border',
                              v.isActive ? 'bg-accent-green/25 border-accent-green/40' : 'bg-white/[0.06] border-white/10'
                            )}
                          >
                            <span className={cn(
                              'absolute top-0.5 w-4 h-4 rounded-full transition-all shadow',
                              v.isActive ? 'left-5 bg-accent-green' : 'left-0.5 bg-zinc-500'
                            )} />
                          </button>
                        ) : (
                          <Badge variant={v.isActive ? 'success' : 'default'}>{v.isActive ? 'Active' : 'Off'}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold text-white text-sm leading-snug">{v.title}</p>
                    {v.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{v.description}</p>}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/[0.08] text-zinc-400 border border-white/10">{v.provider}</span>
                      {v.faceValue != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/25">
                          <IndianRupee className="w-2.5 h-2.5" />{v.faceValue} value
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-accent-gold font-extrabold text-lg tabular-nums">{formatCoins(v.coinCost)} <span className="text-xs font-semibold text-zinc-500">coins</span></p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> Stock</span>
                        <span className="text-zinc-300 font-medium">{v.stock != null ? v.stock : 'Unlimited'}</span>
                      </div>
                      {v.stock != null && (
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent-gold to-accent-blue" style={{ width: `${Math.min(100, Math.max(4, v.stock))}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[10px]">
                        <span className="text-accent-green font-semibold">{v.redemptions.fulfilled} done</span>
                        <span className="text-accent-gold font-semibold">{v.redemptions.pending} pending</span>
                        {v.redemptions.failed > 0 && <span className="text-accent-red font-semibold">{v.redemptions.failed} failed</span>}
                      </div>
                      {manage && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(v)} className="btn-ghost p-1.5 text-accent-blue"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleting(v)} className="btn-ghost p-1.5 text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </VOverview>

      {/* create/edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit package' : 'New package'} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field-gold" placeholder="e.g. Mobile Recharge ₹50" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="field-gold resize-none" placeholder="Short description shown to users…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Provider *</label>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="field-gold">
                <option value="recharge">Recharge</option>
                <option value="voucher">Voucher</option>
                <option value="gift">Gift</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Coin cost *</label>
              <input type="number" min={1} value={form.coinCost} onChange={(e) => setForm({ ...form, coinCost: e.target.value })} className="field-gold" placeholder="500" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Face value (₹)</label>
              <input type="number" min={0} value={form.faceValue} onChange={(e) => setForm({ ...form, faceValue: e.target.value })} className="field-gold" placeholder="50" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Stock</label>
              <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="field-gold" placeholder="leave blank = unlimited" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded accent-[#FFD86F]" />
            <span className="text-sm text-zinc-300">Active (visible to users)</span>
          </label>
          {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
            <button onClick={() => setFormOpen(false)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
            <button onClick={() => (editing ? updateMut.mutate() : createMut.mutate())} disabled={!valid} className="btn-gold !py-2 px-4 text-xs disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editing ? 'Save changes' : 'Create package'}
            </button>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete package">
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><Trash2 className="w-4 h-4 text-accent-red" /></span>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{deleting.title}</p>
                <p className="text-xs text-zinc-500">{formatCoins(deleting.coinCost)} coins · {deleting.redemptions.total} redemptions</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              {deleting.redemptions.total > 0
                ? 'This package has redemptions — deletion will be blocked. Disable it instead.'
                : 'This permanently removes the package. This cannot be undone.'}
            </p>
            {deleteMut.isError && (
              <p className="text-xs text-accent-red">
                {(deleteMut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Delete failed'}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => deleteMut.mutate(deleting._id)} disabled={deleteMut.isPending || deleting.redemptions.total > 0} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Redemptions({ onTab }: { onTab: (t: 'packages' | 'redemptions') => void }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [fulfill, setFulfill] = useState<RedeemItem | null>(null);
  const [code, setCode] = useState('');
  const [failing, setFailing] = useState<RedeemItem | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const qc = useQueryClient();
  const { can } = useAuth();
  const manage = can('vouchers.manage');
  const { data: stats, isLoading: statsLoading } = useVStats();
  const { data, isLoading } = useQuery({
    queryKey: ['voucher-redemptions', status, page],
    queryFn: async (): Promise<RedeemData> =>
      (await api.get('/admin/voucher-redemptions', { params: { status: status || undefined, page, limit: 30 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['voucher-redemptions'] }); qc.invalidateQueries({ queryKey: ['voucher-stats'] }); qc.invalidateQueries({ queryKey: ['vouchers'] }); };
  const mut = useMutation({
    mutationFn: ({ id, status, code }: { id: string; status: string; code?: string }) => api.put(`/admin/voucher-redemptions/${id}`, { status, code }),
    onSuccess: invalidate,
  });

  const items = data?.redemptions ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 30 + 1;
  const end = Math.min(page * 30, total);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(''), 1500); } catch { /* ignore */ }
  };

  return (
    <>
      <VOverview stats={stats} statsLoading={statsLoading}>
        <div className="glass overflow-hidden animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.08]">
            {[{ k: '', l: 'All' }, { k: 'pending', l: 'Pending' }, { k: 'fulfilled', l: 'Fulfilled' }, { k: 'failed', l: 'Failed' }].map((s) => (
              <button
                key={s.k}
                onClick={() => { setStatus(s.k); setPage(1); }}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border',
                  status === s.k
                    ? s.k === 'fulfilled' ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                    : s.k === 'failed' ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                    : s.k === 'pending' ? 'bg-accent-gold/15 text-accent-gold border-accent-gold/30 shadow-glow-goldSoft'
                    : 'bg-white/[0.1] text-white border-white/15'
                    : 'bg-white/[0.04] text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.08]'
                )}
              >
                {s.l} <span className="ml-1 opacity-60">{s.k ? (counts[s.k] ?? 0) : total}</span>
              </button>
            ))}
            <button onClick={() => onTab('packages')} className="ml-auto text-xs text-accent-gold hover:underline flex items-center gap-1">
              Switch to packages <span aria-hidden>→</span>
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
              <p className="text-white font-semibold">No {status || ''} redemptions</p>
              <p className="mt-1 text-sm text-zinc-500">User redemptions appear here for fulfillment.</p>
            </div>
          ) : (
            items.map((r, i) => (
              <div
                key={r._id}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.6fr)_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {r.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.user?.name ?? 'Unknown user'}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{r.user?.email ?? '—'}</p>
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-accent-gold shrink-0" />
                    {r.voucher?.title ?? 'Deleted voucher'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-zinc-500">{r.voucher?.provider} · {formatCoins(r.voucher?.coinCost ?? 0)} coins</span>
                    {r.code && (
                      <button onClick={() => copy(r.code!, r._id)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono text-accent-gold hover:border-accent-gold/40 transition-colors" title="Copy code">
                        {r.code}
                        {copiedId === r._id ? <Check className="w-2.5 h-2.5 text-accent-green" /> : <Copy className="w-2.5 h-2.5 text-zinc-500" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex flex-col md:items-end gap-1">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize', (RD_STATUS[r.status] ?? RD_STATUS.pending).cls)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', (RD_STATUS[r.status] ?? RD_STATUS.pending).dot)} /> {r.status}
                    </span>
                    <p className="text-[11px] text-zinc-600 md:text-right" title={formatDate(r.createdAt)}>{rel(r.createdAt)}</p>
                  </div>
                  {manage && r.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => { setFulfill(r); setCode(''); }} className="btn-ghost !py-1.5 px-3 text-xs text-accent-green">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Fulfill
                      </button>
                      <button onClick={() => setFailing(r)} className="btn-ghost !py-1.5 px-3 text-xs text-accent-red">
                        <XCircle className="w-3.5 h-3.5" /> Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {data && data.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
              <p className="text-xs text-zinc-500">
                Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">Prev</button>
                <span className="text-xs text-zinc-500 px-2">Page {page} / {data.pages}</span>
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </VOverview>

      {/* fulfill modal */}
      <Modal open={!!fulfill} onClose={() => setFulfill(null)} title="Fulfill redemption">
        {fulfill && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Ticket className="w-4 h-4 text-accent-gold" /></span>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{fulfill.voucher?.title ?? 'Voucher'}</p>
                <p className="text-xs text-zinc-500">{fulfill.user?.name} · {formatCoins(fulfill.voucher?.coinCost ?? 0)} coins</p>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Voucher / recharge code *</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="field-gold font-mono" placeholder="e.g. RC-9F2K-88QX" />
            </div>
            {mut.isError && (
              <p className="text-xs text-accent-red">{(mut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed'}</p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setFulfill(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button
                onClick={() => { mut.mutate({ id: fulfill._id, status: 'fulfilled', code: code.trim() }); setFulfill(null); }}
                disabled={code.trim().length < 2 || mut.isPending}
                className="btn-gold !py-2 px-4 text-xs disabled:opacity-50"
              >
                {mut.isPending ? 'Saving…' : 'Mark fulfilled'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* fail modal */}
      <Modal open={!!failing} onClose={() => setFailing(null)} title="Fail redemption">
        {failing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><XCircle className="w-4 h-4 text-accent-red" /></span>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{failing.voucher?.title ?? 'Voucher'}</p>
                <p className="text-xs text-zinc-500">{failing.user?.name}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400">Mark this redemption as failed. No code is issued.</p>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setFailing(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button
                onClick={() => { mut.mutate({ id: failing._id, status: 'failed' }); setFailing(null); }}
                disabled={mut.isPending}
                className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50"
              >
                {mut.isPending ? 'Saving…' : 'Mark failed'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
