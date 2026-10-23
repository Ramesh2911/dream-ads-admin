import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, Users, Timer, Wallet, ArrowDown, Trophy, Crown, Play, Eye,
  Heart, Medal, Link2,
} from 'lucide-react';
import api from '../lib/api';
import { cn, formatCoins, formatDate } from '../lib/utils';

interface Totals {
  users: number; activeUsers: number; suspendedUsers: number; bannedUsers: number;
  kycNone: number; kycPending: number; kycVerified: number; kycRejected: number;
  referred: number;
  coinsIn: number; coinsInVideo: number; coinsInSocial: number; coinsOut: number; outstanding: number;
  watchMinutes: number; views: number; rewardedViews: number;
  depositsIn: number; depositsCount: number; payoutsOut: number; payoutsCount: number;
}
interface DayPoint { date: string; signups: number; coinsIn: number; coinsOut: number; views: number }
interface Earner { userId: string | null; name: string; email: string; total: number; video: number; social: number }
interface TopVideo { _id: string; title: string; thumbnail: string; views: number; likes: number; rewardCoins: number; status: string }
interface ReportsData { totals: Totals; days: DayPoint[]; topEarners: Earner[]; topVideos: TopVideo[] }
interface RefData { topReferrers: { id: string; name: string; referralCode: string; count: number; coins: number }[] }

const METRICS = [
  { k: 'signups', l: 'Signups', color: '#FFD86F' },
  { k: 'coinsIn', l: 'Coins in', color: '#34D399' },
  { k: 'coinsOut', l: 'Coins out', color: '#F87171' },
  { k: 'views', l: 'Views', color: '#4F8CFF' },
] as const;
type MetricKey = (typeof METRICS)[number]['k'];

const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;
const RANK_STYLES = [
  { ring: 'from-accent-gold to-accent-goldDark', badge: 'bg-accent-gold text-base-950', glow: 'shadow-glow-goldSoft' },
  { ring: 'from-zinc-300 to-zinc-500', badge: 'bg-zinc-300 text-base-950', glow: '' },
  { ring: 'from-accent-goldDark to-[#B45309]', badge: 'bg-accent-goldDark text-base-950', glow: '' },
];

export default function Reports() {
  const [metric, setMetric] = useState<MetricKey>('signups');

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async (): Promise<ReportsData> => (await api.get('/admin/reports')).data.data,
  });
  const { data: refData } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async (): Promise<RefData> => (await api.get('/admin/referral-stats')).data.data,
  });

  const t = data?.totals;
  const chips = [
    { label: 'Total users', value: t ? t.users : null, icon: Users, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: t ? `${t.activeUsers} active · ${t.suspendedUsers} susp · ${t.bannedUsers} banned` : '' },
    { label: 'Watch time', value: t ? `${formatCoins(t.watchMinutes)} min` : null, icon: Timer, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25', sub: t ? `${t.views} views · ${t.rewardedViews} rewarded` : '' },
    { label: 'Coins in circulation', value: t ? formatCoins(t.outstanding) : null, icon: Wallet, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: t ? `in ${formatCoins(t.coinsIn)} · out ${formatCoins(t.coinsOut)}` : '' },
    { label: 'Deposits in', value: t ? formatCoins(t.depositsIn) : null, icon: ArrowDown, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: t ? `${t.depositsCount} done · payouts ${formatCoins(t.payoutsOut)} (${t.payoutsCount})` : '' },
  ];

  const m = METRICS.find((x) => x.k === metric)!;
  const chartData = (data?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const kycTotal = t ? t.kycNone + t.kycPending + t.kycVerified + t.kycRejected : 0;
  const kycRows = t
    ? [
        { l: 'Verified', v: t.kycVerified, tone: 'bg-accent-green', text: 'text-accent-green' },
        { l: 'Pending', v: t.kycPending, tone: 'bg-accent-gold', text: 'text-accent-gold' },
        { l: 'Rejected', v: t.kycRejected, tone: 'bg-accent-red', text: 'text-accent-red' },
        { l: 'Not started', v: t.kycNone, tone: 'bg-zinc-500', text: 'text-zinc-400' },
      ]
    : [];
  const maxKyc = Math.max(1, ...kycRows.map((r) => r.v));

  const statusRows = t
    ? [
        { l: 'Active', v: t.activeUsers, tone: 'bg-accent-green', text: 'text-accent-green' },
        { l: 'Suspended', v: t.suspendedUsers, tone: 'bg-accent-gold', text: 'text-accent-gold' },
        { l: 'Banned', v: t.bannedUsers, tone: 'bg-accent-red', text: 'text-accent-red' },
      ]
    : [];
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.v));
  const organic = t ? Math.max(0, t.users - t.referred) : 0;
  const referredPct = t && t.users > 0 ? Math.round((t.referred / t.users) * 100) : 0;

  const earners = data?.topEarners ?? [];
  const podium = earners.slice(0, 3);
  const rest = earners.slice(3);
  const maxEarn = Math.max(1, ...earners.map((e) => e.total));
  const videos = data?.topVideos ?? [];
  const maxViews = Math.max(1, ...videos.map((v) => v.views));
  const referrers = refData?.topReferrers ?? [];

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><BarChart3 className="w-5 h-5 text-accent-gold" /></span>
            Reports & Leaderboard
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Platform analytics, economy health and top performers</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {/* stats chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {chips.map((s, i) => (
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

      {/* platform pulse + kyc funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><BarChart3 className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Platform pulse · 14 days</h3>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] self-start">
              {METRICS.map((x) => (
                <button
                  key={x.k}
                  onClick={() => setMetric(x.k)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    metric === x.k ? 'text-base-950 shadow-glow-goldSoft' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                  style={metric === x.k ? { background: `linear-gradient(to right, ${x.color}, ${x.color}CC)` } : undefined}
                >
                  {x.l}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="h-[260px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: m.color, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  name={m.l}
                  stroke={m.color}
                  strokeWidth={2.5}
                  fill="url(#pulseFill)"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-accent-green/10 border border-accent-green/20"><Medal className="w-4 h-4 text-accent-green" /></span>
              <h3 className="font-semibold text-white">KYC funnel</h3>
            </div>
            {t && kycTotal > 0 && (
              <span className="text-xs font-bold text-accent-green tabular-nums">{Math.round((t.kycVerified / kycTotal) * 100)}% verified</span>
            )}
          </div>
          {isLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          <div className="space-y-3">
            {kycRows.map((r) => (
              <div key={r.l}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium">{r.l}</span>
                  <span className={cn('font-bold tabular-nums', r.text)}>{r.v} <span className="text-zinc-600 font-medium">({kycTotal ? Math.round((r.v / kycTotal) * 100) : 0}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-700', r.tone)} style={{ width: `${Math.max(3, Math.round((r.v / maxKyc) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Referred</p>
              <p className="text-lg font-extrabold text-accent-violet tabular-nums">{t?.referred ?? '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Organic</p>
              <p className="text-lg font-extrabold text-accent-blue tabular-nums">{t ? organic : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* leaderboard */}
      <div className="glass overflow-hidden mb-6 animate-fade-in">
        <div className="flex items-center gap-2.5 p-4 border-b border-white/[0.08]">
          <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Trophy className="w-4 h-4 text-accent-gold" /></span>
          <h3 className="font-semibold text-white">Top earners</h3>
          <span className="text-[11px] text-zinc-500">lifetime coins received · top {earners.length}</span>
        </div>

        {isLoading && <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}

        {!isLoading && earners.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Trophy className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No earners yet</p>
            <p className="mt-1 text-sm text-zinc-500">Coins credited through rewards will rank users here.</p>
          </div>
        )}

        {!isLoading && earners.length > 0 && (
          <>
            {/* podium */}
            <div className="grid sm:grid-cols-3 gap-4 p-4">
              {podium.map((e, i) => {
                const r = RANK_STYLES[i];
                return (
                  <div key={e.userId ?? i} style={{ animationDelay: `${i * 80}ms` }} className={cn('relative p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] animate-slide-up text-center overflow-hidden', i === 0 && 'border-accent-gold/40', r.glow)}>
                    <div className={cn('absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 rounded-full blur-2xl', i === 0 ? 'bg-accent-gold/20' : i === 1 ? 'bg-zinc-400/15' : 'bg-accent-goldDark/15')} />
                    <div className="relative">
                      <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black mb-2', r.badge)}>#{i + 1}</span>
                      <div className={cn('mx-auto w-12 h-12 rounded-full bg-gradient-to-br p-0.5 mb-2', r.ring)}>
                        <div className="w-full h-full rounded-full bg-base-950 flex items-center justify-center text-white font-bold">
                          {e.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{e.name}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{e.email}</p>
                      <p className="mt-2 text-xl font-extrabold text-accent-gold tabular-nums">{formatCoins(e.total)}</p>
                      <div className="flex justify-center gap-2 mt-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-brand-blue/10 text-accent-blue border border-brand-blue/20">V {formatCoins(e.video)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-accent-violet/10 text-accent-violet border border-accent-violet/20">S {formatCoins(e.social)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* rows 4+ */}
            {rest.length > 0 && (
              <div className="border-t border-white/[0.08]">
                {rest.map((e, i) => (
                  <div key={e.userId ?? i} className="group grid grid-cols-[auto_minmax(0,1.6fr)_auto] gap-3 md:gap-4 items-center px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative">
                    <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                    <span className="w-6 text-center text-xs font-black text-zinc-600 tabular-nums">#{i + 4}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {e.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{e.name}</p>
                        <div className="h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden max-w-xs">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent-gold/70 to-accent-blue/60" style={{ width: `${Math.max(4, Math.round((e.total / maxEarn) * 100))}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-accent-gold tabular-nums">{formatCoins(e.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* videos + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* top videos */}
        <div className="glass overflow-hidden animate-slide-up">
          <div className="flex items-center gap-2.5 p-4 border-b border-white/[0.08]">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Play className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Top videos</h3>
            <span className="text-[11px] text-zinc-500">by views</span>
          </div>
          {isLoading && <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!isLoading && videos.length === 0 && <p className="p-8 text-center text-sm text-zinc-500">No videos yet.</p>}
          {videos.map((v, i) => (
            <div key={v._id} className="group flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-blue/70 to-accent-violet/50 transition-all" />
              <span className="text-[10px] font-black text-zinc-600 w-4 shrink-0 tabular-nums">{i + 1}</span>
              <img src={v.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{v.title}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{v.likes}</span>
                  <span className="text-accent-gold font-bold">{formatCoins(v.rewardCoins)}</span>
                </div>
              </div>
              <div className="hidden sm:block w-24 shrink-0">
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-violet" style={{ width: `${Math.max(4, Math.round((v.views / maxViews) * 100))}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* distribution */}
        <div className="glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="p-2 rounded-lg bg-accent-violet/10 border border-accent-violet/20"><Users className="w-4 h-4 text-accent-violet" /></span>
            <h3 className="font-semibold text-white">User distribution</h3>
          </div>

          {isLoading && <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}

          {!isLoading && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">By status</p>
                {statusRows.map((r) => (
                  <div key={r.l}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 font-medium">{r.l}</span>
                      <span className={cn('font-bold tabular-nums', r.text)}>{r.v}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={cn('h-full rounded-full', r.tone)} style={{ width: `${Math.max(3, Math.round((r.v / maxStatus) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Acquisition</span>
                  <span className="text-accent-violet font-bold">{referredPct}% via referral</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-accent-violet to-accent-blue transition-all duration-700" style={{ width: `${referredPct}%` }} />
                  <div className="h-full bg-gradient-to-r from-brand-blue/60 to-brand-blue/30 flex-1" />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="flex items-center gap-1.5 text-accent-violet font-semibold"><Link2 className="w-3 h-3" /> Referred {t?.referred ?? 0}</span>
                  <span className="text-accent-blue font-semibold">Organic {organic}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Coins in</p>
                  <p className="text-sm font-extrabold text-accent-green tabular-nums mt-0.5">{formatCoins(t?.coinsIn ?? 0)}</p>
                  <p className="text-[9px] text-zinc-600">V {formatCoins(t?.coinsInVideo ?? 0)} · S {formatCoins(t?.coinsInSocial ?? 0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Coins out</p>
                  <p className="text-sm font-extrabold text-accent-red tabular-nums mt-0.5">{formatCoins(t?.coinsOut ?? 0)}</p>
                  <p className="text-[9px] text-zinc-600">rewards · purchases</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Outstanding</p>
                  <p className="text-sm font-extrabold text-accent-gold tabular-nums mt-0.5">{formatCoins(t?.outstanding ?? 0)}</p>
                  <p className="text-[9px] text-zinc-600">circulating</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* top referrers */}
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex items-center gap-2.5 p-4 border-b border-white/[0.08]">
          <span className="p-2 rounded-lg bg-accent-violet/10 border border-accent-violet/20"><Crown className="w-4 h-4 text-accent-violet" /></span>
          <h3 className="font-semibold text-white">Top referrers</h3>
          <span className="text-[11px] text-zinc-500">most invited users</span>
        </div>
        {referrers.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">No referrals yet.</p>
        ) : (
          referrers.slice(0, 5).map((r, i) => (
            <div key={r.id} className="group flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-violet/70 to-accent-gold/50 transition-all" />
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                i === 0 ? 'bg-accent-gold text-base-950' : i === 1 ? 'bg-zinc-300 text-base-950' : i === 2 ? 'bg-accent-goldDark text-base-950' : 'bg-white/[0.06] text-zinc-500'
              )}>
                {i < 3 ? <Medal className="w-3 h-3" /> : `#${i + 1}`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{r.name}</p>
                <p className="text-[11px] text-zinc-600 font-mono truncate">{r.referralCode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-accent-violet tabular-nums">{r.count} invites</p>
                <p className="text-[10px] text-accent-gold">{formatCoins(r.coins)} coins</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
