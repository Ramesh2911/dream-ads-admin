import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Clapperboard, FolderOpen, Image as ImageIcon, Megaphone, Plus, Pencil, Trash2,
  Eye, Heart, Star, Flame, Search, Inbox, Crown, Layers, PlayCircle, Save,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatCoins, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface VideoItem {
  _id: string; title: string; url: string; thumbnail: string; description?: string;
  category: { _id: string; name: string } | null;
  rewardCoins: number; rewardWallet: string; status: string;
  isFeatured: boolean; isTrending: boolean; views: number; likes: number; createdAt: string;
}
interface VideosData { videos: VideoItem[]; total: number; page: number; pages: number; counts: Record<string, number> }
interface CatItem { _id: string; name: string; slug: string; icon?: string; order: number; isActive: boolean; videoCount: number }
interface BannerItem { _id: string; title: string; imageUrl: string; targetUrl?: string; order: number; isActive: boolean; startsAt?: string; endsAt?: string }
interface PlacementItem { _id: string; name: string; format: string; placementKey: string; enabled: boolean; frequencyCap?: number; network?: string; unitId?: string }
interface ContentStats {
  totals: {
    videos: number; published: number; draft: number; archived: number;
    featured: number; trending: number;
    categoriesActive: number; categoriesInactive: number;
    bannersActive: number; bannersTotal: number;
    adsEnabled: number; adsTotal: number;
  };
  days: { date: string; created: number }[];
  topCategories: { categoryId: string | null; name: string; count: number }[];
}

const V_STATUS: Record<string, { cls: string; dot: string }> = {
  published: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  draft: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  archived: { cls: 'text-zinc-400 bg-white/[0.06] border-white/10', dot: 'bg-zinc-500' },
};
const FORMAT_TONE: Record<string, { cls: string; icon: typeof ImageIcon }> = {
  banner: { cls: 'from-brand-blue/25 to-brand-blue/5 text-accent-blue', icon: ImageIcon },
  interstitial: { cls: 'from-accent-violet/25 to-accent-violet/5 text-accent-violet', icon: Layers },
  rewarded: { cls: 'from-accent-green/25 to-accent-green/5 text-accent-green', icon: PlayCircle },
};
const tooltipStyle = { background: '#0A1540', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 } as const;

type TabKey = 'videos' | 'categories' | 'banners' | 'ads';

export default function Content() {
  const [tab, setTab] = useState<TabKey>('videos');
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['content-stats'],
    queryFn: async (): Promise<ContentStats> => (await api.get('/admin/content-stats')).data.data,
  });

  const t = stats?.totals;
  const chips = [
    { label: 'Videos', value: stats ? t!.videos : null, icon: Clapperboard, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: stats ? `${t!.published} published · ${t!.draft} draft` : '' },
    { label: 'Categories', value: stats ? t!.categoriesActive : null, icon: FolderOpen, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: stats ? `${t!.categoriesInactive} inactive` : '' },
    { label: 'Featured + Trending', value: stats ? `${t!.featured}+${t!.trending}` : null, icon: Star, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25', sub: 'spotlight flags' },
    { label: 'Ad slots enabled', value: stats ? `${t!.adsEnabled}/${t!.adsTotal}` : null, icon: Megaphone, chip: 'bg-accent-pink/15 text-accent-pink border-accent-pink/25', sub: stats ? `${t!.bannersActive} live banners` : '' },
  ];

  const chartData = (stats?.days ?? []).map((p) => ({
    ...p,
    label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  const topCats = stats?.topCategories ?? [];
  const maxCat = Math.max(1, ...topCats.map((c) => c.count));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Clapperboard className="w-5 h-5 text-accent-gold" /></span>
            Content & Ads
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Manage videos, categories, banners and ad placements</p>
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

      {/* chart + top categories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Clapperboard className="w-4 h-4 text-accent-gold" /></span>
            <h3 className="font-semibold text-white">Videos added · last 7 days</h3>
          </div>
          {statsLoading ? (
            <div className="h-[230px] rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="cntBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD86F" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2E6BFF" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#52525b', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="created" name="Videos" fill="url(#cntBar)" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="lg:col-span-2 glass p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Crown className="w-4 h-4 text-accent-blue" /></span>
            <h3 className="font-semibold text-white">Top categories</h3>
          </div>
          {statsLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>}
          {!statsLoading && topCats.length === 0 && <p className="text-sm text-zinc-500 py-8 text-center">No categorized videos yet.</p>}
          <div className="space-y-2.5">
            {topCats.map((c, i) => (
              <div key={c.categoryId ?? `c-${i}`} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-accent-blue opacity-15" style={{ width: `${Math.max(6, Math.round((c.count / maxCat) * 100))}%` }} />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-accent-gold shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-500">{c.count} videos</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-fit mb-6 animate-fade-in">
        {([
          ['videos', 'Videos', Clapperboard],
          ['categories', 'Categories', FolderOpen],
          ['banners', 'Banners', ImageIcon],
          ['ads', 'Ad placements', Megaphone],
        ] as const).map(([k, l, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all',
              tab === k
                ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 shadow-glow-gold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
      </div>

      {tab === 'videos' && <VideosTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'banners' && <BannersTab />}
      {tab === 'ads' && <AdsTab />}
    </div>
  );
}

function useInvalidateContent() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['content-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-videos'] });
    qc.invalidateQueries({ queryKey: ['admin-categories'] });
    qc.invalidateQueries({ queryKey: ['admin-banners'] });
    qc.invalidateQueries({ queryKey: ['ad-placements'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['banners'] });
  };
}

const emptyVideo = { title: '', url: '', thumbnail: '', description: '', category: '', rewardCoins: '10', rewardWallet: 'video', status: 'draft', isFeatured: false, isTrending: false };

function VideosTab() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VideoItem | null>(null);
  const [form, setForm] = useState(emptyVideo);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<VideoItem | null>(null);
  const { can } = useAuth();
  const manage = can('content.manage');
  const invalidate = useInvalidateContent();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-videos', status, search, page],
    queryFn: async (): Promise<VideosData> =>
      (await api.get('/admin/videos', { params: { status: status || undefined, search: search || undefined, page, limit: 12 } })).data.data,
    placeholderData: (prev) => prev,
  });
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<{ categories: { _id: string; name: string }[] }> => (await api.get('/categories')).data.data,
    enabled: formOpen,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/admin/videos', { ...form, rewardCoins: Number(form.rewardCoins) }),
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not create video'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/videos/${editing!._id}`, { ...form, rewardCoins: Number(form.rewardCoins) }),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save video'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/videos/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const openCreate = () => { setEditing(null); setForm(emptyVideo); setFormErr(''); setFormOpen(true); };
  const openEdit = (v: VideoItem) => {
    setEditing(v);
    setForm({
      title: v.title, url: v.url, thumbnail: v.thumbnail, description: v.description ?? '',
      category: v.category?._id ?? '', rewardCoins: String(v.rewardCoins), rewardWallet: v.rewardWallet,
      status: v.status, isFeatured: v.isFeatured, isTrending: v.isTrending,
    });
    setFormErr(''); setFormOpen(true);
  };
  const valid = form.title.trim() && form.url.trim() && form.thumbnail.trim() && form.category && !(createMut.isPending || updateMut.isPending);

  const items = data?.videos ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-white/[0.08]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="field-gold !py-2 pl-10" placeholder="Search by title…" />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              {[{ k: '', l: 'All' }, { k: 'published', l: 'Published' }, { k: 'draft', l: 'Drafts' }, { k: 'archived', l: 'Archived' }].map((s) => (
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
              <button onClick={openCreate} className="btn-gold !py-2 px-3.5 text-xs"><Plus className="w-3.5 h-3.5" /> Add video</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-56 rounded-2xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-accent-gold" />
            </div>
            <p className="text-white font-semibold">No videos found</p>
            <p className="mt-1 text-sm text-zinc-500">{search || status ? 'Try different filters.' : 'Add your first video to the catalog.'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {items.map((v, i) => (
              <div key={v._id} style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }} className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-accent-gold/30 transition-all animate-fade-in overflow-hidden">
                <div className="relative aspect-video overflow-hidden">
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-base-950/90 via-base-950/20 to-transparent" />
                  <span className={cn(
                    'absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold capitalize backdrop-blur-sm',
                    (V_STATUS[v.status] ?? V_STATUS.draft).cls
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', (V_STATUS[v.status] ?? V_STATUS.draft).dot)} /> {v.status}
                  </span>
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                    {v.isFeatured && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/90 text-base-950 text-[10px] font-bold"><Star className="w-2.5 h-2.5" />F</span>}
                    {v.isTrending && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-red/90 text-white text-[10px] font-bold"><Flame className="w-2.5 h-2.5" />T</span>}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-3 text-[10px] text-zinc-300">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{v.likes}</span>
                    <span className="text-accent-gold font-bold">{formatCoins(v.rewardCoins)}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-white text-sm leading-snug line-clamp-1">{v.title}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.08] text-zinc-400 border border-white/10">
                      {v.category?.name ?? 'Uncategorized'}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-brand-blue/10 text-accent-blue border border-brand-blue/25">
                      {v.rewardWallet} wallet
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <p className="text-[11px] text-zinc-600">{formatDate(v.createdAt)}</p>
                    {manage && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(v)} className="btn-ghost p-1.5 text-accent-blue"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleting(v)} className="btn-ghost p-1.5 text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-white/[0.08]">
            <p className="text-xs text-zinc-500">Page <span className="text-zinc-300 font-medium">{page}</span> of <span className="text-zinc-300 font-medium">{data.pages}</span> · {total} videos</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* add/edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit video' : 'Add video'} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input className="field-gold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Video title" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Video URL *</label>
              <input className="field-gold" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Thumbnail URL *</label>
              <input className="field-gold" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://…jpg" />
            </div>
          </div>
          {form.thumbnail.trim() && (
            <div className="rounded-xl overflow-hidden border border-white/10 aspect-video max-h-40 bg-white/[0.03]">
              <img src={form.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea className="field-gold resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description…" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Category *</label>
              <select className="field-gold" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Pick…</option>
                {cats.data?.categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Reward coins</label>
              <input type="number" min={0} className="field-gold" value={form.rewardCoins} onChange={(e) => setForm({ ...form, rewardCoins: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Wallet</label>
              <select className="field-gold" value={form.rewardWallet} onChange={(e) => setForm({ ...form, rewardWallet: e.target.value })}>
                <option value="video">Video</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Status</label>
              <select className="field-gold" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="w-4 h-4 accent-[#FFD86F]" />
              <span className="text-sm text-zinc-300">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isTrending} onChange={(e) => setForm({ ...form, isTrending: e.target.checked })} className="w-4 h-4 accent-[#F87171]" />
              <span className="text-sm text-zinc-300">Trending</span>
            </label>
          </div>
          {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
            <button onClick={() => setFormOpen(false)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
            <button onClick={() => (editing ? updateMut.mutate() : createMut.mutate())} disabled={!valid} className="btn-gold !py-2 px-4 text-xs disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editing ? 'Save changes' : 'Create video'}
            </button>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete video">
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <img src={deleting.thumbnail} alt="" className="w-14 h-9 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{deleting.title}</p>
                <p className="text-xs text-zinc-500">{deleting.views} views · {deleting.likes} likes</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400">This permanently removes the video and its catalog entry. This cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => delMut.mutate(deleting._id)} disabled={delMut.isPending} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const emptyCat = { name: '', icon: '', order: '0', isActive: true };

function CategoriesTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatItem | null>(null);
  const [form, setForm] = useState(emptyCat);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<CatItem | null>(null);
  const { can } = useAuth();
  const manage = can('content.manage');
  const invalidate = useInvalidateContent();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async (): Promise<{ categories: CatItem[] }> => (await api.get('/admin/categories')).data.data,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/admin/categories', { name: form.name.trim(), icon: form.icon.trim() || undefined, order: Number(form.order), isActive: form.isActive }),
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not create category'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/categories/${editing!._id}`, { name: form.name.trim(), icon: form.icon.trim() || undefined, order: Number(form.order), isActive: form.isActive }),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save category'),
  });
  const toggleMut = useMutation({
    mutationFn: (c: CatItem) => api.put(`/admin/categories/${c._id}`, { isActive: !c.isActive }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const items = data?.categories ?? [];
  const valid = form.name.trim().length >= 2 && !(createMut.isPending || updateMut.isPending);

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.08]">
          <p className="text-sm text-zinc-500"><span className="text-white font-semibold">{items.length}</span> categories · ordered by display order</p>
          {manage && (
            <button onClick={() => { setEditing(null); setForm(emptyCat); setFormErr(''); setFormOpen(true); }} className="btn-gold !py-2 px-3.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New category
            </button>
          )}
        </div>
        {isLoading ? (
          <div>{[0, 1, 2].map((i) => <div key={i} className="h-16 border-b border-white/[0.05] bg-white/[0.02] animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><FolderOpen className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No categories</p>
            <p className="mt-1 text-sm text-zinc-500">Create categories to organize videos.</p>
          </div>
        ) : (
          items.map((c, i) => (
            <div key={c._id} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_auto_auto_auto] gap-2 md:gap-4 items-center px-4 py-3.5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative">
              <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all" />
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center text-lg shrink-0">{c.icon || '📁'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-[11px] text-zinc-600 font-mono truncate">{c.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-400 border border-white/10">order {c.order}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/10 text-accent-blue border border-brand-blue/25">{c.videoCount} videos</span>
              </div>
              {manage ? (
                <button
                  onClick={() => toggleMut.mutate(c)}
                  className={cn('relative w-10 h-6 rounded-full transition-colors border justify-self-start', c.isActive ? 'bg-accent-green/25 border-accent-green/40' : 'bg-white/[0.06] border-white/10')}
                  title={c.isActive ? 'Disable' : 'Enable'}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all shadow', c.isActive ? 'left-5 bg-accent-green' : 'left-0.5 bg-zinc-500')} />
                </button>
              ) : (
                <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Off'}</Badge>
              )}
              {manage && (
                <div className="flex gap-1 justify-self-start md:justify-self-end">
                  <button onClick={() => { setEditing(c); setForm({ name: c.name, icon: c.icon ?? '', order: String(c.order), isActive: c.isActive }); setFormErr(''); setFormOpen(true); }} className="btn-ghost p-1.5 text-accent-blue"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleting(c)} className="btn-ghost p-1.5 text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit category' : 'New category'}>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Name *</label>
            <input className="field-gold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Entertainment" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Icon (emoji)</label>
              <input className="field-gold" maxLength={4} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎬" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Display order</label>
              <input type="number" min={0} className="field-gold" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#FFD86F]" />
            <span className="text-sm text-zinc-300">Active (visible to users)</span>
          </label>
          {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
            <button onClick={() => setFormOpen(false)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
            <button onClick={() => (editing ? updateMut.mutate() : createMut.mutate())} disabled={!valid} className="btn-gold !py-2 px-4 text-xs disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete category">
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Delete <span className="text-white font-semibold">{deleting.name}</span>?
              {deleting.videoCount > 0 && <span className="text-accent-red block mt-2">This category has {deleting.videoCount} video(s) — deletion will be blocked. Reassign them first.</span>}
            </p>
            {delMut.isError && (
              <p className="text-xs text-accent-red">{(delMut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Delete failed'}</p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => delMut.mutate(deleting._id)} disabled={delMut.isPending || deleting.videoCount > 0} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const emptyBanner = { title: '', imageUrl: '', targetUrl: '', order: '0', isActive: true, startsAt: '', endsAt: '' };

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BannersTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [form, setForm] = useState(emptyBanner);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<BannerItem | null>(null);
  const { can } = useAuth();
  const manage = can('content.manage');
  const invalidate = useInvalidateContent();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async (): Promise<{ banners: BannerItem[] }> => (await api.get('/admin/banners')).data.data,
  });

  const body = () => ({
    title: form.title.trim(),
    imageUrl: form.imageUrl.trim(),
    targetUrl: form.targetUrl.trim() || undefined,
    order: Number(form.order),
    isActive: form.isActive,
    startsAt: form.startsAt || undefined,
    endsAt: form.endsAt || undefined,
  });
  const createMut = useMutation({
    mutationFn: () => api.post('/admin/banners', body()),
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not create banner'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/banners/${editing!._id}`, body()),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save banner'),
  });
  const toggleMut = useMutation({
    mutationFn: (b: BannerItem) => api.put(`/admin/banners/${b._id}`, { isActive: !b.isActive }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const items = data?.banners ?? [];
  const valid = form.title.trim().length >= 2 && form.imageUrl.trim().length > 0 && !(createMut.isPending || updateMut.isPending);

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.08]">
          <p className="text-sm text-zinc-500"><span className="text-white font-semibold">{items.filter((b) => b.isActive).length}</span> live of {items.length} banners</p>
          {manage && (
            <button onClick={() => { setEditing(null); setForm(emptyBanner); setFormErr(''); setFormOpen(true); }} className="btn-gold !py-2 px-3.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New banner
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><ImageIcon className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No banners</p>
            <p className="mt-1 text-sm text-zinc-500">Create banners to promote campaigns on home screens.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 p-4">
            {items.map((b, i) => (
              <div key={b._id} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-accent-gold/30 transition-all animate-fade-in overflow-hidden">
                <div className="relative h-32 overflow-hidden">
                  <img src={b.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-base-950/80 to-transparent" />
                  <span className={cn(
                    'absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold backdrop-blur-sm',
                    b.isActive ? 'bg-accent-green/20 text-accent-green border-accent-green/30' : 'bg-white/[0.1] text-zinc-400 border-white/15'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', b.isActive ? 'bg-accent-green' : 'bg-zinc-500')} /> {b.isActive ? 'Live' : 'Off'}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-base-950/70 text-zinc-300 border border-white/10">order {b.order}</span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-white text-sm truncate">{b.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] text-zinc-500">
                    {b.targetUrl && <span className="truncate max-w-[140px]">→ {b.targetUrl}</span>}
                    {b.startsAt && <span>from {formatDate(b.startsAt)}</span>}
                    {b.endsAt && <span>to {formatDate(b.endsAt)}</span>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    {manage ? (
                      <button
                        onClick={() => toggleMut.mutate(b)}
                        className={cn('relative w-10 h-6 rounded-full transition-colors border', b.isActive ? 'bg-accent-green/25 border-accent-green/40' : 'bg-white/[0.06] border-white/10')}
                      >
                        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all shadow', b.isActive ? 'left-5 bg-accent-green' : 'left-0.5 bg-zinc-500')} />
                      </button>
                    ) : <span />}
                    {manage && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(b); setForm({ title: b.title, imageUrl: b.imageUrl, targetUrl: b.targetUrl ?? '', order: String(b.order), isActive: b.isActive, startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt) }); setFormErr(''); setFormOpen(true); }} className="btn-ghost p-1.5 text-accent-blue"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleting(b)} className="btn-ghost p-1.5 text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit banner' : 'New banner'} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input className="field-gold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Campaign title" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Image URL *</label>
              <input className="field-gold" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…jpg" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Target URL</label>
              <input className="field-gold" value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          {form.imageUrl.trim() && (
            <div className="rounded-xl overflow-hidden border border-white/10 h-28 bg-white/[0.03]">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Order</label>
              <input type="number" min={0} className="field-gold" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Starts</label>
              <input type="datetime-local" className="field-gold" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Ends</label>
              <input type="datetime-local" className="field-gold" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[#FFD86F]" />
                <span className="text-sm text-zinc-300">Live</span>
              </label>
            </div>
          </div>
          {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
            <button onClick={() => setFormOpen(false)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
            <button onClick={() => (editing ? updateMut.mutate() : createMut.mutate())} disabled={!valid} className="btn-gold !py-2 px-4 text-xs disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editing ? 'Save changes' : 'Create banner'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete banner">
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <img src={deleting.imageUrl} alt="" className="w-14 h-9 rounded-lg object-cover" />
              <p className="text-sm text-white font-semibold truncate">{deleting.title}</p>
            </div>
            <p className="text-sm text-zinc-400">This permanently removes the banner. This cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => delMut.mutate(deleting._id)} disabled={delMut.isPending} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function AdsTab() {
  const { can } = useAuth();
  const manage = can('ads.manage');
  const invalidate = useInvalidateContent();
  const { data, isLoading } = useQuery({
    queryKey: ['ad-placements'],
    queryFn: async (): Promise<{ placements: PlacementItem[] }> => (await api.get('/admin/ad-placements')).data.data,
  });
  const [drafts, setDrafts] = useState<Record<string, { network: string; unitId: string; frequencyCap: string; enabled: boolean }>>({});
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    if (!data?.placements) return;
    const next: Record<string, { network: string; unitId: string; frequencyCap: string; enabled: boolean }> = {};
    for (const p of data.placements) next[p._id] = { network: p.network ?? '', unitId: p.unitId ?? '', frequencyCap: p.frequencyCap != null ? String(p.frequencyCap) : '', enabled: p.enabled };
    setDrafts(next);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { network: string; unitId: string; frequencyCap: string; enabled: boolean } }) =>
      api.put(`/admin/ad-placements/${id}`, {
        network: d.network.trim() || undefined,
        unitId: d.unitId.trim() || undefined,
        frequencyCap: d.frequencyCap ? Number(d.frequencyCap) : undefined,
        enabled: d.enabled,
      }),
    onSuccess: (_r, vars) => { invalidate(); setSavedId(vars.id); setTimeout(() => setSavedId(''), 1600); },
  });

  const placements = data?.placements ?? [];
  const dirty = (p: PlacementItem) => {
    const d = drafts[p._id];
    if (!d) return false;
    return d.enabled !== p.enabled || d.network !== (p.network ?? '') || d.unitId !== (p.unitId ?? '') || d.frequencyCap !== (p.frequencyCap != null ? String(p.frequencyCap) : '');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass p-4 flex items-start gap-3">
        <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20 shrink-0"><Megaphone className="w-4 h-4 text-accent-gold" /></span>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Configure banner, interstitial and rewarded ad placements. Ads must comply with network policy — no hidden or forced background ads. Disabling a slot stops it from being requested by apps immediately.
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : placements.length === 0 ? (
        <div className="glass p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Megaphone className="w-6 h-6 text-accent-gold" /></div>
          <p className="text-white font-semibold">No ad placements</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {placements.map((p, i) => {
            const tone = FORMAT_TONE[p.format] ?? FORMAT_TONE.banner;
            const Icon = tone.icon;
            const d = drafts[p._id] ?? { network: '', unitId: '', frequencyCap: '', enabled: p.enabled };
            return (
              <div key={p._id} style={{ animationDelay: `${i * 50}ms` }} className="glass p-5 animate-fade-in relative overflow-hidden">
                <div className="absolute -top-14 -right-14 w-36 h-36 rounded-full bg-accent-gold/10 blur-2xl opacity-60" />
                <div className="relative flex items-start justify-between mb-4">
                  <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', tone.cls)}><Icon className="w-5 h-5" /></div>
                  <button
                    disabled={!manage}
                    onClick={() => setDrafts({ ...drafts, [p._id]: { ...d, enabled: !d.enabled } })}
                    className={cn('relative w-10 h-6 rounded-full transition-colors border', d.enabled ? 'bg-accent-green/25 border-accent-green/40' : 'bg-white/[0.06] border-white/10', !manage && 'opacity-50 cursor-not-allowed')}
                  >
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all shadow', d.enabled ? 'left-5 bg-accent-green' : 'left-0.5 bg-zinc-500')} />
                  </button>
                </div>
                <p className="font-semibold text-white text-sm">{p.name}</p>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{p.placementKey}</p>
                <span className={cn('mt-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border', tone.cls.includes('blue') ? 'bg-brand-blue/10 text-accent-blue border-brand-blue/25' : tone.cls.includes('green') ? 'bg-accent-green/10 text-accent-green border-accent-green/25' : 'bg-accent-violet/10 text-accent-violet border-accent-violet/25')}>
                  {p.format}
                </span>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Network</label>
                    <input disabled={!manage} className="field-gold !py-1.5 text-xs disabled:opacity-50" value={d.network} onChange={(e) => setDrafts({ ...drafts, [p._id]: { ...d, network: e.target.value } })} placeholder="admob / unity…" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Unit ID</label>
                    <input disabled={!manage} className="field-gold !py-1.5 text-xs font-mono disabled:opacity-50" value={d.unitId} onChange={(e) => setDrafts({ ...drafts, [p._id]: { ...d, unitId: e.target.value } })} placeholder="ca-app-pub-…" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Frequency cap (per session)</label>
                    <input disabled={!manage} type="number" min={0} className="field-gold !py-1.5 text-xs disabled:opacity-50" value={d.frequencyCap} onChange={(e) => setDrafts({ ...drafts, [p._id]: { ...d, frequencyCap: e.target.value } })} placeholder="e.g. 3" />
                  </div>
                </div>
                {manage && (
                  <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <span className={cn('text-[10px] font-semibold', dirty(p) ? 'text-accent-gold' : 'text-zinc-600')}>
                      {dirty(p) ? 'Unsaved changes' : savedId === p._id ? 'Saved ✓' : 'Up to date'}
                    </span>
                    <button
                      onClick={() => saveMut.mutate({ id: p._id, d })}
                      disabled={!dirty(p) || saveMut.isPending}
                      className={cn('btn !py-1.5 px-3 text-xs', dirty(p) ? 'btn-gold' : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed')}
                    >
                      <Save className="w-3 h-3" /> {saveMut.isPending && saveMut.variables?.id === p._id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
