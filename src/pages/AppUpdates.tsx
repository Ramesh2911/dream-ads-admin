import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface AppUpdate {
  _id: string;
  title: string;
  content: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = { title: '', content: '', priority: '1', isActive: true };

export default function AppUpdates() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const editable = can('content.manage');

  const { data, isLoading } = useQuery({
    queryKey: ['app-updates'],
    queryFn: async (): Promise<AppUpdate[]> => (await api.get('/admin/app-updates')).data.data,
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['app-updates'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title.trim(),
        content: form.content.trim(),
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
      };
      return editId
        ? api.put(`/admin/app-updates/${editId}`, body)
        : api.post('/admin/app-updates', body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setError('');
    },
    onError: (err) => setError((err as Error)?.message || 'Save failed'),
  });

  const toggleMut = useMutation({
    mutationFn: (item: AppUpdate) => api.put(`/admin/app-updates/${item._id}`, { isActive: !item.isActive }),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/app-updates/${id}`),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (item: AppUpdate) => {
    setEditId(item._id);
    setForm({
      title: item.title,
      content: item.content,
      priority: String(item.priority),
      isActive: item.isActive,
    });
    setError('');
    setOpen(true);
  };

  const items = data ?? [];
  const valid = form.title.trim().length >= 2 && form.content.trim().length >= 2;

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-brand-blue/10 border border-brand-blue/20"><Sparkles className="w-5 h-5 text-accent-blue" /></span>
            App Updates
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">"What's new" cards shown in the mobile app</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
          </span>
          <button
            onClick={openAdd}
            disabled={!editable}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> New update
          </button>
        </div>
      </div>

      {!editable && (
        <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-accent-violet/10 border border-accent-violet/25 text-sm text-accent-violet">
          <AlertCircle className="w-4 h-4 shrink-0" /> You have <b>content.read</b> only — contact a Super Admin to edit.
        </div>
      )}

      {/* list */}
      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="glass p-10 text-center animate-slide-up">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-semibold">No app updates yet</p>
          <p className="text-xs text-zinc-600 mt-1">Create one to announce new features inside the mobile app.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((u, i) => (
            <div key={u._id} className="glass p-4 sm:p-5 animate-slide-up flex items-start gap-4" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
              <span className="p-2.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-accent-blue" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white text-sm sm:text-base truncate">{u.title}</p>
                  <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Live' : 'Hidden'}</Badge>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500 tabular-nums">
                    prio {u.priority}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1 whitespace-pre-line line-clamp-3">{u.content}</p>
                <p className="text-[11px] text-zinc-600 mt-2">Added {formatDate(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleMut.mutate(u)}
                  disabled={!editable || toggleMut.isPending}
                  title={u.isActive ? 'Hide from app' : 'Show in app'}
                  className="px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.09] transition-colors disabled:opacity-40"
                >
                  {u.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(u)}
                  disabled={!editable}
                  className="px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-accent-blue hover:border-accent-blue/30 transition-colors disabled:opacity-40"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Delete "${u.title}"?`)) deleteMut.mutate(u._id); }}
                  disabled={!editable || deleteMut.isPending}
                  className="px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-accent-red hover:border-accent-red/30 transition-colors disabled:opacity-40"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* add/edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit app update' : 'New app update'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400">Title</label>
            <input
              className="glass-input mt-1"
              placeholder="e.g. v1.2 is here"
              value={form.title}
              maxLength={120}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Content</label>
            <textarea
              className="glass-input mt-1 min-h-[110px] resize-y"
              placeholder="What changed? Keep it short and friendly."
              value={form.content}
              maxLength={2000}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <p className="text-[11px] text-zinc-600 mt-1">{form.content.length}/2000</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400">Priority</label>
              <input
                className="glass-input mt-1 tabular-nums"
                inputMode="numeric"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value.replace(/\D/g, '') })}
              />
              <p className="text-[11px] text-zinc-600 mt-1">Higher shows first</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Visibility</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={cn(
                  'mt-1 w-full px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors',
                  form.isActive
                    ? 'bg-accent-green/10 border-accent-green/25 text-accent-green'
                    : 'bg-white/[0.05] border-white/[0.10] text-zinc-500',
                )}
              >
                {form.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {form.isActive ? 'Visible in app' : 'Hidden'}
              </button>
            </div>
          </div>
          {error && <p className="text-[11px] text-accent-red">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-zinc-300 hover:bg-white/[0.1] transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMut.mutate()}
              disabled={!valid || saveMut.isPending}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveMut.isPending ? 'Saving…' : editId ? 'Save changes' : 'Create update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
