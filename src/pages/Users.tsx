import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Ban, CheckCircle, PauseCircle, Wallet, Eye, Users2, Coins, Share2,
  Copy, Check, X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Inbox,
  Crown, ListChecks, Banknote, CreditCard, User,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal, EmptyState } from '../components/ui';
import { cn, formatDate, formatCoins } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface UserRow { _id: string; name: string; email?: string; mobile?: string; referralCode: string; status: string; createdAt: string; dob?: string; kycStatus?: string; lastLoginAt?: string; membershipStatus?: string; membershipActiveAt?: string; avatar?: string }
interface ListData { users: UserRow[]; total: number; counts?: Record<string, number>; page: number; pages: number }
interface LedgerRow { _id: string; wallet: string; type: string; amount: number; reason: string; note?: string; createdAt: string }
interface CountMap { pending: number; approved: number; rejected: number; paid?: number; completed?: number; failed?: number; total: number }
interface DrawerData {
  user: UserRow;
  balances: { video: number; social: number };
  referralCount: number;
  recentLedger: LedgerRow[];
  summary?: {
    membership: { status: string; activeAt: string | null; requests: Record<string, number> };
    tasks: CountMap;
    withdrawals: CountMap & { sums: { pending: number; paid: number } };
    deposits: CountMap & { sums: { completed: number } };
  };
  recent?: {
    membership: { _id: string; method: string; amount: number; status: string; createdAt: string }[];
    tasks: { _id: string; status: string; createdAt: string; rejectionReason?: string; task?: { title: string; rewardCoins: number } }[];
    withdrawals: { _id: string; amount: number; wallet: string; method: string; status: string; createdAt: string }[];
    deposits: { _id: string; amount: number; gateway: string; status: string; createdAt: string }[];
  };
}

type StatusKey = 'active' | 'suspended' | 'banned' | 'pending_delete';

const STATUS_META: Record<StatusKey, { label: string; badge: 'success' | 'warning' | 'danger' | 'info'; ring: string; dot: string }> = {
  active: { label: 'Active', badge: 'success', ring: 'ring-accent-green/50', dot: 'bg-accent-green' },
  suspended: { label: 'Suspended', badge: 'warning', ring: 'ring-accent-gold/50', dot: 'bg-accent-gold' },
  banned: { label: 'Banned', badge: 'danger', ring: 'ring-accent-red/50', dot: 'bg-accent-red' },
  pending_delete: { label: 'Deleting', badge: 'info', ring: 'ring-accent-blue/50', dot: 'bg-accent-blue' },
};
const meta = (s: string) => STATUS_META[s as StatusKey] ?? STATUS_META.active;

const REASON_LABEL: Record<string, string> = { withdrawal: 'Redeem', deposit: 'Activation' };
const reasonLabel = (r: string) => REASON_LABEL[r] ?? String(r).replace(/_/g, ' ');

const TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'banned', label: 'Banned' },
];

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

export default function Users() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; to: StatusKey } | null>(null);
  const qc = useQueryClient();
  const { can } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, status, page],
    queryFn: async (): Promise<ListData> => (await api.get('/admin/users', { params: { search, status, page, limit: 20 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status: to }: { id: string; status: StatusKey }) => api.put(`/admin/users/${id}/status`, { status: to }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', vars.id] });
      setConfirm(null);
    },
  });

  const users = data?.users ?? [];
  const counts = data?.counts;
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  const stats = [
    { label: 'Total users', value: data ? total : null, icon: Users2, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25' },
    { label: 'Active', value: counts ? counts.active : null, icon: CheckCircle, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'Suspended', value: counts ? counts.suspended : null, icon: PauseCircle, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
    { label: 'Banned', value: counts ? counts.banned : null, icon: Ban, chip: 'bg-accent-red/15 text-accent-red border-accent-red/25' },
  ];

  const actionsFor = (u: UserRow) => {
    const acts: Array<{ icon: React.ComponentType<{ className?: string }>; cls: string; title: string; onClick: (e: React.MouseEvent) => void }> = [];
    if (can('wallet.adjust')) acts.push({ icon: Wallet, cls: 'hover:text-accent-gold hover:bg-accent-gold/10', title: 'Adjust passbook', onClick: (e) => { e.stopPropagation(); setAdjust({ id: u._id, name: u.name }); } });
    if (u.status === 'active') {
      if (can('users.update')) acts.push({ icon: PauseCircle, cls: 'hover:text-accent-gold hover:bg-accent-gold/10', title: 'Suspend', onClick: (e) => { e.stopPropagation(); setConfirm({ id: u._id, name: u.name, to: 'suspended' }); } });
      if (can('users.ban')) acts.push({ icon: Ban, cls: 'hover:text-accent-red hover:bg-accent-red/10', title: 'Ban', onClick: (e) => { e.stopPropagation(); setConfirm({ id: u._id, name: u.name, to: 'banned' }); } });
    } else if (u.status !== 'banned' && u.status !== 'pending_delete') {
      if (can('users.ban')) acts.push({ icon: Ban, cls: 'hover:text-accent-red hover:bg-accent-red/10', title: 'Ban', onClick: (e) => { e.stopPropagation(); setConfirm({ id: u._id, name: u.name, to: 'banned' }); } });
      if (can('users.update')) acts.push({ icon: CheckCircle, cls: 'hover:text-accent-green hover:bg-accent-green/10', title: 'Activate', onClick: (e) => { e.stopPropagation(); setConfirm({ id: u._id, name: u.name, to: 'active' }); } });
    } else if (can('users.update')) {
      acts.push({ icon: CheckCircle, cls: 'hover:text-accent-green hover:bg-accent-green/10', title: 'Activate', onClick: (e) => { e.stopPropagation(); setConfirm({ id: u._id, name: u.name, to: 'active' }); } });
    }
    return acts;
  };

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Users2 className="w-5 h-5 text-accent-gold" /></span>
            Users
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Search, filter and manage user accounts</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {/* stats chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cn('p-2.5 rounded-xl border shrink-0', s.chip)}><s.icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{s.label}</p>
              <p className="text-xl font-extrabold text-white tabular-nums leading-tight">{s.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="field-gold !py-2.5 pl-10"
            placeholder="Search by name, email, mobile or code…"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStatus(t.key); setPage(1); }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200',
                status === t.key
                  ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              {t.label}
              {t.key === '' && total > 0 && <span className="ml-1.5 opacity-70">{total}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="glass overflow-hidden animate-fade-in">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05] last:border-0">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
              <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-56 rounded bg-white/[0.04] animate-pulse" /></div>
              <div className="hidden md:block h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" sub="Try adjusting search or filters" />
      ) : (
        <div className="glass overflow-hidden animate-fade-in">
          {/* column headers */}
          <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">User</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Joined</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Actions</p>
          </div>

          {users.map((u, i) => {
            const m = meta(u.status);
            return (
              <div
                key={u._id}
                onClick={() => setDrawerId(u._id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] cursor-pointer transition-colors animate-fade-in relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-sm font-bold ring-2', m.ring)}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <span className={cn('absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-base-950', m.dot)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-accent-gold transition-colors">{u.name}</p>
                    <p className="text-xs font-semibold text-accent-blue truncate tabular-nums" title={`Unique ID: ${u.referralCode}`}>{u.referralCode}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email || u.mobile || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className="text-[11px] text-zinc-600">{rel(u.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block"><Badge variant={m.badge}>{m.label}</Badge></div>
                <div className="hidden md:block">
                  <p className="text-xs text-zinc-300" title={formatDate(u.createdAt)}>{rel(u.createdAt)}</p>
                  <p className="text-[11px] text-zinc-600">{formatDate(u.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 justify-start md:justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDrawerId(u._id); }}
                    title="View details"
                    className="p-2 rounded-lg text-zinc-500 hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {actionsFor(u).map((a, j) => (
                    <button
                      key={j}
                      onClick={a.onClick}
                      title={a.title}
                      className={cn('p-2 rounded-lg text-zinc-500 transition-all', a.cls)}
                    >
                      <a.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {data && data.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <p className="text-xs text-zinc-500">
            Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span> users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost !py-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-zinc-500 px-2">Page {page} / {data.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="btn-ghost !py-1.5 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* drawer */}
      <UserDrawer
        userId={drawerId}
        onClose={() => setDrawerId(null)}
        onStatus={(id, name, to) => setConfirm({ id, name, to })}
        onAdjust={(id, name) => setAdjust({ id, name })}
      />

      {/* confirm */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? `Confirm — ${STATUS_META[confirm.to].label}` : 'Confirm'}>
        {confirm && (
          <div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
              <span className={cn('p-2 rounded-lg shrink-0', confirm.to === 'banned' ? 'bg-accent-red/10 text-accent-red' : confirm.to === 'active' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-gold/10 text-accent-gold')}>
                {confirm.to === 'banned' ? <Ban className="w-5 h-5" /> : confirm.to === 'active' ? <CheckCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
              </span>
              <div className="text-sm text-zinc-300 leading-relaxed">
                {confirm.name ? <span className="font-semibold text-white">{confirm.name}</span> : null}
                {confirm.name ? ' will be ' : 'Change status to '}
                <span className={cn('font-semibold', confirm.to === 'banned' ? 'text-accent-red' : confirm.to === 'active' ? 'text-accent-green' : 'text-accent-gold')}>
                  {STATUS_META[confirm.to].label}
                </span>
                . This action is audit-logged.
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost flex-1 border border-white/[0.1]">Cancel</button>
              <button
                onClick={() => statusMut.mutate({ id: confirm.id, status: confirm.to })}
                disabled={statusMut.isPending}
                className={cn('flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50',
                  confirm.to === 'banned' ? 'bg-accent-red/20 text-accent-red border border-accent-red/30 hover:bg-accent-red/30'
                    : confirm.to === 'active' ? 'bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30'
                    : 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/30')}
              >
                {statusMut.isPending ? 'Applying…' : 'Yes, continue'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AdjustModal user={adjust} onClose={() => setAdjust(null)} onDone={() => qc.invalidateQueries({ queryKey: ['users'] })} />
    </div>
  );
}

/* ===================== DRAWER ===================== */
function UserDrawer({ userId, onClose, onStatus, onAdjust }: {
  userId: string | null;
  onClose: () => void;
  onStatus: (id: string, name: string, to: StatusKey) => void;
  onAdjust: (id: string, name: string) => void;
}) {
  const { can } = useAuth();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'profile' | 'membership' | 'tasks' | 'withdrawals' | 'deposits'>('profile');

  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<DrawerData> => (await api.get(`/admin/users/${userId}`)).data.data,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) { setShown(false); setTab('profile'); return; }
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, [userId]);

  if (!userId) return null;
  const u = data?.user;
  const m = u ? meta(u.status) : null;

  const copy = () => {
    if (!u?.referralCode) return;
    navigator.clipboard?.writeText(u.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const drawerTabs = [
    { key: 'profile' as const, label: 'Profile', icon: User, show: true },
    { key: 'membership' as const, label: 'Membership', icon: Crown, show: can('finance.read') },
    { key: 'tasks' as const, label: 'Tasks', icon: ListChecks, show: can('tasks.verify') },
    { key: 'withdrawals' as const, label: 'Withdrawals', icon: Banknote, show: can('finance.read') },
    { key: 'deposits' as const, label: 'Deposits', icon: CreditCard, show: can('finance.read') },
  ].filter((t) => t.show);

  const s = data?.summary;
  const r = data?.recent;

  const statusBadge = (st: string): 'success' | 'warning' | 'danger' | 'info' | 'default' =>
    st === 'approved' || st === 'paid' || st === 'completed' || st === 'active' ? 'success'
      : st === 'pending' ? 'warning'
        : st === 'rejected' || st === 'failed' || st === 'banned' ? 'danger' : 'info';

  const StatChips = ({ items }: { items: { label: string; value: number | string; tone?: string }[] }) => (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
          <p className={cn('text-lg font-extrabold tabular-nums leading-none', it.tone ?? 'text-white')}>{it.value}</p>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">{it.label}</p>
        </div>
      ))}
    </div>
  );

  const EmptyRow = ({ msg }: { msg: string }) => (
    <p className="text-sm text-zinc-600 py-5 text-center">{msg}</p>
  );

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-brand-navy/70 backdrop-blur-sm transition-opacity duration-300', shown ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] flex flex-col bg-brand-navy border-l border-white/[0.1] transition-transform duration-300 ease-out',
          shown ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* panel layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(46,107,255,0.16),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-accent-gold/50 via-accent-blue/30 to-transparent pointer-events-none" />

        {/* header */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {isLoading || !u || !m ? (
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] animate-pulse" />
              ) : (
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xl font-bold ring-2', m.ring)}>
                  {u.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                {isLoading || !u || !m ? (
                  <div className="space-y-2"><div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-44 rounded bg-white/[0.04] animate-pulse" /></div>
                ) : (
                  <>
                    <p className="text-lg font-bold text-white truncate">{u.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email || '—'} {u.mobile ? `· ${u.mobile}` : ''}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <button onClick={copy} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-accent-gold hover:border-accent-gold/40 transition-colors" title="Copy referral code">
                        {u.referralCode} {copied ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all shrink-0" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="relative shrink-0 flex gap-1 px-4 pt-3 pb-1 overflow-x-auto border-b border-white/[0.06]">
          {drawerTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all',
                tab === t.key ? 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-glow' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* body */}
        <div className="relative flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {isLoading || !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
              <div className="h-4 w-40 rounded bg-white/[0.05] animate-pulse" />
              {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : tab === 'profile' ? (
            <>
              {/* balance tiles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass p-3.5 text-center">
                  <span className="inline-flex p-2 rounded-lg bg-accent-gold/10 mb-1.5"><Coins className="w-4 h-4 text-accent-gold" /></span>
                  <p className="text-lg font-extrabold text-white tabular-nums leading-none">{formatCoins(data.balances.video)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5">Video</p>
                </div>
                <div className="glass p-3.5 text-center">
                  <span className="inline-flex p-2 rounded-lg bg-accent-blue/10 mb-1.5"><Wallet className="w-4 h-4 text-accent-blue" /></span>
                  <p className="text-lg font-extrabold text-white tabular-nums leading-none">{formatCoins(data.balances.social)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5">Social</p>
                </div>
                <div className="glass p-3.5 text-center">
                  <span className="inline-flex p-2 rounded-lg bg-accent-violet/10 mb-1.5"><Share2 className="w-4 h-4 text-accent-violet" /></span>
                  <p className="text-lg font-extrabold text-white tabular-nums leading-none">{data.referralCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5">Referrals</p>
                </div>
              </div>

              {/* profile meta */}
              <div className="glass p-4 space-y-2.5">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-1">
                  <User className="w-3.5 h-3.5 text-accent-blue/80" /> Profile
                </p>
                {[
                  ['Unique ID', u?.referralCode],
                  ['DOB', u?.dob ? formatDate(u.dob) : '—'],
                  ['KYC', u?.kycStatus ?? 'none'],
                  ['Membership', u?.membershipStatus ?? 'none'],
                  ['Last login', u?.lastLoginAt ? rel(u.lastLoginAt) : '—'],
                  ['Joined', u?.createdAt ? formatDate(u.createdAt) : '—'],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-500">{k as string}</span>
                    <span className="text-zinc-200 font-medium capitalize truncate">{v as string || '—'}</span>
                  </div>
                ))}
              </div>

              {/* ledger */}
              <div>
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">
                  <Inbox className="w-3.5 h-3.5 text-accent-gold/70" /> Recent passbook activity
                </p>
                {data.recentLedger.length === 0 && (
                  <p className="text-sm text-zinc-600 py-4 text-center">No transactions yet.</p>
                )}
                <div className="space-y-2">
                  {data.recentLedger.map((e) => (
                    <div key={e._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className={cn('p-2 rounded-lg shrink-0', e.type === 'credit' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red')}>
                        {e.type === 'credit' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-300 font-medium capitalize truncate">{reasonLabel(e.reason)}</p>
                        {e.note && <p className="text-[11px] text-zinc-600 truncate">{e.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-bold tabular-nums', e.type === 'credit' ? 'text-accent-green' : 'text-accent-red')}>
                          {e.type === 'credit' ? '+' : '−'}{formatCoins(e.amount)}
                        </p>
                        <p className="text-[10px] text-zinc-600">{e.wallet}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : tab === 'membership' && s ? (
            <>
              <div className="glass p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    <Crown className="w-3.5 h-3.5 text-accent-gold/80" /> Membership
                  </p>
                  <Badge variant={s.membership.status === 'active' ? 'success' : s.membership.status === 'pending' ? 'warning' : 'default'}>
                    {s.membership.status}
                  </Badge>
                </div>
                <StatChips items={[
                  { label: 'Pending', value: s.membership.requests.pending ?? 0, tone: 'text-accent-gold' },
                  { label: 'Approved', value: s.membership.requests.approved ?? 0, tone: 'text-accent-green' },
                  { label: 'Rejected', value: s.membership.requests.rejected ?? 0, tone: 'text-accent-red' },
                ]} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">Recent requests</p>
                {r?.membership?.length === 0 || !r?.membership ? <EmptyRow msg="No membership requests." /> : (
                  <div className="space-y-2">
                    {r.membership.map((mem) => (
                      <div key={mem._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <span className="p-2 rounded-lg bg-accent-gold/10 text-accent-gold shrink-0"><Crown className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{formatCoins(mem.amount)} <span className="text-xs text-zinc-500 font-normal">· {mem.method}</span></p>
                          <p className="text-[11px] text-zinc-600">{formatDate(mem.createdAt)}</p>
                        </div>
                        <Badge variant={statusBadge(mem.status)}>{mem.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : tab === 'tasks' && s ? (
            <>
              <div className="glass p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">
                  <ListChecks className="w-3.5 h-3.5 text-accent-blue/80" /> Task submissions
                </p>
                <StatChips items={[
                  { label: 'Pending', value: s.tasks.pending, tone: 'text-accent-gold' },
                  { label: 'Approved', value: s.tasks.approved, tone: 'text-accent-green' },
                  { label: 'Rejected', value: s.tasks.rejected, tone: 'text-accent-red' },
                ]} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">Recent submissions</p>
                {r?.tasks?.length === 0 || !r?.tasks ? <EmptyRow msg="No task submissions." /> : (
                  <div className="space-y-2">
                    {r.tasks.map((t) => (
                      <div key={t._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <span className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue shrink-0"><ListChecks className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">{t.task?.title ?? 'Task'}</p>
                          <p className="text-[11px] text-zinc-600">
                            {t.task?.rewardCoins != null && <span className="text-accent-gold">+{formatCoins(t.task.rewardCoins)} coins · </span>}
                            {formatDate(t.createdAt)}
                          </p>
                        </div>
                        <Badge variant={statusBadge(t.status)}>{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : tab === 'withdrawals' && s ? (
            <>
              <div className="glass p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">
                  <Banknote className="w-3.5 h-3.5 text-accent-green/80" /> Withdrawals
                </p>
                <StatChips items={[
                  { label: 'Pending', value: s.withdrawals.pending, tone: 'text-accent-gold' },
                  { label: 'Paid', value: s.withdrawals.paid ?? 0, tone: 'text-accent-green' },
                  { label: 'Total', value: s.withdrawals.total, tone: 'text-white' },
                ]} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-accent-gold/[0.07] border border-accent-gold/15 p-2.5 text-center">
                    <p className="text-sm font-bold text-accent-gold tabular-nums">{formatCoins(s.withdrawals.sums.pending)}</p>
                    <p className="text-[10px] uppercase text-zinc-500 mt-0.5">Pending amount</p>
                  </div>
                  <div className="rounded-xl bg-accent-green/[0.07] border border-accent-green/15 p-2.5 text-center">
                    <p className="text-sm font-bold text-accent-green tabular-nums">{formatCoins(s.withdrawals.sums.paid)}</p>
                    <p className="text-[10px] uppercase text-zinc-500 mt-0.5">Paid amount</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">Recent withdrawals</p>
                {r?.withdrawals?.length === 0 || !r?.withdrawals ? <EmptyRow msg="No withdrawals." /> : (
                  <div className="space-y-2">
                    {r.withdrawals.map((w) => (
                      <div key={w._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <span className="p-2 rounded-lg bg-accent-green/10 text-accent-green shrink-0"><Banknote className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{formatCoins(w.amount)} <span className="text-xs text-zinc-500 font-normal">· {w.method} · {w.wallet}</span></p>
                          <p className="text-[11px] text-zinc-600">{formatDate(w.createdAt)}</p>
                        </div>
                        <Badge variant={statusBadge(w.status)}>{w.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : tab === 'deposits' && s ? (
            <>
              <div className="glass p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">
                  <CreditCard className="w-3.5 h-3.5 text-accent-violet/80" /> Deposits
                </p>
                <StatChips items={[
                  { label: 'Pending', value: s.deposits.pending, tone: 'text-accent-gold' },
                  { label: 'Completed', value: s.deposits.completed ?? 0, tone: 'text-accent-green' },
                  { label: 'Failed', value: s.deposits.failed ?? 0, tone: 'text-accent-red' },
                ]} />
                <div className="mt-3 rounded-xl bg-accent-violet/[0.07] border border-accent-violet/15 p-2.5 text-center">
                  <p className="text-sm font-bold text-accent-violet tabular-nums">{formatCoins(s.deposits.sums.completed)}</p>
                  <p className="text-[10px] uppercase text-zinc-500 mt-0.5">Completed amount</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 mb-3">Recent deposits</p>
                {r?.deposits?.length === 0 || !r?.deposits ? <EmptyRow msg="No deposits." /> : (
                  <div className="space-y-2">
                    {r.deposits.map((d) => (
                      <div key={d._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <span className="p-2 rounded-lg bg-accent-violet/10 text-accent-violet shrink-0"><CreditCard className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{formatCoins(d.amount)} <span className="text-xs text-zinc-500 font-normal">· {d.gateway}</span></p>
                          <p className="text-[11px] text-zinc-600">{formatDate(d.createdAt)}</p>
                        </div>
                        <Badge variant={statusBadge(d.status)}>{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* footer actions */}
        {u && m && (
          <div className="relative shrink-0 border-t border-white/[0.08] p-4 space-y-2.5 bg-brand-navy/80 backdrop-blur">
            <div className="flex gap-2.5">
              {u.status !== 'active' && can('users.update') && (
                <button onClick={() => onStatus(u._id, u.name, 'active')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/25 transition-all">
                  <CheckCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Activate
                </button>
              )}
              {u.status === 'active' && can('users.update') && (
                <button onClick={() => onStatus(u._id, u.name, 'suspended')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-accent-gold/15 text-accent-gold border border-accent-gold/25 hover:bg-accent-gold/25 transition-all">
                  <PauseCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Suspend
                </button>
              )}
              {u.status !== 'banned' && can('users.ban') && (
                <button onClick={() => onStatus(u._id, u.name, 'banned')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-accent-red/15 text-accent-red border border-accent-red/25 hover:bg-accent-red/25 transition-all">
                  <Ban className="w-3.5 h-3.5 inline -mt-0.5 mr-1" /> Ban
                </button>
              )}
              {can('wallet.adjust') && (
                <button onClick={() => onAdjust(u._id, u.name)} className="btn-ghost !py-2.5 !px-4 border border-white/[0.12] text-xs hover:border-accent-gold/40 hover:text-accent-gold">
                  <Wallet className="w-3.5 h-3.5" /> Adjust
                </button>
              )}
            </div>
            <p className="text-[10px] text-center text-zinc-600">Status changes are audit-logged</p>
          </div>
        )}
      </aside>
    </>
  );
}

/* ===================== WALLET ADJUST MODAL ===================== */
function AdjustModal({ user, onClose, onDone }: { user: { id: string; name: string } | null; onClose: () => void; onDone: () => void }) {
  const [wallet, setWallet] = useState<'video' | 'social'>('social');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: () => api.put(`/admin/users/${user!.id}/wallet-adjust`, { wallet, type, amount: Number(amount), reason }),
    onSuccess: () => { onDone(); onClose(); setAmount(''); setReason(''); setErr(''); },
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (!user) return null;
  return (
    <Modal open={!!user} onClose={onClose} title={`Adjust passbook — ${user.name}`}>
      {err && <div className="mb-3 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">{err}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-400">Passbook</label>
            <select value={wallet} onChange={(e) => setWallet(e.target.value as 'video' | 'social')} className="glass-input mt-1">
              <option value="video">Video Earnings</option>
              <option value="social">Social / Task</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'credit' | 'debit')} className="glass-input mt-1">
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (−)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-400">Coins</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="glass-input mt-1" placeholder="e.g. 100" />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-400">Reason (required for audit)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="glass-input mt-1" placeholder="e.g. Compensation bonus" />
        </div>
        <button onClick={() => mut.mutate()} disabled={!amount || !reason || mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Applying…' : 'Apply adjustment'}
        </button>
      </div>
    </Modal>
  );
}
