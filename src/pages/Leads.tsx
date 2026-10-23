import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Search, Eye, Download, FileText, MessageSquare, Star, X, Send, Mail, Phone,
  Building2, Wallet, CalendarClock, Globe, Clock, ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import api from '../lib/api';
import { Badge } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  service?: string;
  role?: string;
  budget?: string;
  timeline?: string;
  message: string;
  estimate?: { platform?: string; features?: string[]; timeline?: string; complexity?: number };
  source: string;
  attachment?: { filename: string; originalName: string; mimetype: string; size: number };
  status: string;
  notes: { body: string; by: string; at: string }[];
  createdAt: string;
}
interface ListData { items: Inquiry[]; total: number; counts?: Record<string, number>; page: number; pages: number }

type StatusKey = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

const STATUS_META: Record<StatusKey, { label: string; badge: 'info' | 'warning' | 'success' | 'danger'; ring: string; dot: string }> = {
  new: { label: 'New', badge: 'info', ring: 'ring-accent-blue/50', dot: 'bg-accent-blue' },
  contacted: { label: 'Contacted', badge: 'warning', ring: 'ring-accent-gold/50', dot: 'bg-accent-gold' },
  qualified: { label: 'Qualified', badge: 'info', ring: 'ring-accent-violet/50', dot: 'bg-accent-violet' },
  proposal: { label: 'Proposal', badge: 'warning', ring: 'ring-accent-goldDark/60', dot: 'bg-accent-goldDark' },
  won: { label: 'Won', badge: 'success', ring: 'ring-accent-green/50', dot: 'bg-accent-green' },
  lost: { label: 'Lost', badge: 'danger', ring: 'ring-accent-red/50', dot: 'bg-accent-red' },
};
const meta = (s: string) => STATUS_META[s as StatusKey] ?? STATUS_META.new;

const SUBJECT_LABEL: Record<string, string> = { project: 'Project', career: 'Career', partnership: 'Partnership', support: 'Support', other: 'Other' };
const SUBJECT_TONE: Record<string, string> = {
  project: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25',
  career: 'bg-accent-green/15 text-accent-green border-accent-green/25',
  partnership: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25',
  support: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25',
  other: 'bg-white/[0.08] text-zinc-300 border-white/10',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
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

export default function Leads() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', tab, search, page],
    queryFn: async (): Promise<ListData> =>
      (await api.get('/inquiries', {
        params: { status: tab === 'all' ? undefined : tab, search: search || undefined, page, limit: 15 },
      })).data.data,
    placeholderData: (prev) => prev,
  });

  const download = async (inq: Inquiry) => {
    const res = await api.get(`/inquiries/${inq._id}/attachment`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = inq.attachment?.originalName || 'attachment';
    a.click();
    URL.revokeObjectURL(url);
  };

  const items = data?.items ?? [];
  const counts = data?.counts;
  const total = data?.total ?? 0;
  const pipeline = (counts?.contacted ?? 0) + (counts?.qualified ?? 0) + (counts?.proposal ?? 0);
  const start = total === 0 ? 0 : (page - 1) * 15 + 1;
  const end = Math.min(page * 15, total);

  const stats = [
    { label: 'Total leads', value: data ? total : null, icon: Inbox, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25' },
    { label: 'New', value: counts ? counts.new ?? 0 : null, icon: Sparkles, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'In pipeline', value: counts ? pipeline : null, icon: MessageSquare, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
    { label: 'Won', value: counts ? counts.won ?? 0 : null, icon: Star, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25' },
  ];

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Inbox className="w-5 h-5 text-accent-gold" /></span>
            Leads & Inquiries
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Corporate website contact forms and career applications</p>
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
            placeholder="Search name, email, company…"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200',
                tab === t.key
                  ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              {t.label}
              <span className="ml-1.5 opacity-70 tabular-nums">
                {t.key === 'all' ? (data ? total : '…') : (counts ? counts[t.key] ?? 0 : '…')}
              </span>
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
              <div className="flex-1 space-y-2"><div className="h-3.5 w-44 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-60 rounded bg-white/[0.04] animate-pulse" /></div>
              <div className="hidden md:block h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-8 w-20 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-12 text-center animate-fade-in">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
            <Inbox className="w-6 h-6 text-accent-gold" />
          </div>
          <p className="text-white font-semibold">No inquiries found</p>
          <p className="mt-1 text-sm text-zinc-500">Submissions from the corporate website appear here instantly.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden animate-fade-in">
          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_1.2fr_1fr_auto] gap-4 px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Lead</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">About</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Actions</p>
          </div>

          {items.map((q, i) => {
            const m = meta(q.status);
            return (
              <div
                key={q._id}
                onClick={() => setOpenId(q._id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1.2fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] cursor-pointer transition-colors animate-fade-in relative"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-sm font-bold ring-2', m.ring)}>
                      {q.name[0]?.toUpperCase()}
                    </div>
                    <span className={cn('absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-base-950', m.dot)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-accent-gold transition-colors">{q.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{q.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className="text-[11px] text-zinc-600">{rel(q.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block min-w-0">
                  <span className={cn('inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-semibold', SUBJECT_TONE[q.subject] ?? SUBJECT_TONE.other)}>
                    {SUBJECT_LABEL[q.subject] ?? q.subject}
                  </span>
                  <p className="text-xs text-zinc-500 truncate mt-1.5">{q.service || q.role || q.company || '—'}</p>
                </div>
                <div className="hidden md:block">
                  <Badge variant={m.badge}>{m.label}</Badge>
                  <p className="text-[11px] text-zinc-600 mt-1.5">{rel(q.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 justify-start md:justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenId(q._id); }}
                    title="View details"
                    className="p-2 rounded-lg text-zinc-500 hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {q.attachment && (
                    <button
                      onClick={(e) => { e.stopPropagation(); download(q); }}
                      title="Download attachment"
                      className="p-2 rounded-lg text-zinc-500 hover:text-accent-gold hover:bg-accent-gold/10 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
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
            Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span> leads
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

      <LeadDrawer
        leadId={openId}
        canManage={can('leads.manage')}
        onClose={() => setOpenId(null)}
        onDownload={download}
      />
    </div>
  );
}

/* ===================== DRAWER ===================== */
function LeadDrawer({ leadId, canManage, onClose, onDownload }: {
  leadId: string | null;
  canManage: boolean;
  onClose: () => void;
  onDownload: (q: Inquiry) => void;
}) {
  const qc = useQueryClient();
  const [shown, setShown] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async (): Promise<Inquiry> => (await api.get(`/inquiries/${leadId}`)).data.data,
    enabled: !!leadId,
  });

  useEffect(() => {
    if (!leadId) { setShown(false); setStatus(''); setNote(''); setErr(''); setSaved(false); return; }
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, [leadId]);

  const mut = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (status) body.status = status;
      if (note.trim()) body.note = note.trim();
      await api.put(`/inquiries/${leadId}`, body);
    },
    onSuccess: () => {
      setStatus(''); setNote(''); setErr(''); setSaved(true);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      setTimeout(() => setSaved(false), 2200);
    },
    onError: (e: unknown) => {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed');
    },
  });

  if (!leadId) return null;
  const m = lead ? meta(lead.status) : null;

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-brand-navy/70 backdrop-blur-sm transition-opacity duration-300', shown ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] flex flex-col bg-brand-navy border-l border-white/[0.1] transition-transform duration-300 ease-out',
          shown ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(46,107,255,0.16),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-accent-gold/50 via-accent-blue/30 to-transparent pointer-events-none" />

        {/* header */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {isLoading || !lead || !m ? (
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] animate-pulse" />
              ) : (
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-xl font-bold ring-2', m.ring)}>
                  {lead.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                {isLoading || !lead || !m ? (
                  <div className="space-y-2"><div className="h-4 w-36 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-48 rounded bg-white/[0.04] animate-pulse" /></div>
                ) : (
                  <>
                    <p className="text-lg font-bold text-white truncate">{lead.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{lead.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold', SUBJECT_TONE[lead.subject] ?? SUBJECT_TONE.other)}>
                        {SUBJECT_LABEL[lead.subject] ?? lead.subject}
                      </span>
                      {lead.source && <span className="text-[10px] text-zinc-600 uppercase tracking-wider">via {lead.source}</span>}
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

        {/* body */}
        <div className="relative flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {isLoading || !lead ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
              <div className="h-28 rounded-xl bg-white/[0.03] animate-pulse" />
            </div>
          ) : (
            <>
              {/* contact grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Mail, label: 'Email', value: lead.email },
                  { icon: Phone, label: 'Phone', value: lead.phone || '—' },
                  { icon: Building2, label: 'Company', value: lead.company || '—' },
                  { icon: Wallet, label: 'Service / Role', value: lead.service || lead.role || '—' },
                  { icon: Wallet, label: 'Budget', value: lead.budget || '—' },
                  { icon: CalendarClock, label: 'Timeline', value: lead.timeline || '—' },
                  { icon: Globe, label: 'Source', value: lead.source },
                  { icon: Clock, label: 'Received', value: formatDate(lead.createdAt) },
                ].map((r) => (
                  <div key={r.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <r.icon className="w-3 h-3 text-accent-gold/70" /> {r.label}
                    </p>
                    <p className="mt-1.5 text-xs text-white font-medium break-all line-clamp-2">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* estimate */}
              {lead.estimate?.platform && (
                <div className="p-4 rounded-xl border border-accent-violet/30 bg-accent-violet/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,216,111,0.1),transparent_60%)]" />
                  <p className="relative text-sm text-white font-medium flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent-gold" /> Cost estimator submission
                  </p>
                  <p className="relative text-zinc-400 text-xs mt-1.5 leading-relaxed">
                    Platform: <span className="text-white">{lead.estimate.platform}</span>
                    {lead.estimate.features?.length ? <> · Features: <span className="text-white">{lead.estimate.features.join(', ')}</span></> : ''}
                    {lead.estimate.complexity ? <> · Complexity: <span className="text-white">{lead.estimate.complexity}</span></> : ''}
                    {lead.estimate.timeline ? <> · Pace: <span className="text-white">{lead.estimate.timeline}</span></> : ''}
                  </p>
                </div>
              )}

              {/* message */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-semibold mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-accent-gold/70" /> Message
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                  {lead.message}
                </p>
              </div>

              {/* attachment */}
              {lead.attachment && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="w-9 h-9 rounded-lg bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{lead.attachment.originalName}</p>
                    <p className="text-[11px] text-zinc-500">{(lead.attachment.size / 1024).toFixed(0)} KB · {lead.attachment.mimetype}</p>
                  </div>
                  <button onClick={() => onDownload(lead)} className="btn-ghost !px-3 !py-1.5 !text-xs hover:border-accent-gold/40 hover:text-accent-gold">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}

              {/* notes */}
              {lead.notes?.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">Internal notes ({lead.notes.length})</p>
                  {lead.notes.map((n, i) => (
                    <div key={i} className="relative pl-5 text-sm">
                      <span className={cn('absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full', i === 0 ? 'bg-accent-gold shadow-glow-gold' : 'bg-brand-blue/70')} />
                      {i < lead.notes.length - 1 && <span className="absolute left-[4.5px] top-5 bottom-[-14px] w-px bg-gradient-to-b from-accent-gold/40 to-transparent" />}
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                        <p className="text-zinc-300">{n.body}</p>
                        <p className="text-[11px] text-zinc-600 mt-1.5">{n.by} · {formatDate(n.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* footer update */}
        {lead && (
          <div className="relative shrink-0 border-t border-white/[0.08] p-4 bg-brand-navy/80 backdrop-blur">
            {canManage ? (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="glass-input w-full sm:w-36 !py-2.5 text-xs"
                  >
                    <option value="">Status — keep</option>
                    {(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as StatusKey[]).map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="glass-input flex-1 !py-2.5 text-xs"
                    placeholder="Add an internal note…"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (status || note.trim())) mut.mutate(); }}
                  />
                  <button
                    onClick={() => { if (status || note.trim()) mut.mutate(); }}
                    disabled={mut.isPending || (!status && !note.trim())}
                    className="btn-gold !py-2.5 !text-xs whitespace-nowrap disabled:opacity-40 shrink-0"
                  >
                    {mut.isPending ? 'Saving…' : <><Send className="w-3.5 h-3.5" /> Update</>}
                  </button>
                </div>
                {err && <p className="text-xs text-accent-red">{err}</p>}
                {saved && !err && (
                  <p className="text-xs text-accent-green flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green" /> Saved — lead & notes refreshed
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 text-center">You have read-only access to leads.</p>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
