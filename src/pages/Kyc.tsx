import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, Search, CheckCircle, XCircle, Clock, Eye, UserCheck,
  ChevronLeft, ChevronRight, FileX, Inbox, ShieldAlert, X, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, EmptyState } from '../components/ui';
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
  kycDocType?: 'aadhar' | 'pan' | 'voter' | null;
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

const DOC_META: Record<string, { label: string; front: string; back: string }> = {
  aadhar: { label: 'Aadhar', front: 'Aadhar front', back: 'Aadhar back' },
  pan: { label: 'PAN', front: 'PAN front', back: 'PAN back' },
  voter: { label: 'Voter ID', front: 'Voter front', back: 'Voter back' },
};
const docMeta = (t?: string | null) => DOC_META[String(t || 'aadhar')] ?? DOC_META.aadhar;

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
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20"><BadgeCheck className="w-5 h-5 text-accent-blue" /></span>
            KYC Verification
          </h1>
          <p className="mt-1.5 text-sm text-faint">Review Aadhar, PAN and Voter ID documents — approve or reject identity verification</p>
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
            placeholder="Search by name, email or mobile…"
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
      ) : users.length === 0 ? (
        <EmptyState title="No KYC submissions found" sub={status === 'pending' ? 'Nothing is waiting for review right now' : 'Try adjusting search or filters'} />
      ) : (
        <div className="glass overflow-hidden animate-fade-in">
          <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-overlay/[0.08] bg-overlay/[0.02]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">User</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">KYC status</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Documents</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Submitted</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint text-right">Action</p>
          </div>

          {users.map((u, i) => {
            const m = meta(u.kycStatus);
            const dm = docMeta(u.kycDocType);
            const docs = (u.aadharFront ? 1 : 0) + (u.aadharBack ? 1 : 0);
            return (
              <div
                key={u._id}
                onClick={() => setReviewId(u._id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-overlay/[0.05] last:border-0 hover:bg-overlay/[0.035] cursor-pointer transition-colors animate-fade-in"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-heading truncate group-hover:text-accent-gold transition-colors">{u.name}</p>
                    <p className="text-xs text-faint truncate">{u.email || u.mobile || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant={m.badge}>{m.label}</Badge>
                      <span className="text-[11px] text-dim">{dm.label} · {docs}/2 docs</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="flex flex-col gap-1">
                    <Badge variant={m.badge}>{m.label}</Badge>
                    <span className="inline-flex self-start px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-accent-violet/10 text-accent-violet border-accent-violet/25">
                      {dm.label}
                    </span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', u.aadharFront ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-overlay/[0.04] text-dim border-overlay/[0.08]')}>
                    {u.aadharFront ? <CheckCircle className="w-3 h-3" /> : <FileX className="w-3 h-3" />} Front
                  </span>
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', u.aadharBack ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-overlay/[0.04] text-dim border-overlay/[0.08]')}>
                    {u.aadharBack ? <CheckCircle className="w-3 h-3" /> : <FileX className="w-3 h-3" />} Back
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs text-body" title={formatDate(u.createdAt)}>{formatDate(u.createdAt)}</p>
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
          <p className="text-xs text-faint">
            Showing <span className="text-body font-medium">{start}–{end}</span> of <span className="text-body font-medium">{total}</span> users
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

      <ReviewOverlay userId={reviewId} onClose={() => setReviewId(null)} />
    </div>
  );
}

/* ===================== LIGHTBOX ===================== */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  zoomRef.current = zoom;
  posRef.current = pos;
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const vpRef = useRef<HTMLDivElement>(null);

  const clamp = (z: number) => Math.min(5, Math.max(1, z));

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const z0 = zoomRef.current;
      const nz = clamp(z0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      if (nz === z0) return;
      const k = nz / z0;
      const p0 = posRef.current;
      setZoom(nz);
      setPos(nz === 1 ? { x: 0, y: 0 } : { x: cx - (cx - p0.x) * k, y: cy - (cy - p0.y) * k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const bumpZoom = (dir: 1 | -1) => {
    const nz = clamp(zoom * (dir === 1 ? 1.25 : 1 / 1.25));
    setZoom(nz);
    if (nz === 1) setPos({ x: 0, y: 0 });
  };
  const reset = () => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const onDblClick = () => {
    if (zoom > 1) reset();
    else {
      setZoom(2.5);
      setPos({ x: 0, y: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 animate-fade-in">
      <div className="flex items-center justify-between gap-3 shrink-0 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/70">{alt}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => bumpZoom(-1)} disabled={zoom <= 1} title="Zoom out (−)" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-30">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-xs font-bold tabular-nums text-white">{Math.round(zoom * 100)}%</span>
          <button onClick={() => bumpZoom(1)} disabled={zoom >= 5} title="Zoom in (+)" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-30">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={reset} title="Reset" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-30" disabled={zoom === 1 && pos.x === 0 && pos.y === 0}>
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-white/15" />
          <button onClick={onClose} title="Close (Esc)" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={vpRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDblClick}
        className={cn(
          'flex flex-1 touch-none select-none items-center justify-center overflow-hidden',
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        )}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-none will-change-transform"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
        />
      </div>
      <p className="shrink-0 py-2.5 text-center text-[11px] text-white/45">Scroll to zoom · drag to pan · double-click to fit</p>
    </div>
  );
}

/* ===================== REVIEW OVERLAY ===================== */
function DocImage({ userId, kind, alt, onView }: { userId: string; kind: 'aadharFront' | 'aadharBack'; alt: string; onView: (src: string) => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['kyc-doc', userId, kind],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${userId}/kyc-doc/${kind}`, { responseType: 'blob' });
      return URL.createObjectURL(res.data as Blob);
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <div className="h-64 rounded-xl bg-overlay/[0.05] animate-pulse" />;
  if (isError || !data)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-overlay/[0.12] text-dim">
        <FileX className="h-6 w-6" />
        <p className="text-xs">Could not load image</p>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => onView(data)}
      title="Click to view full screen"
      className="group/doc kyc-doc-frame relative block w-full overflow-hidden rounded-xl border border-overlay/[0.08] bg-black/50"
    >
      <img src={data} alt={alt} className="h-64 w-full object-contain" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent py-2 text-[11px] font-semibold text-white/90 opacity-0 transition-opacity group-hover/doc:opacity-100">
        <ZoomIn className="h-3.5 w-3.5" /> Click to zoom
      </span>
    </button>
  );
}

function ReviewOverlay({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const lbRef = useRef(false);
  lbRef.current = !!lightbox;

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lbRef.current) setLightbox(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!userId) return null;

  const u = data;
  const m = u ? meta(u.kycStatus) : null;
  const dm = u ? docMeta(u.kycDocType) : docMeta(null);
  const hasDocs = !!u?.aadharFront || !!u?.aadharBack;
  const allowed = can('users.update');
  const loadingBody = isLoading || !u || !m;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { if (!lightbox) onClose(); }} />
      <div className="glass relative max-h-[92vh] w-full max-w-7xl animate-slide-up overflow-y-auto rounded-2xl border border-overlay/[0.1]">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-overlay/[0.08] bg-panel/95 px-4 py-3.5 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-accent-violet/80 text-sm font-bold text-white">
              {u?.name?.[0]?.toUpperCase() ?? '…'}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-heading">{u ? `KYC review — ${u.name}` : 'KYC review'}</p>
                {u && m && <Badge variant={m.badge}>{m.label}</Badge>}
              </div>
              <p className="truncate text-[11px] text-faint">
                {u ? `${u.email || '—'}${u.mobile ? ` · ${u.mobile}` : ''} · ${dm.label}` : 'Loading applicant…'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost shrink-0 p-2" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
          {/* documents */}
          <div className="min-w-0">
            {loadingBody ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="h-64 rounded-xl bg-overlay/[0.05] animate-pulse" />
                <div className="h-64 rounded-xl bg-overlay/[0.05] animate-pulse" />
              </div>
            ) : !hasDocs ? (
              <div className="flex items-center gap-3 rounded-xl border border-accent-gold/25 bg-accent-gold/10 p-4 text-sm text-accent-gold">
                <ShieldAlert className="h-5 w-5 shrink-0" /> No documents uploaded by this user yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{dm.front}</p>
                  {u?.aadharFront ? (
                    <DocImage userId={u._id} kind="aadharFront" alt={dm.front} onView={(src) => setLightbox({ src, alt: dm.front })} />
                  ) : (
                    <MissingDoc />
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{dm.back}</p>
                  {u?.aadharBack ? (
                    <DocImage userId={u._id} kind="aadharBack" alt={dm.back} onView={(src) => setLightbox({ src, alt: dm.back })} />
                  ) : (
                    <MissingDoc />
                  )}
                </div>
              </div>
            )}
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-dim">
              <ZoomIn className="h-3.5 w-3.5" /> Click a document for full-screen zoom — scroll to zoom, drag to pan, Esc to close
            </p>
          </div>

          {/* right rail */}
          <aside className="flex flex-col gap-4">
            {/* applicant details */}
            <div className="rounded-xl border border-overlay/[0.08] bg-overlay/[0.03] p-4">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Applicant details</p>
              {loadingBody ? (
                <div className="space-y-2.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 rounded-md bg-overlay/[0.05] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(
                    [
                      ['Email', u?.email || '—'],
                      ['Mobile', u?.mobile || '—'],
                      ['DOB', u?.dob ? formatDate(u.dob) : '—'],
                      ['Joined', u ? formatDate(u.createdAt) : '—'],
                      ['Referral code', u?.referralCode || '—'],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3 text-xs">
                      <span className="shrink-0 text-faint">{k}</span>
                      <span className="break-all text-right font-medium text-heading">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* reason */}
            <div>
              <label className="text-xs font-medium text-muted">Reason (optional — saved with the decision)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="glass-input mt-1"
                placeholder="e.g. Name mismatch on document"
                maxLength={500}
              />
            </div>

            {/* actions */}
            <div className="flex gap-3 lg:sticky lg:bottom-0 lg:border-t lg:border-overlay/[0.08] lg:bg-panel/95 lg:pb-1 lg:pt-3 lg:backdrop-blur-xl">
              <button onClick={() => mut.mutate({ status: 'rejected' })} disabled={!hasDocs || !allowed || mut.isPending} className="btn-reject">
                <XCircle className="h-4 w-4" /> {mut.isPending ? 'Saving…' : 'Reject'}
              </button>
              <button onClick={() => mut.mutate({ status: 'verified' })} disabled={!hasDocs || !allowed || mut.isPending} className="btn-approve">
                <UserCheck className="h-4 w-4" /> {mut.isPending ? 'Saving…' : 'Approve'}
              </button>
            </div>
            {!allowed && (
              <p className="inline-flex items-center justify-center gap-1.5 text-center text-[11px] text-dim">
                <Inbox className="h-3.5 w-3.5" /> You don't have permission to review KYC
              </p>
            )}
          </aside>
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function MissingDoc() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-overlay/[0.12] text-dim">
      <FileX className="h-6 w-6" />
      <p className="text-xs">Not uploaded</p>
    </div>
  );
}
