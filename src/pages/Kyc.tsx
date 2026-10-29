import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, Search, CheckCircle, XCircle, Clock, Eye, UserCheck,
  ChevronLeft, ChevronRight, FileX, Inbox, ShieldAlert,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal, EmptyState } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface KycRow {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  dob?: string;
  referralCode: string;
  status: string;
  kycStatus: string;
  avatar?: string;
  aadharFront?: string;
  aadharBack?: string;
  createdAt: string;
}
interface ListData {
  users: KycRow[];
  total: number;
  counts: Record<string, number>;
  page: number;
  pages: number;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

const KYC_META: Record<string, { label: string; badge: 'success' | 'warning' | 'danger' | 'info' }> = {
  none: { label: 'Not submitted', badge: 'info' },
  pending: { label: 'Pending', badge: 'warning' },
  verified: { label: 'Verified', badge: 'success' },
  rejected: { label: 'Rejected', badge: 'danger' },
};
const meta = (s: string) => KYC_META[s] ?? KYC_META.none;

export default function Kyc() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kyc', search, status, page],
    queryFn: async (): Promise<ListData> =>
      (await api.get('/admin/users/kyc', { params: { search, status, page, limit: 20 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const users = data?.users ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  const stats = [
    { label: 'Pending review', value: data ? counts.pending ?? 0 : null, icon: Clock, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
    { label: 'Verified', value: data ? counts.verified ?? 0 : null, icon: CheckCircle, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'Rejected', value: data ? counts.rejected ?? 0 : null, icon: XCircle, chip: 'bg-accent-red/15 text-accent-red border-accent-red/25' },
    { label: 'Total submitted', value: data ? (counts.pending ?? 0) + (counts.verified ?? 0) + (counts.rejected ?? 0) : null, icon: BadgeCheck, chip: 'bg-accent-blue/15 text-accent-blue border-brand-blue/25' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20"><BadgeCheck className="w-5 h-5 text-accent-blue" /></span>
            KYC Verification
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Review Aadhar documents and approve or reject identity verification</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" /> {counts.pending ?? 0} awaiting review
        </div>
      </div>

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

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="field-gold !py-2.5 pl-10"
            placeholder="Search by name, email or mobile…"
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
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="glass overflow-hidden animate-fade-in">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.05] last:border-0">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
              <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-white/[0.06] animate-pulse" /><div className="h-3 w-56 rounded bg-white/[0.04] animate-pulse" /></div>
              <div className="hidden md:block h-5 w-20 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No KYC submissions found" sub={status === 'pending' ? 'Nothing is waiting for review right now' : 'Try adjusting search or filters'} />
      ) : (
        <div className="glass overflow-hidden animate-fade-in">
          <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">User</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">KYC status</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Documents</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Submitted</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Action</p>
          </div>

          {users.map((u, i) => {
            const m = meta(u.kycStatus);
            const docs = (u.aadharFront ? 1 : 0) + (u.aadharBack ? 1 : 0);
            return (
              <div
                key={u._id}
                onClick={() => setReviewId(u._id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] cursor-pointer transition-colors animate-fade-in"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-accent-gold transition-colors">{u.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email || u.mobile || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className="text-[11px] text-zinc-600">{docs}/2 docs</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block"><Badge variant={m.badge}>{m.label}</Badge></div>
                <div className="hidden md:flex items-center gap-1.5">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', u.aadharFront ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-white/[0.04] text-zinc-600 border-white/[0.08]')}>
                    {u.aadharFront ? <CheckCircle className="w-3 h-3" /> : <FileX className="w-3 h-3" />} Front
                  </span>
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', u.aadharBack ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-white/[0.04] text-zinc-600 border-white/[0.08]')}>
                    {u.aadharBack ? <CheckCircle className="w-3 h-3" /> : <FileX className="w-3 h-3" />} Back
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs text-zinc-300" title={formatDate(u.createdAt)}>{formatDate(u.createdAt)}</p>
                </div>
                <div className="flex justify-start md:justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setReviewId(u._id); }}
                    title="Review documents"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue/10 text-accent-blue border border-accent-blue/25 hover:bg-accent-blue/20 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <p className="text-xs text-zinc-500">
            Showing <span className="text-zinc-300 font-medium">{start}–{end}</span> of <span className="text-zinc-300 font-medium">{total}</span> users
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

      <ReviewModal userId={reviewId} onClose={() => setReviewId(null)} />
    </div>
  );
}

/* ===================== REVIEW MODAL ===================== */
function DocImage({ userId, kind, alt }: { userId: string; kind: 'aadharFront' | 'aadharBack'; alt: string }) {
  const [big, setBig] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kyc-doc', userId, kind],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${userId}/kyc-doc/${kind}`, { responseType: 'blob' });
      return URL.createObjectURL(res.data as Blob);
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading)
    return <div className={cn('rounded-xl bg-white/[0.05] animate-pulse', big ? 'h-[60vh]' : 'h-56')} />;
  if (isError || !data)
    return (
      <div className="h-56 rounded-xl border border-dashed border-white/[0.12] flex flex-col items-center justify-center gap-2 text-zinc-600">
        <FileX className="w-6 h-6" />
        <p className="text-xs">Could not load image</p>
      </div>
    );
  return (
    <button type="button" onClick={() => setBig((v) => !v)} className="block w-full text-left" title={big ? 'Shrink' : 'Enlarge'}>
      <img
        src={data}
        alt={alt}
        className={cn(
          'w-full rounded-xl object-contain bg-black/40 border border-white/[0.08] transition-all cursor-zoom-in',
          big ? 'h-[60vh]' : 'h-56'
        )}
      />
      <p className="text-[10px] text-zinc-600 mt-1 text-center">{big ? 'Click to shrink' : 'Click to enlarge'}</p>
    </button>
  );
}

function ReviewModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['kyc-review', userId],
    queryFn: async (): Promise<KycRow> => (await api.get(`/admin/users/${userId}`)).data.data.user,
    enabled: !!userId,
  });

  const mut = useMutation({
    mutationFn: ({ status }: { status: 'verified' | 'rejected' }) =>
      api.put(`/admin/users/${userId}/kyc`, { status, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setReason('');
      onClose();
    },
  });

  const u = data;
  const m = u ? meta(u.kycStatus) : null;
  const hasDocs = !!u?.aadharFront || !!u?.aadharBack;
  const allowed = can('users.update');

  return (
    <Modal open={!!userId} onClose={onClose} title={u ? `KYC review — ${u.name}` : 'KYC review'}>
      {isLoading || !u || !m ? (
        <div className="space-y-4">
          <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-56 rounded-xl bg-white/[0.05] animate-pulse" />
            <div className="h-56 rounded-xl bg-white/[0.05] animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white font-bold shrink-0">
              {u.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white">{u.name}</p>
                <Badge variant={m.badge}>{m.label}</Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{u.email || '—'} {u.mobile ? `· ${u.mobile}` : ''}</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                DOB: {u.dob ? formatDate(u.dob) : '—'} · Joined {formatDate(u.createdAt)}
              </p>
            </div>
          </div>

          {!hasDocs ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-gold/10 border border-accent-gold/25 text-sm text-accent-gold">
              <ShieldAlert className="w-5 h-5 shrink-0" /> No documents uploaded by this user yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Aadhar front</p>
                {u.aadharFront ? <DocImage userId={u._id} kind="aadharFront" alt="Aadhar front" /> : <MissingDoc />}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Aadhar back</p>
                {u.aadharBack ? <DocImage userId={u._id} kind="aadharBack" alt="Aadhar back" /> : <MissingDoc />}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400">Reason (optional — saved with the decision)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="glass-input mt-1"
              placeholder="e.g. Name mismatch on document"
              maxLength={500}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => mut.mutate({ status: 'rejected' })}
              disabled={!hasDocs || !allowed || mut.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              <XCircle className="w-4 h-4" /> {mut.isPending ? 'Saving…' : 'Reject'}
            </button>
            <button
              onClick={() => mut.mutate({ status: 'verified' })}
              disabled={!hasDocs || !allowed || mut.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              <UserCheck className="w-4 h-4" /> {mut.isPending ? 'Saving…' : 'Approve'}
            </button>
          </div>
          {!allowed && (
            <p className="text-[11px] text-center text-zinc-600 inline-flex items-center justify-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" /> You don't have permission to review KYC
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function MissingDoc() {
  return (
    <div className="h-56 rounded-xl border border-dashed border-white/[0.12] flex flex-col items-center justify-center gap-2 text-zinc-600">
      <FileX className="w-6 h-6" />
      <p className="text-xs">Not uploaded</p>
    </div>
  );
}
