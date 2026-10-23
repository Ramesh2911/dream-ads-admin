import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ListChecks, Plus, Pencil, Trash2, Eye, CheckCircle2, XCircle, Search, Inbox,
  Crown, Coins, Camera, Link2, Type as TypeIcon, Play, Pause, ExternalLink,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface TaskItem {
  _id: string; title: string; description: string; instructions?: string;
  proofType: string; rewardCoins: number; rewardWallet: string;
  status: string; totalSlots?: number; filledSlots: number;
  eligibility?: { minLevel?: number; requiresKyc?: boolean; maxSubmissions?: number };
  startsAt?: string; endsAt?: string; createdAt: string;
  submissions: { pending: number; approved: number; rejected: number; total: number };
}
interface TasksData { tasks: TaskItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface SubItem {
  _id: string;
  user: { name: string; email?: string; referralCode?: string } | null;
  task: { title: string; rewardCoins: number; rewardWallet: string; proofType?: string } | null;
  proofUrl?: string; proofText?: string; status: string; rejectionReason?: string; createdAt: string;
}
interface SubsData { submissions: SubItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface TaskStats {
  totals: {
    tasks: number; active: number; draft: number; paused: number; completed: number;
    pending: number; approved: number; rejected: number; totalSubmissions: number;
    approvalRate: number; coinsPaid: number;
  };
  days: { date: string; pending: number; approved: number; rejected: number }[];
  topTasks: { taskId: string | null; title: string; rewardCoins: number; count: number; pending: number }[];
}

const T_STATUS: Record<string, { cls: string; dot: string }> = {
  active: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  draft: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  paused: { cls: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25', dot: 'bg-accent-blue' },
  completed: { cls: 'text-zinc-400 bg-white/[0.06] border-white/10', dot: 'bg-zinc-500' },
};
const S_STATUS: Record<string, { cls: string; dot: string }> = {
  pending: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  approved: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  rejected: { cls: 'text-accent-red bg-accent-red/10 border-accent-red/25', dot: 'bg-accent-red' },
};
const PROOF_TONE: Record<string, { cls: string; icon: typeof Camera; label: string }> = {
  screenshot: { cls: 'text-accent-violet bg-accent-violet/10 border-accent-violet/25', icon: Camera, label: 'Screenshot' },
  url: { cls: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25', icon: Link2, label: 'URL' },
  text: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', icon: TypeIcon, label: 'Text' },
};
const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;

const isImage = (u?: string) => !!u && /(\.(png|jpe?g|webp|gif)(\?|$)|data:image|unsplash|cloudinary|imgur)/i.test(u);

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

type TabKey = 'tasks' | 'submissions';

export default function Tasks() {
  const [tab, setTab] = useState<TabKey>('tasks');
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async (): Promise<TaskStats> => (await api.get('/admin/task-stats')).data.data,
  });

  const t = stats?.totals;
  const chips = [
    { label: 'Active tasks', value: stats ? t!.active : null, icon: ListChecks, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: stats ? `${t!.draft} draft · ${t!.paused} paused` : '' },
    { label: 'Pending reviews', value: stats ? t!.pending : null, icon: Eye, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: stats ? `${t!.totalSubmissions} total submissions` : '' },
    { label: 'Approved', value: stats ? t!.approved : null, icon: CheckCircle2, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: stats ? `${t!.approvalRate}% approval rate` : '' },
    { label: 'Coins paid', value: stats ? formatCoins(t!.coinsPaid) : null, icon: Coins, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25', sub: stats ? `${t!.rejected} rejected` : '' },
  ];

  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  const top = stats?.topTasks ?? [];
  const maxTop = Math.max(1, ...top.map((r) => r.count));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><ListChecks className="w-5 h-5 text-accent-gold" /></span>
            Tasks & Verification
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Create tasks, review proofs and release rewards</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {/* stats */}
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

      {/* chart + top tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><ListChecks className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white truncate">Submissions · last 7 days</h3>
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green" /> approved</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-accent-gold" /> pending</span>
            </span>
          </div>
          {statsLoading ? (
            <div className="h-[230px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="tskApp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="approved" name="Approved" fill="url(#tskApp)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line dataKey="pending" name="Pending" type="monotone" stroke="#FFD86F" strokeWidth={2.5} dot={{ r: 3, fill: '#FFD86F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Crown className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Busiest tasks</h3>
          </div>
          {statsLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!statsLoading && top.length === 0 && <p className="text-sm text-zinc-500 py-8 text-center">No submissions yet.</p>}
          <div className="space-y-2.5">
            {top.map((r, i) => (
              <div key={r.taskId ?? `t-${i}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-accent-violet opacity-15" style={{ width: `${Math.max(6, Math.round((r.count / maxTop) * 100))}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-accent-gold">#{i + 1}</span> {r.title}
                    </p>
                    <p className="text-[10px] text-zinc-500">{r.count} subs · {r.pending} pending · {formatCoins(r.rewardCoins)} coins</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:left-auto lg:right-8 lg:translate-x-0">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-base-950/80 backdrop-blur-xl border border-white/[0.1] shadow-glow-goldSoft">
          {([['tasks', 'Tasks', ListChecks], ['submissions', 'Submissions', Eye]] as const).map(([k, l, Icon]) => (
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

      {tab === 'tasks' ? <TasksTab /> : <SubmissionsTab onTab={setTab} />}
    </div>
  );
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['task-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-tasks'] });
    qc.invalidateQueries({ queryKey: ['submissions'] });
    qc.invalidateQueries({ queryKey: ['ledger'] });
    qc.invalidateQueries({ queryKey: ['ledger-stats'] });
  };
}

const emptyTask = {
  title: '', description: '', instructions: '', proofType: 'screenshot', rewardCoins: '10',
  rewardWallet: 'social', totalSlots: '', status: 'draft',
  minLevel: '', requiresKyc: false, maxSubmissions: '', startsAt: '', endsAt: '',
};

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TasksTab() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [form, setForm] = useState(emptyTask);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<TaskItem | null>(null);
  const { can } = useAuth();
  const manage = can('tasks.read');
  const invalidate = useInvalidateTasks();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tasks', status, search, page],
    queryFn: async (): Promise<TasksData> =>
      (await api.get('/admin/tasks', { params: { status: status || undefined, search: search || undefined, page, limit: 12 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const body = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    instructions: form.instructions.trim() || undefined,
    proofType: form.proofType,
    rewardCoins: Number(form.rewardCoins),
    rewardWallet: form.rewardWallet,
    totalSlots: form.totalSlots ? Number(form.totalSlots) : undefined,
    status: form.status,
    eligibility: {
      ...(form.minLevel ? { minLevel: Number(form.minLevel) } : {}),
      ...(form.requiresKyc ? { requiresKyc: true } : {}),
      ...(form.maxSubmissions ? { maxSubmissions: Number(form.maxSubmissions) } : {}),
    },
    startsAt: form.startsAt || undefined,
    endsAt: form.endsAt || undefined,
  });
  const createMut = useMutation({
    mutationFn: () => api.post('/admin/tasks', body()),
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not create task'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/tasks/${editing!._id}`, body()),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save task'),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/admin/tasks/${id}`, { status }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tasks/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const openCreate = () => { setEditing(null); setForm(emptyTask); setFormErr(''); setFormOpen(true); };
  const openEdit = (t: TaskItem) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description, instructions: t.instructions ?? '',
      proofType: t.proofType, rewardCoins: String(t.rewardCoins), rewardWallet: t.rewardWallet,
      totalSlots: t.totalSlots != null ? String(t.totalSlots) : '', status: t.status === 'completed' ? 'draft' : t.status,
      minLevel: t.eligibility?.minLevel != null ? String(t.eligibility.minLevel) : '',
      requiresKyc: !!t.eligibility?.requiresKyc,
      maxSubmissions: t.eligibility?.maxSubmissions != null ? String(t.eligibility.maxSubmissions) : '',
      startsAt: toLocalInput(t.startsAt), endsAt: toLocalInput(t.endsAt),
    });
    setFormErr(''); setFormOpen(true);
  };
  const valid = form.title.trim() && form.description.trim() && Number(form.rewardCoins) > 0 && !(createMut.isPending || updateMut.isPending);

  const items = data?.tasks ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-white/[0.08]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="field-gold !py-2 pl-10" placeholder="Search tasks…" />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              {[{ k: '', l: 'All' }, { k: 'active', l: 'Active' }, { k: 'draft', l: 'Drafts' }, { k: 'paused', l: 'Paused' }, { k: 'completed', l: 'Done' }].map((s) => (
                <button
                  key={s.k}
                  onClick={() => { setStatus(s.k); setPage(1); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    status === s.k
                      ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  {s.l} <span className="opacity-60">{s.k ? (counts[s.k] ?? 0) : total}</span>
                </button>
              ))}
            </div>
            {manage && (
              <button onClick={openCreate} className="btn-gold !py-2 px-3.5 text-xs"><Plus className="w-3.5 h-3.5" /> New task</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-52 rounded-2xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Inbox className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No tasks found</p>
            <p className="mt-1 text-sm text-zinc-500">{search || status ? 'Try different filters.' : 'Create your first task to engage users.'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {items.map((t, i) => {
              const P = PROOF_TONE[t.proofType] ?? PROOF_TONE.text;
              return (
                <div key={t._id} style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }} className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-accent-gold/30 transition-all animate-fade-in relative overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-accent-violet/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start justify-between mb-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold', (T_STATUS[t.status] ?? T_STATUS.draft).cls)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', (T_STATUS[t.status] ?? T_STATUS.draft).dot)} /> {t.status}
                    </span>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold', P.cls)}>
                      <P.icon className="w-2.5 h-2.5" /> {P.label}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-sm leading-snug line-clamp-1">{t.title}</p>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>
                  <p className="mt-3 text-accent-gold font-extrabold text-lg tabular-nums">{formatCoins(t.rewardCoins)} <span className="text-xs font-semibold text-zinc-500">coins · {t.rewardWallet} wallet</span></p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                      <span>Slots</span>
                      <span className="text-zinc-300 font-medium">{t.totalSlots != null ? `${t.filledSlots}/${t.totalSlots}` : `${t.filledSlots} filled · unlimited`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-gold to-accent-violet"
                        style={{ width: t.totalSlots ? `${Math.min(100, Math.round((t.filledSlots / t.totalSlots) * 100))}%` : '14%' }}
                      />
                    </div>
                  </div>
                  {(t.eligibility?.requiresKyc || t.eligibility?.minLevel || t.eligibility?.maxSubmissions) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {t.eligibility?.requiresKyc && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-pink/10 text-accent-pink border border-accent-pink/25">KYC required</span>}
                      {t.eligibility?.minLevel && <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/10 text-accent-blue border border-brand-blue/25">Lvl {t.eligibility.minLevel}+</span>}
                      {t.eligibility?.maxSubmissions && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-400 border border-white/10">max {t.eligibility.maxSubmissions}/user</span>}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-[10px]">
                      <span className="text-accent-gold font-semibold">{t.submissions.pending} pend</span>
                      <span className="text-accent-green font-semibold">{t.submissions.approved} ok</span>
                      {t.submissions.rejected > 0 && <span className="text-accent-red font-semibold">{t.submissions.rejected} rej</span>}
                    </div>
                    {manage && (
                      <div className="flex gap-1">
                        {t.status === 'active' && (
                          <button onClick={() => statusMut.mutate({ id: t._id, status: 'paused' })} className="btn-ghost p-1.5 text-accent-gold" title="Pause"><Pause className="w-3.5 h-3.5" /></button>
                        )}
                        {(t.status === 'paused' || t.status === 'draft') && (
                          <button onClick={() => statusMut.mutate({ id: t._id, status: 'active' })} className="btn-ghost p-1.5 text-accent-green" title="Activate"><Play className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => openEdit(t)} className="btn-ghost p-1.5 text-accent-blue"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleting(t)} className="btn-ghost p-1.5 text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
            <p className="text-xs text-zinc-500">Page <span className="text-zinc-300 font-medium">{page}</span> of <span className="text-zinc-300 font-medium">{data.pages}</span> · {total} tasks</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* add/edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit task' : 'New task'} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input className="field-gold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Follow our Instagram" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea className="field-gold resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What users must do…" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Instructions</label>
            <textarea className="field-gold resize-none" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Step-by-step guide (optional)…" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Proof type *</label>
              <select className="field-gold" value={form.proofType} onChange={(e) => setForm({ ...form, proofType: e.target.value })}>
                <option value="screenshot">Screenshot</option>
                <option value="url">URL</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Reward coins *</label>
              <input type="number" min={1} className="field-gold" value={form.rewardCoins} onChange={(e) => setForm({ ...form, rewardCoins: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Wallet</label>
              <select className="field-gold" value={form.rewardWallet} onChange={(e) => setForm({ ...form, rewardWallet: e.target.value })}>
                <option value="social">Social</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Status</label>
              <select className="field-gold" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Total slots</label>
              <input type="number" min={1} className="field-gold" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} placeholder="unlimited" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Min level</label>
              <input type="number" min={0} className="field-gold" value={form.minLevel} onChange={(e) => setForm({ ...form, minLevel: e.target.value })} placeholder="—" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Max / user</label>
              <input type="number" min={1} className="field-gold" value={form.maxSubmissions} onChange={(e) => setForm({ ...form, maxSubmissions: e.target.value })} placeholder="—" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.requiresKyc} onChange={(e) => setForm({ ...form, requiresKyc: e.target.checked })} className="w-4 h-4 accent-[#FFD86F]" />
                <span className="text-sm text-zinc-300">KYC required</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Starts</label>
              <input type="datetime-local" className="field-gold" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Ends</label>
              <input type="datetime-local" className="field-gold" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>
          {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
            <button onClick={() => setFormOpen(false)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
            <button onClick={() => (editing ? updateMut.mutate() : createMut.mutate())} disabled={!valid} className="btn-gold !py-2 px-4 text-xs disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete task">
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><Trash2 className="w-4 h-4 text-accent-red" /></span>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{deleting.title}</p>
                <p className="text-xs text-zinc-500">{deleting.submissions.total} submissions</p>
              </div>
            </div>
            {deleting.submissions.total > 0 && <p className="text-xs text-accent-red">Deletion will be blocked — pause it instead.</p>}
            {delMut.isError && (
              <p className="text-xs text-accent-red">{(delMut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Delete failed'}</p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => delMut.mutate(deleting._id)} disabled={delMut.isPending || deleting.submissions.total > 0} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function SubmissionsTab({ onTab }: { onTab: (t: TabKey) => void }) {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<SubItem | null>(null);
  const [reason, setReason] = useState('');
  const { can } = useAuth();
  const verify = can('tasks.verify');
  const invalidate = useInvalidateTasks();

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', status, page],
    queryFn: async (): Promise<SubsData> =>
      (await api.get('/admin/task-submissions', { params: { status: status || undefined, page, limit: 30 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const mut = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) =>
      api.put(`/admin/task-submissions/${id}`, { status, rejectionReason }),
    onSuccess: () => { invalidate(); setReview(null); setReason(''); },
  });

  const items = data?.submissions ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/[0.08]">
          {[{ k: 'pending', l: 'Pending' }, { k: 'approved', l: 'Approved' }, { k: 'rejected', l: 'Rejected' }].map((s) => (
            <button
              key={s.k}
              onClick={() => { setStatus(s.k); setPage(1); }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border',
                status === s.k
                  ? s.k === 'approved' ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                  : s.k === 'rejected' ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                  : 'bg-accent-gold/15 text-accent-gold border-accent-gold/30 shadow-glow-goldSoft'
                  : 'bg-white/[0.04] text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.08]'
                )}
              >
                {s.l} <span className="ml-1 opacity-60">{counts[s.k] ?? 0}</span>
              </button>
            ))}
            <button onClick={() => onTab('tasks')} className="ml-auto text-xs text-accent-gold hover:underline flex items-center gap-1">
              Switch to tasks <span aria-hidden>→</span>
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
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Inbox className="w-6 h-6 text-accent-gold" /></div>
              <p className="text-white font-semibold">No {status} submissions</p>
              <p className="mt-1 text-sm text-zinc-500">User proofs land here for review.</p>
            </div>
          ) : (
            items.map((s, i) => {
              const P = PROOF_TONE[s.task?.proofType ?? 'text'] ?? PROOF_TONE.text;
              return (
                <div
                  key={s._id}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                  className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.7fr)_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {s.user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.user?.name ?? 'Unknown user'}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{s.user?.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                      <ListChecks className="w-3.5 h-3.5 text-accent-violet shrink-0" />
                      {s.task?.title ?? 'Deleted task'}
                      <span className="text-accent-gold text-xs font-bold shrink-0">{formatCoins(s.task?.rewardCoins ?? 0)}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold', P.cls)}>
                        <P.icon className="w-2.5 h-2.5" /> {P.label} proof
                      </span>
                      {s.rejectionReason && <span className="text-[10px] text-accent-red/80 truncate max-w-[180px]">reason: {s.rejectionReason}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <div className="flex flex-col md:items-end gap-1">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize', (S_STATUS[s.status] ?? S_STATUS.pending).cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', (S_STATUS[s.status] ?? S_STATUS.pending).dot)} /> {s.status}
                      </span>
                      <p className="text-[11px] text-zinc-600 md:text-right" title={formatDate(s.createdAt)}>{rel(s.createdAt)}</p>
                    </div>
                    <button onClick={() => { setReview(s); setReason(''); }} className="btn-ghost !py-1.5 px-3 text-xs text-accent-blue">
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {data && data.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
              <p className="text-xs text-zinc-500">Showing <span className="text-zinc-300 font-medium">{(page - 1) * 30 + 1}–{Math.min(page * 30, total)}</span> of <span className="text-zinc-300 font-medium">{total}</span></p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">Prev</button>
                <span className="text-xs text-zinc-500 px-2">Page {page} / {data.pages}</span>
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* review modal */}
        <Modal open={!!review} onClose={() => setReview(null)} title="Review submission" wide>
          {review && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {review.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{review.user?.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{review.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20 shrink-0"><Coins className="w-4 h-4 text-accent-gold" /></span>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{review.task?.title ?? 'Task'}</p>
                    <p className="text-[11px] text-zinc-500">reward {formatCoins(review.task?.rewardCoins ?? 0)} · {review.task?.rewardWallet} wallet</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Proof</p>
                {review.proofUrl && isImage(review.proofUrl) && (
                  <a href={review.proofUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-white/10 mb-3 hover:border-accent-gold/40 transition-colors">
                    <img src={review.proofUrl} alt="Proof" className="w-full max-h-72 object-contain bg-base-950/60" />
                  </a>
                )}
                {review.proofUrl && (
                  <a href={review.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline break-all mb-2">
                    <ExternalLink className="w-3 h-3 shrink-0" /> {review.proofUrl}
                  </a>
                )}
                {review.proofText && (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap mt-1">{review.proofText}</p>
                )}
                {!review.proofUrl && !review.proofText && <p className="text-sm text-zinc-500">No proof provided.</p>}
              </div>

              {review.status === 'pending' && verify && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Rejection reason</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="field-gold resize-none" placeholder="e.g. proof unclear, task not completed…" />
                  </div>
                  {mut.isError && (
                    <p className="text-xs text-accent-red">{(mut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed'}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
                    <button
                      onClick={() => mut.mutate({ id: review._id, status: 'rejected', rejectionReason: reason.trim() || 'No reason provided' })}
                      disabled={mut.isPending}
                      className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => mut.mutate({ id: review._id, status: 'approved' })}
                      disabled={mut.isPending}
                      className="btn-gold !py-2 px-4 text-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {mut.isPending ? 'Saving…' : 'Approve & Pay'}
                    </button>
                  </div>
                </>
              )}
              {review.status !== 'pending' && (
                <div className={cn('p-3 rounded-xl border text-sm', review.status === 'approved' ? 'bg-accent-green/10 border-accent-green/25 text-accent-green' : 'bg-accent-red/10 border-accent-red/25 text-accent-red')}>
                  Already {review.status}{review.rejectionReason ? ` — ${review.rejectionReason}` : ''}
                </div>
              )}
            </div>
          )}
        </Modal>
    </>
  );
}
