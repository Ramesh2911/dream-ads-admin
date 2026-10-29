import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Send, Users, Megaphone, CheckCircle2, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import api from '../lib/api';
import { Badge } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface BroadcastItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  data?: { broadcast?: boolean; target?: string; recipients?: number; sentBy?: string };
  createdAt: string;
}
interface HistoryData {
  items: BroadcastItem[];
  total: number;
  page: number;
  pages: number;
  stats: { broadcasts: number; delivered: number; recipients: number };
}

const TYPES = ['info', 'reward', 'task', 'referral', 'finance', 'system'] as const;

const TYPE_TONE: Record<string, string> = {
  info: 'bg-accent-blue/15 text-accent-blue border-accent-blue/25',
  reward: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25',
  task: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25',
  referral: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25',
  finance: 'bg-accent-green/15 text-accent-green border-accent-green/25',
  system: 'bg-white/[0.08] text-zinc-300 border-white/10',
};

function rel(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

export default function Notifications() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string>('info');
  const [target, setTarget] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', page],
    queryFn: async (): Promise<HistoryData> =>
      (await api.get('/admin/notifications', { params: { page, limit: 15 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const send = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/notifications/broadcast', {
        title: title.trim(),
        body: body.trim(),
        type,
        target: target.trim() || undefined,
      })).data,
    onSuccess: (d: { message?: string }) => {
      setSent(d.message || 'Sent');
      setTitle('');
      setBody('');
      setTarget('');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      setTimeout(() => setSent(null), 5000);
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Broadcast failed';
      setSent(null);
      alert(msg);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats;
  const start = total === 0 ? 0 : (page - 1) * 15 + 1;
  const end = Math.min(page * 15, total);
  const canSend = title.trim().length >= 2 && body.trim().length >= 2;

  const statChips = [
    { label: 'Broadcasts', value: stats ? stats.broadcasts : null, icon: Megaphone, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
    { label: 'Delivered', value: stats ? stats.delivered : null, icon: Send, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'Reachable users', value: stats ? stats.recipients : null, icon: Users, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25' },
    { label: 'Last send', value: items[0] ? rel(items[0].createdAt) : '—', icon: Clock, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25', mono: true },
  ];

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Bell className="w-5 h-5 text-accent-gold" /></span>
            Notifications
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Broadcast announcements to app users — review events notify automatically</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> In-app delivery
        </div>
      </div>

      {/* stats chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statChips.map((s, i) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cn('p-2.5 rounded-xl border shrink-0', s.chip)}><s.icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{s.label}</p>
              <p className={cn('text-xl font-extrabold text-white leading-tight truncate', s.mono ? 'text-base' : 'tabular-nums')}>{s.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-5 items-start">
        {/* ---- compose ---- */}
        {can('cms.broadcast') && (
          <div className="glass p-5 animate-fade-in">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Send className="w-4 h-4 text-accent-gold" /></span>
              <div>
                <p className="text-white font-bold text-sm">New broadcast</p>
                <p className="text-[11px] text-zinc-500">Shows instantly in the app's notification feed</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
                <input className="field-gold" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend bonus 2x coins" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Message *</label>
                <textarea
                  className="field-gold min-h-[110px] resize-y"
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the announcement users will read…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Type</label>
                  <select className="field-gold" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Target</label>
                  <input className="field-gold" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="All users (blank)" />
                </div>
              </div>
              <p className="text-[11px] text-zinc-600">Target: leave blank for everyone, or paste a user email / ID for a single user.</p>

              {sent && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-green/10 border border-accent-green/25 text-accent-green text-sm animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {sent}
                </div>
              )}

              <button
                onClick={() => send.mutate()}
                disabled={!canSend || send.isPending}
                className="w-full btn-gold !py-2.5 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {send.isPending ? 'Sending…' : 'Send broadcast'}
              </button>
            </div>
          </div>
        )}

        {/* ---- history ---- */}
        <div>
          {isLoading ? (
            <div className="glass overflow-hidden animate-fade-in">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05] last:border-0">
                  <div className="flex-1 space-y-2"><div className="h-3.5 w-52 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-72 rounded bg-white/[0.04] animate-pulse" /></div>
                  <div className="hidden md:block h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="glass p-12 text-center animate-fade-in">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-accent-gold" />
              </div>
              <p className="text-white font-semibold">No broadcasts yet</p>
              <p className="mt-1 text-sm text-zinc-500">Send your first announcement — task, withdrawal and KYC updates are delivered here automatically.</p>
            </div>
          ) : (
            <div className="glass overflow-hidden animate-fade-in">
              <div className="hidden md:grid grid-cols-[minmax(0,2fr)_0.8fr_1fr_0.7fr] gap-4 px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Broadcast</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Type</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Target</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Sent</p>
              </div>

              {items.map((n, i) => (
                <div
                  key={n._id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="group grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_0.8fr_1fr_0.7fr] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-accent-gold transition-colors">{n.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{n.body}</p>
                  </div>
                  <div className="hidden md:block">
                    <span className={cn('inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold capitalize', TYPE_TONE[n.type] ?? TYPE_TONE.info)}>
                      {n.type}
                    </span>
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{n.data?.target === 'all' ? 'All users' : n.data?.target || '—'}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{n.data?.recipients ?? 0} recipient{n.data?.recipients === 1 ? '' : 's'}{n.data?.sentBy ? ` · ${n.data.sentBy}` : ''}</p>
                  </div>
                  <div className="flex md:flex-col md:items-end gap-2 md:gap-1">
                    <div className="md:hidden"><span className={cn('inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold capitalize', TYPE_TONE[n.type] ?? TYPE_TONE.info)}>{n.type}</span></div>
                    <p className="text-[11px] text-zinc-600">{rel(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* pagination */}
          {data && data.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <p className="text-xs text-zinc-500">
                Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span> broadcasts
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
      </div>
    </div>
  );
}
