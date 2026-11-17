import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserX, Search, CheckCircle, XCircle, Clock, Eye,
  ChevronLeft, ChevronRight, Inbox, AlertTriangle, ShieldAlert, Trash2,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal, EmptyState } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface DelUser {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  status?: string;
  createdAt?: string;
}
interface DelRow {
  _id: string;
  user?: DelUser | null;
  name: string;
  idNo: string;
  phone: string;
  email: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  reviewedAt?: string;
  createdAt: string;
}
interface ListData {
  requests: DelRow[];
  total: number;
  counts: Record<string, number>;
  page: number;
  pages: number;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

const STATUS_META: Record<string, { label: string; badge: 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Pending', badge: 'warning' },
  approved: { label: 'Deleted', badge: 'success' },
  rejected: { label: 'Rejected', badge: 'danger' },
};
const meta = (s: string) => STATUS_META[s] ?? STATUS_META.pending;

export default function DeletionRequests() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deletion-requests', search, status, page],
    queryFn: async (): Promise<ListData> =>
      (await api.get('/admin/deletion-requests', { params: { search, status, page, limit: 20 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const rows = data?.requests ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * 20 + 1;
  const end = Math.min(page * 20, total);

  const stats = [
    { label: 'Pending review', value: data ? counts.pending ?? 0 : null, icon: Clock, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25' },
    { label: 'Accounts deleted', value: data ? counts.approved ?? 0 : null, icon: CheckCircle, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
    { label: 'Rejected', value: data ? counts.rejected ?? 0 : null, icon: XCircle, chip: 'bg-accent-red/15 text-accent-red border-accent-red/25' },
    { label: 'Total requests', value: data ? (counts.pending ?? 0) + (counts.approved ?? 0) + (counts.rejected ?? 0) : null, icon: UserX, chip: 'bg-accent-blue/15 text-accent-blue border-brand-blue/25' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-red/10 border border-accent-red/20"><UserX className="w-5 h-5 text-accent-red" /></span>
            Deletion Requests
          </h1>
          <p className="mt-1.5 text-sm text-faint">Review account deletion requests — approve permanently deletes the account, reject keeps it active</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-faint">
          <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" /> {counts.pending ?? 0} awaiting review
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={s.label} className="glass p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cn('p-2.5 rounded-xl border shrink-0', s.chip)}><s.icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-faint font-semibold">{s.label}</p>
              <p className="text-xl font-extrabold text-heading tabular-nums leading-tight">{s.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="field-gold !py-2.5 pl-10"
            placeholder="Search by name, email, phone or ID…"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-overlay/[0.05] border border-overlay/[0.08] overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStatus(t.key); setPage(1); }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200',
                status === t.key
                  ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                  : 'text-muted hover:text-heading hover:bg-overlay/[0.06]'
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
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-overlay/[0.05] last:border-0">
              <div className="w-10 h-10 rounded-xl bg-overlay/[0.06] animate-pulse" />
              <div className="flex-1 space-y-2"><div className="h-3.5 w-40 rounded bg-overlay/[0.06] animate-pulse" /><div className="h-3 w-56 rounded bg-overlay/[0.04] animate-pulse" /></div>
              <div className="hidden md:block h-5 w-20 rounded-full bg-overlay/[0.06] animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-overlay/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No deletion requests found" sub={status === 'pending' ? 'Nothing is waiting for review right now' : 'Try adjusting search or filters'} />
      ) : (
        <div className="glass overflow-hidden animate-fade-in">
          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_1.3fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-overlay/[0.08] bg-overlay/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">User</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">ID & Phone</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Submitted</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Status</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint text-right">Action</p>
          </div>

          {rows.map((r, i) => {
            const m = meta(r.status);
            return (
              <div
                key={r._id}
                onClick={() => setReviewId(r._id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1.3fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-overlay/[0.05] last:border-0 hover:bg-overlay/[0.035] cursor-pointer transition-colors animate-fade-in"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red/80 to-accent-violet/80 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {r.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-heading truncate group-hover:text-accent-gold transition-colors">{r.name}</p>
                    <p className="text-xs text-faint truncate">{r.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className="text-[11px] text-dim">{r.idNo} · {r.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block min-w-0">
                  <p className="text-sm text-body truncate font-medium">{r.idNo}</p>
                  <p className="text-xs text-faint truncate mt-0.5">{r.phone}</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs text-body" title={formatDate(r.createdAt)}>{formatDate(r.createdAt)}</p>
                </div>
                <div className="hidden md:block">
                  <Badge variant={m.badge}>{m.label}</Badge>
                </div>
                <div className="flex justify-start md:justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setReviewId(r._id); }}
                    title="Review request"
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
          <p className="text-xs text-faint">
            Showing <span className="text-body font-medium">{start}–{end}</span> of <span className="text-body font-medium">{total}</span> requests
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-faint px-2">Page {page} / {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ReviewModal requestId={reviewId} onClose={() => setReviewId(null)} />
    </div>
  );
}

/* ===================== REVIEW MODAL ===================== */
function ReviewModal({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const { data: r, isLoading } = useQuery({
    queryKey: ['deletion-request', requestId],
    queryFn: async (): Promise<DelRow> => (await api.get(`/admin/deletion-requests/${requestId}`)).data.data,
    enabled: !!requestId,
    staleTime: 0,
  });

  const mut = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' }) =>
      api.put(`/admin/deletion-requests/${requestId}`, { action, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deletion-requests'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setReason('');
      setConfirmApprove(false);
      onClose();
    },
  });

  const allowed = can('users.update');
  const m = r ? meta(r.status) : null;
  const userStatus = r?.user?.status;
  const open = !!requestId;

  const close = () => {
    setConfirmApprove(false);
    setReason('');
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={r ? `Deletion request — ${r.name}` : 'Deletion request'}>
      {isLoading || !r || !m ? (
        <div className="space-y-4">
          <div className="h-16 rounded-xl bg-overlay/[0.04] animate-pulse" />
          <div className="h-24 rounded-xl bg-overlay/[0.05] animate-pulse" />
          <div className="h-10 rounded-xl bg-overlay/[0.04] animate-pulse" />
        </div>
      ) : confirmApprove ? (
        /* ---- Danger confirm (approve) ---- */
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-red/10 border border-accent-red/30">
            <span className="w-11 h-11 rounded-xl bg-accent-red/20 border border-accent-red/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-accent-red" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-heading">Permanently delete this account?</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                <span className="text-body font-medium">{r.name}</span> ({r.email}) will be deleted immediately.
                Personal details are removed, all profile files are erased and the user can never sign in again.
                Wallet and transaction records are kept for audit. <span className="text-accent-red font-semibold">This cannot be undone.</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmApprove(false)}
              disabled={mut.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-overlay/[0.06] text-body border border-overlay/[0.1] hover:bg-overlay/[0.1] transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => mut.mutate({ action: 'approve' })}
              disabled={!allowed || mut.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-red text-white hover:bg-accent-red/90 shadow-[0_4px_14px_rgba(239,68,68,0.35)] transition-all active:scale-[0.98] disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> {mut.isPending ? 'Deleting…' : 'Yes, delete account'}
            </button>
          </div>
        </div>
      ) : (
        /* ---- Request details + actions ---- */
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-overlay/[0.04] border border-overlay/[0.08]">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white font-bold shrink-0">
              {r.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-heading">{r.name}</p>
                <Badge variant={m.badge}>{m.label}</Badge>
                {userStatus && (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-accent-violet/10 text-accent-violet border-accent-violet/25">
                    account: {userStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-faint mt-0.5 break-all">{r.email} · {r.phone}</p>
              <p className="text-[11px] text-dim mt-1">ID: <span className="text-muted font-medium">{r.idNo}</span> · Submitted {formatDate(r.createdAt)}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-overlay/[0.03] border border-overlay/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1.5">Notes {r.notes ? '' : '(none)'}</p>
            <p className="text-sm text-body leading-relaxed">{r.notes || '—'}</p>
          </div>

          {r.status === 'rejected' && r.rejectReason && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/25 text-xs text-accent-red">
              Rejected earlier — Reason: {r.rejectReason}
            </div>
          )}

          {r.status === 'pending' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted">Reason (optional — required context for reject, saved with the decision)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="glass-input mt-1"
                  placeholder="e.g. Verification failed, suspicious activity…"
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => mut.mutate({ action: 'reject' })}
                  disabled={!allowed || mut.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4" /> {mut.isPending ? 'Saving…' : 'Reject'}
                </button>
                <button
                  onClick={() => setConfirmApprove(true)}
                  disabled={!allowed || mut.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  <UserX className="w-4 h-4" /> Approve
                </button>
              </div>
            </>
          )}

          {!allowed && r.status === 'pending' && (
            <p className="text-[11px] text-center text-dim inline-flex items-center justify-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" /> You don't have permission to review deletion requests
            </p>
          )}

          {r.status !== 'pending' && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-overlay/[0.04] border border-overlay/[0.07] text-xs text-faint">
              <ShieldAlert className="w-3.5 h-3.5" />
              Reviewed on {r.reviewedAt ? formatDate(r.reviewedAt) : '—'} — no further action available
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
