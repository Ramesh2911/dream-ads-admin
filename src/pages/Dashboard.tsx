import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  Users, UserPlus, ListChecks, Banknote, TrendingUp, Coins, Inbox,
  ArrowRight, History, Rocket, CalendarDays, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Badge } from '../components/ui';
import { formatCoins, formatDateTime } from '../lib/utils';

interface Dash {
  userCount: number;
  newUsersToday: number;
  pendingTasks: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  totalVideoEarned: number;
  pendingLeads?: number;
  signups7d?: { date: string; count: number }[];
}
interface Log { _id: string; actorEmail: string; action: string; entity: string; createdAt: string }
interface Lead { _id: string; name: string; email: string; status: string; createdAt: string }

const QUEUE_COLORS = { tasks: '#4F8CFF', withdrawals: '#FFD86F', deposits: '#34D399', leads: '#7C5CFF' };
const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Kpi({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'gold' | 'blue' | 'green' | 'violet' | 'red';
}) {
  const tones = {
    gold: 'from-accent-gold/25 to-accent-gold/5 text-accent-gold',
    blue: 'from-brand-blue/30 to-brand-blue/5 text-accent-blue',
    green: 'from-accent-green/25 to-accent-green/5 text-accent-green',
    violet: 'from-accent-violet/25 to-accent-violet/5 text-accent-violet',
    red: 'from-accent-red/25 to-accent-red/5 text-accent-red',
  };
  const orbs = {
    gold: 'bg-accent-gold/10', blue: 'bg-brand-blue/15', green: 'bg-accent-green/10',
    violet: 'bg-accent-violet/10', red: 'bg-accent-red/10',
  };
  return (
    <div className="group relative overflow-hidden glass glass-hover p-5 animate-slide-up">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className={`absolute -right-6 -bottom-8 w-24 h-24 rounded-full blur-2xl ${orbs[tone]} opacity-70`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-semibold">{label}</p>
          <p className="mt-2 text-[26px] leading-none font-extrabold text-white tabular-nums">{value}</p>
          <p className="mt-2 text-[11px] text-zinc-500">{sub}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint }: {
  icon: React.ComponentType<{ className?: string }>; title: string; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
          <Icon className="w-4 h-4 text-accent-gold" />
        </span>
        <h3 className="font-semibold text-white truncate">{title}</h3>
      </div>
      {hint && <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:block">{hint}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { admin, can } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<Dash> => (await api.get('/admin/dashboard')).data.data,
  });

  const recent = useQuery({
    queryKey: ['audit-recent'],
    queryFn: async (): Promise<{ logs: Log[] }> => (await api.get('/admin/audit-logs?limit=6')).data.data,
  });

  const leads = useQuery({
    queryKey: ['leads', 'dashboard'],
    queryFn: async (): Promise<{ items: Lead[]; total: number }> => (await api.get('/inquiries', { params: { limit: 5 } })).data.data,
    enabled: can('leads.read'),
  });

  const d = data;
  const dash = (n?: number) => (isLoading ? '—' : formatCoins(n ?? 0));

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const chartData = (d?.signups7d ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const queue = [
    { name: 'Task reviews', value: d?.pendingTasks ?? 0, color: QUEUE_COLORS.tasks, href: '/tasks' },
    { name: 'Withdrawals', value: d?.pendingWithdrawals ?? 0, color: QUEUE_COLORS.withdrawals, href: '/finance' },
    { name: 'Deposits', value: d?.pendingDeposits ?? 0, color: QUEUE_COLORS.deposits, href: '/finance' },
    { name: 'New leads', value: d?.pendingLeads ?? 0, color: QUEUE_COLORS.leads, href: '/leads' },
  ].filter((q) => can(q.href === '/tasks' ? 'tasks.verify' : q.href === '/leads' ? 'leads.read' : 'finance.read'));
  const queueTotal = queue.reduce((s, q) => s + q.value, 0);

  const overview = [
    { label: 'Users awaiting task review', value: d?.pendingTasks ?? 0, href: '/tasks', icon: ListChecks, color: 'text-accent-blue bg-accent-blue/10' },
    { label: 'Withdrawal requests to process', value: d?.pendingWithdrawals ?? 0, href: '/finance', icon: Banknote, color: 'text-accent-gold bg-accent-gold/10' },
    { label: 'Deposits awaiting confirmation', value: d?.pendingDeposits ?? 0, href: '/finance', icon: TrendingUp, color: 'text-accent-green bg-accent-green/10' },
    ...(can('leads.read') ? [{ label: 'Fresh leads to contact', value: d?.pendingLeads ?? 0, href: '/leads', icon: Inbox, color: 'text-accent-violet bg-accent-violet/10' }] : []),
  ].filter((o) => can(o.href === '/tasks' ? 'tasks.verify' : o.href === '/leads' ? 'leads.read' : 'finance.read'));

  const leadBadge = (s: string): 'info' | 'success' | 'warning' | 'danger' | 'default' =>
    s === 'won' ? 'success' : s === 'new' ? 'info' : s === 'lost' ? 'danger' : s === 'contacted' ? 'warning' : 'default';

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-brand-navyLight/50 backdrop-blur-xl shadow-glow-blueSoft mb-6 animate-slide-up">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(46,107,255,0.28),transparent_55%)]" />
        <div className="absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-accent-gold/10 blur-[80px]" />
        <div className="absolute inset-0 dots-grid opacity-25" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-gold/60 via-accent-blue/40 to-transparent" />

        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
              <Rocket className="w-3.5 h-3.5" /> {greet}, {admin?.name?.split(' ')[0]}
            </p>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Here's what's happening <span className="text-gradient-gold">across Dream Ads</span> today
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" /> All systems operational
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] text-zinc-400">
                <CalendarDays className="w-3.5 h-3.5 text-accent-gold/70" />
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[11px] text-zinc-400">
                Signed in as <span className="text-accent-gold font-semibold ml-1">{admin?.role}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            {can('tasks.verify') && (
              <Link to="/tasks" className="btn-gold shine !py-2.5">Verify tasks <ArrowRight className="w-4 h-4" /></Link>
            )}
            {can('leads.read') && (
              <Link to="/leads" className="btn-ghost !border !border-white/[0.12] bg-white/[0.05] hover:border-accent-gold/40 hover:text-accent-gold !py-2.5">
                Review leads <Inbox className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ============ KPI GRID ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Kpi label="Total Users" value={dash(d?.userCount)} sub="registered accounts" icon={Users} tone="violet" />
        <Kpi label="New Today" value={dash(d?.newUsersToday)} sub="joined since midnight" icon={UserPlus} tone="green" />
        <Kpi label="Pending Tasks" value={dash(d?.pendingTasks)} sub="awaiting your review" icon={ListChecks} tone="blue" />
        <Kpi label="Withdrawals" value={dash(d?.pendingWithdrawals)} sub="requests to process" icon={Banknote} tone="gold" />
        <Kpi label="Deposits" value={dash(d?.pendingDeposits)} sub="awaiting confirmation" icon={TrendingUp} tone="green" />
        <Kpi label="Coins Earned" value={dash(d?.totalVideoEarned)} sub="lifetime distributed" icon={Coins} tone="gold" />
      </div>

      {/* ============ CHARTS ROW ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* signup trend */}
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <SectionTitle icon={TrendingUp} title="User growth" hint="Last 7 days · new signups" />
          {isLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD86F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2E6BFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: 'rgba(255,216,111,0.35)', strokeWidth: 1.5 }}
                  formatter={(v: number | string) => [`${v} signups`, 'New users']}
                  labelFormatter={(l) => `Day: ${l}`}
                />
                <Area type="monotone" dataKey="count" stroke="#FFD86F" strokeWidth={2.5} fill="url(#signupFill)" dot={{ r: 3, fill: '#FFD86F', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#FFD86F' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* action queue donut */}
        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <SectionTitle icon={Inbox} title="Action queue" hint="Pending work" />
          {isLoading ? (
            <div className="h-[250px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : queueTotal === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-3 text-center">
              <span className="p-4 rounded-full bg-accent-green/10 border border-accent-green/25">
                <CheckCircle2 className="w-8 h-8 text-accent-green" />
              </span>
              <p className="text-sm font-semibold text-white">All clear!</p>
              <p className="text-xs text-zinc-500 px-6">Nothing is waiting in any queue right now.</p>
            </div>
          ) : (
            <>
              <div className="relative h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={queue} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={80} paddingAngle={5} stroke="transparent">
                      {queue.map((q) => <Cell key={q.name} fill={q.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-extrabold text-white tabular-nums leading-none">{queueTotal}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">pending</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {queue.map((q) => (
                  <Link key={q.name} to={q.href} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: q.color }} />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 flex-1 truncate">{q.name}</span>
                    <span className="text-xs font-bold text-white tabular-nums">{q.value}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============ BOTTOM ROW ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* action center */}
        <div className="glass p-5 sm:p-6 animate-slide-up">
          <SectionTitle icon={Rocket} title="Action center" hint="Needs attention" />
          <div className="space-y-2.5">
            {overview.map((row) => (
              <Link key={row.label} to={row.href} className="group flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-accent-gold/40 hover:bg-accent-gold/[0.05] transition-all">
                <span className={`p-2.5 rounded-lg shrink-0 ${row.color}`}>
                  <row.icon className="w-4 h-4" />
                </span>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-200 flex-1 min-w-0 truncate">{row.label}</span>
                <span className="text-lg font-bold text-white tabular-nums">{isLoading ? '—' : row.value}</span>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-accent-gold group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
            {overview.length === 0 && !isLoading && (
              <p className="text-sm text-zinc-500 py-6 text-center">No pending actions for your role.</p>
            )}
          </div>
        </div>

        {/* audit timeline */}
        <div className="glass p-5 sm:p-6 animate-slide-up">
          <SectionTitle icon={History} title="Recent admin actions" hint="Audit trail" />
          {recent.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!recent.isLoading && (recent.data?.logs?.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500 py-6 text-center">No recent activity.</p>
          )}
          <div className="space-y-4">
            {(recent.data?.logs ?? []).map((log, i, arr) => (
              <div key={log._id} className="relative flex gap-3.5">
                {i < arr.length - 1 && (
                  <span className="absolute left-[6.5px] top-6 bottom-[-20px] w-px bg-gradient-to-b from-accent-gold/40 to-transparent" />
                )}
                <span className={`relative z-10 mt-1 shrink-0 w-3.5 h-3.5 rounded-full ring-2 ring-brand-navy ${i === 0 ? 'bg-accent-gold shadow-glow-gold' : 'bg-brand-blue/70'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-white font-medium truncate">{log.action}</p>
                    <span className="text-[11px] text-zinc-600 shrink-0">{ago(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{log.entity} · {log.actorEmail}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 hidden sm:block">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* fresh leads */}
        {can('leads.read') && (
          <div className="glass p-5 sm:p-6 animate-slide-up">
            <SectionTitle icon={Inbox} title="Fresh leads" hint={leads.data ? `${leads.data.total} total` : undefined} />
            {leads.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
            {!leads.isLoading && (leads.data?.items?.length ?? 0) === 0 && (
              <p className="text-sm text-zinc-500 py-6 text-center">No inquiries yet.</p>
            )}
            <div className="space-y-2.5">
              {(leads.data?.items ?? []).map((l) => (
                <Link key={l._id} to="/leads" className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-accent-blue/40 transition-all">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {l.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white font-medium truncate">{l.name}</span>
                    <span className="block text-xs text-zinc-500 truncate">{l.email}</span>
                  </span>
                  <Badge variant={leadBadge(l.status)}>{l.status}</Badge>
                </Link>
              ))}
            </div>
            <Link to="/leads" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-gold hover:text-white transition-colors">
              View all leads <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
