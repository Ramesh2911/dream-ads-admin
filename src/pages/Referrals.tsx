import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users2, UserPlus, UserCheck, Coins, Trophy, Plus, X, ArrowRight,
  ShieldCheck, CalendarDays, Settings2, Inbox,
} from 'lucide-react';
import api from '../lib/api';
import { Badge } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface Stats {
  totals: {
    referredUsers: number; referrers: number; dailyJoins: number;
    rewardsPaid: number; rewardsVideo: number; rewardsSocial: number; commission: number;
  };
  days: { date: string; joins: number; coins: number; rewards: number }[];
  byLevel: { level: number; users: number; coins: number }[];
  topReferrers: { id: string; name: string; referralCode: string; count: number; coins: number }[];
  recentJoins: { _id: string; name: string; status: string; createdAt: string; referredBy?: { name: string; referralCode: string } | null }[];
}
interface Cfg {
  _id?: string; maxLevels: number;
  levelRewards: { level: number; coins: number; wallet: 'video' | 'social' }[];
  dailyJoinLimit: number; commissionEnabled: boolean; commissionPercent: number;
}
type Level = { level: number; coins: number; wallet: 'video' | 'social' };

const LEVEL_TONES = [
  'from-accent-gold/30 to-accent-gold/10 text-accent-gold border-accent-gold/30',
  'from-brand-blue/30 to-brand-blue/10 text-accent-blue border-brand-blue/30',
  'from-accent-violet/30 to-accent-violet/10 text-accent-violet border-accent-violet/30',
  'from-accent-green/30 to-accent-green/10 text-accent-green border-accent-green/30',
];
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

const norm = (arr: Level[]) => arr.map((l) => `${l.level}:${l.coins}:${l.wallet}`).join('|');

export default function Referrals() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [draft, setDraft] = useState<Level[] | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async (): Promise<Stats> => (await api.get('/admin/referral-stats')).data.data,
  });

  const canConfig = can('referral.config');
  const { data: cfg } = useQuery({
    queryKey: ['referral-config'],
    queryFn: async (): Promise<Cfg> => (await api.get('/admin/referral-config')).data.data,
    enabled: canConfig,
  });

  const saveMut = useMutation({
    mutationFn: (levels: Level[]) =>
      api.put('/admin/referral-config', {
        ...cfg,
        maxLevels: cfg?.maxLevels ?? 10,
        dailyJoinLimit: cfg?.dailyJoinLimit ?? 100,
        commissionEnabled: cfg?.commissionEnabled ?? false,
        commissionPercent: cfg?.commissionPercent ?? 0,
        levelRewards: levels.map((l, i) => ({ level: i + 1, coins: l.coins, wallet: l.wallet })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral-config'] });
      qc.invalidateQueries({ queryKey: ['referral-stats'] });
      setDraft(null);
    },
  });

  const serverLevels: Level[] = (cfg?.levelRewards ?? []).map((l) => ({ level: l.level, coins: l.coins, wallet: l.wallet }));
  const shown = draft ?? serverLevels;
  const dirty = draft !== null && norm(draft) !== norm(serverLevels);
  const maxLevels = cfg?.maxLevels ?? 10;

  const paidByLevel = new Map((stats?.byLevel ?? []).map((p) => [p.level, p]));

  const addLevel = () => {
    if (shown.length >= maxLevels) return;
    const next = shown.map((l) => ({ ...l }));
    next.push({ level: next.length + 1, coins: 10, wallet: 'social' });
    setDraft(next);
  };
  const removeLevel = (i: number) => {
    const next = shown.filter((_, j) => j !== i).map((l, j) => ({ ...l, level: j + 1 }));
    setDraft(next);
  };
  const patchLevel = (i: number, patch: Partial<Level>) => {
    const next = shown.map((l) => ({ ...l }));
    next[i] = { ...next[i], ...patch };
    setDraft(next);
  };

  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const statsChips = [
    { label: 'Active referrers', value: stats ? stats.totals.referrers : null, icon: Users2, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25' },
    { label: 'Referred users', value: stats ? stats.totals.referredUsers : null, icon: UserPlus, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25' },
    { label: 'Joins today', value: stats ? stats.totals.dailyJoins : null, icon: UserCheck, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'Rewards paid', value: stats ? formatCoins(stats.totals.rewardsPaid) : null, icon: Coins, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
  ];

  const rankCls = (i: number) =>
    i === 0 ? 'bg-gradient-to-br from-accent-gold to-accent-goldDark text-base-950'
      : i === 1 ? 'bg-zinc-200 text-base-950'
      : i === 2 ? 'bg-accent-goldDark/80 text-base-950'
      : 'bg-white/[0.08] text-zinc-300';

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Trophy className="w-5 h-5 text-accent-gold" /></span>
            Referral Network
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Live growth, rewards and level configuration</p>
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
            </div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Coins className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Referral momentum</h3>
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-gold" /> coins</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent-blue" /> joins</span>
            </span>
          </div>
          {isLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="refCoins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD86F" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F7A83E" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis yAxisId="coins" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis yAxisId="joins" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} width={30} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar yAxisId="coins" dataKey="coins" name="Coins paid" fill="url(#refCoins)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line yAxisId="joins" dataKey="joins" name="Joins" type="monotone" stroke="#4F8CFF" strokeWidth={2.5} dot={{ r: 3, fill: '#4F8CFF', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Settings2 className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Rewards by level</h3>
          </div>
          {isLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (stats?.byLevel.length ?? 0) === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-3 text-center">
              <span className="p-4 rounded-full bg-accent-gold/10 border border-accent-gold/25"><Coins className="w-7 h-7 text-accent-gold" /></span>
              <p className="text-sm font-semibold text-white">No rewards paid yet</p>
              <p className="text-xs text-zinc-500 px-6">Level payouts will appear here after first referred signups.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.byLevel} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis type="category" dataKey="level" tickFormatter={(v: number) => `L${v}`} tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={34} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v: number | string, name: string, p: { payload?: { users?: number } }) => [
                    `${formatCoins(Number(v))} coins · ${p?.payload?.users ?? 0} users`,
                    name,
                  ]}
                />
                <Bar dataKey="coins" name="Paid" fill="#FFD86F" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* leaderboard + recent joins */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Trophy className="w-4 h-4 text-accent-gold" /></span>
            <h3 className="font-semibold text-white">Top referrers</h3>
          </div>
          {isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!isLoading && (stats?.topReferrers.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500 py-6 text-center">No referrals yet — leaderboard is waiting.</p>
          )}
          <div className="space-y-2.5">
            {(stats?.topReferrers ?? []).map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-accent-gold/30 transition-colors">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0', rankCls(i))}>{i + 1}</span>
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {t.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{t.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{t.referralCode}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-accent-gold tabular-nums">{t.count}</p>
                  <p className="text-[10px] text-zinc-600">{formatCoins(t.coins)} coins</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-accent-green/10 border border-accent-green/20"><Inbox className="w-4 h-4 text-accent-green" /></span>
              <h3 className="font-semibold text-white">Recent referral joins</h3>
            </div>
            <span className="text-[11px] text-zinc-500 hidden sm:block">Newest first</span>
          </div>
          {isLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!isLoading && (stats?.recentJoins.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500 py-6 text-center">No referred signups yet.</p>
          )}
          <div className="space-y-2.5">
            {(stats?.recentJoins ?? []).map((j) => (
              <div key={j._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-green/80 to-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {j.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{j.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">via {j.referredBy ? `${j.referredBy.name} · ${j.referredBy.referralCode}` : 'unknown'}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 hidden sm:block" />
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-zinc-400">{rel(j.createdAt)}</p>
                  <p className={cn('text-[10px] font-medium', j.status === 'active' ? 'text-accent-green' : 'text-zinc-600')}>{j.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* configuration */}
      {canConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-accent-violet/10 border border-accent-violet/20"><Settings2 className="w-4 h-4 text-accent-violet" /></span>
                <h3 className="font-semibold text-white">Level rewards</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-[10px] text-zinc-400">
                  Max {maxLevels} levels
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-[10px] text-zinc-400">
                  <CalendarDays className="w-3 h-3 inline -mt-0.5 mr-1 text-accent-blue" />
                  {cfg?.dailyJoinLimit ?? '—'} joins/day
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-4">Coins paid to the referrer when a referred user joins, per network level.</p>

            {cfg === undefined ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : shown.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">No level rewards configured. Add levels below.</p>
            ) : (
              <div className="space-y-2">
                {shown.map((r, i) => {
                  const paid = paidByLevel.get(i + 1);
                  return (
                    <div key={i} className="group flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-accent-gold/30 transition-colors">
                      <span className={cn('w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-extrabold shrink-0 bg-gradient-to-br', LEVEL_TONES[i % LEVEL_TONES.length])}>
                        L{i + 1}
                      </span>
                      <div className="min-w-[140px] flex-1">
                        <p className="text-sm font-semibold text-white">Level {i + 1} reward</p>
                        <p className="text-[11px] text-zinc-500">
                          {paid ? (
                            <>Paid so far: <span className="text-accent-gold font-semibold">{formatCoins(paid.coins)}</span> coins · {paid.users} users</>
                          ) : 'Not paid yet'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} value={r.coins}
                          onChange={(e) => patchLevel(i, { coins: Math.max(0, Number(e.target.value)) })}
                          className="field-gold !py-2 w-24 !rounded-lg"
                        />
                        <select
                          value={r.wallet}
                          onChange={(e) => patchLevel(i, { wallet: e.target.value as 'video' | 'social' })}
                          className="glass-input w-36 !py-2 !rounded-lg"
                        >
                          <option value="social">Social wallet</option>
                          <option value="video">Video wallet</option>
                        </select>
                        <button
                          onClick={() => removeLevel(i)}
                          title="Remove level"
                          className="p-2 rounded-lg text-zinc-600 hover:text-accent-red hover:bg-accent-red/10 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/[0.06]">
              {dirty ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-gold/15 border border-accent-gold/30 text-[11px] font-semibold text-accent-gold">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" /> Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-green/15 border border-accent-green/25 text-[11px] font-semibold text-accent-green">
                  ✓ All changes saved
                </span>
              )}
              <div className="flex gap-2.5">
                <button
                  onClick={addLevel}
                  disabled={shown.length >= maxLevels}
                  className="btn-ghost border border-white/[0.12] disabled:opacity-40 hover:border-accent-blue/40 hover:text-accent-blue"
                >
                  <Plus className="w-4 h-4" /> Add level
                </button>
                <button
                  onClick={() => saveMut.mutate(shown)}
                  disabled={!dirty || saveMut.isPending}
                  className="btn-gold shine disabled:opacity-40 disabled:pointer-events-none"
                >
                  {saveMut.isPending ? 'Saving…' : 'Save configuration'}
                </button>
              </div>
            </div>
            {saveMut.isError && (
              <p className="mt-3 text-xs text-accent-red">Save failed — check the required fields (all config fields are required by the API).</p>
            )}
          </div>

          {/* compliance (dynamic from config) */}
          <div className="glass p-5 sm:p-6 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(248,113,113,0.08),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><ShieldCheck className="w-4 h-4 text-accent-red" /></span>
                <h3 className="font-semibold text-white">Compliance</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-zinc-300">Referral commission</p>
                    <Badge variant={cfg?.commissionEnabled ? 'danger' : 'warning'}>
                      {cfg?.commissionEnabled ? `ON · ${cfg.commissionPercent}%` : 'Off (default)'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                    Lifetime withdrawal commission is disabled by default and requires written business rules plus legal review before activation.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-zinc-300">Commission paid to date</p>
                    <p className="text-sm font-bold text-white tabular-nums">{stats ? formatCoins(stats.totals.commission) : '—'}</p>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2">Ledger truth: referral_commission entries across all wallets.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-zinc-300">Reward split</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-zinc-400">Video <span className="text-accent-gold font-bold">{stats ? formatCoins(stats.totals.rewardsVideo) : '—'}</span></span>
                    <span className="text-xs text-zinc-400">Social <span className="text-accent-blue font-bold">{stats ? formatCoins(stats.totals.rewardsSocial) : '—'}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
