import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, ShieldCheck, Users, Plus, Pencil, Trash2, Search, Inbox, Scroll,
  Lock, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import api from '../lib/api';
import { Badge, Modal } from '../components/ui';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface RoleItem {
  _id: string; name: string; permissions: string[]; isSystem: boolean; adminCount: number; createdAt: string;
}
interface RolesData {
  roles: RoleItem[];
  allPermissions: string[];
  stats: { total: number; system: number; custom: number; totalAdmins: number; permissionCount: number };
}
interface AuditItem {
  _id: string; action: string; entity: string; actorEmail?: string; ip?: string; createdAt: string;
}
interface AuditData { logs: AuditItem[]; total: number; page: number; pages: number; entities: string[] }

const ACTION_TONE: Record<string, { cls: string; dot: string }> = {
  create: { cls: 'text-accent-green bg-accent-green/10 border-accent-green/25', dot: 'bg-accent-green' },
  update: { cls: 'text-accent-blue bg-brand-blue/10 border-brand-blue/25', dot: 'bg-accent-blue' },
  delete: { cls: 'text-accent-red bg-accent-red/10 border-accent-red/25', dot: 'bg-accent-red' },
  review: { cls: 'text-accent-violet bg-accent-violet/10 border-accent-violet/25', dot: 'bg-accent-violet' },
  toggle: { cls: 'text-accent-gold bg-accent-gold/10 border-accent-gold/25', dot: 'bg-accent-gold' },
  broadcast: { cls: 'text-accent-pink bg-accent-pink/10 border-accent-pink/25', dot: 'bg-accent-pink' },
};

const groupOf = (p: string) => p.split('.')[0];
const humanModule = (g: string) => g.charAt(0).toUpperCase() + g.slice(1).replace(/_/g, ' ');
const humanPerm = (p: string) => {
  const [g, a = ''] = p.split('.');
  return `${a.charAt(0).toUpperCase()}${a.slice(1).replace(/_/g, ' ')} ${humanModule(g).toLowerCase()}`;
};
const toneFor = (action: string) => {
  const key = Object.keys(ACTION_TONE).find((k) => action.includes(k));
  return ACTION_TONE[key ?? ''] ?? { cls: 'bg-white/[0.08] text-zinc-300 border-white/10', dot: 'bg-zinc-500' };
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

type TabKey = 'roles' | 'audit';

export default function RolesAudit() {
  const [tab, setTab] = useState<TabKey>('roles');
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<RolesData> => (await api.get('/admin/roles')).data.data,
  });

  const s = data?.stats;
  const chips = [
    { label: 'Total roles', value: s ? s.total : null, icon: Shield, chip: 'bg-accent-violet/15 text-accent-violet border-accent-violet/25', sub: s ? `${s.permissionCount} permissions in catalog` : '' },
    { label: 'System roles', value: s ? s.system : null, icon: Lock, chip: 'bg-brand-blue/15 text-accent-blue border-brand-blue/25', sub: 'locked, non-deletable' },
    { label: 'Custom roles', value: s ? s.custom : null, icon: ShieldCheck, chip: 'bg-accent-gold/15 text-accent-gold border-accent-gold/25', sub: 'fully editable' },
    { label: 'Admin accounts', value: s ? s.totalAdmins : null, icon: Users, chip: 'bg-accent-green/15 text-accent-green border-accent-green/25', sub: 'assigned across roles' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Shield className="w-5 h-5 text-accent-gold" /></span>
            Roles & Audit
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">Permission roles and immutable action history</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {chips.map((c, i) => (
          <div key={c.label} className="glass p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cn('p-2.5 rounded-xl border shrink-0', c.chip)}><c.icon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{c.label}</p>
              <p className="text-xl font-extrabold text-white tabular-nums leading-tight">{c.value ?? '—'}</p>
              {c.sub && <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{c.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:left-auto lg:right-8 lg:translate-x-0">
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-base-950/80 backdrop-blur-xl border border-white/[0.1] shadow-glow-goldSoft">
          {([['roles', 'Roles', Shield], ['audit', 'Audit log', Scroll]] as const).map(([k, l, Icon]) => (
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

      {tab === 'roles' ? (
        <RolesTab data={data} isLoading={isLoading} />
      ) : (
        <AuditTab onTab={setTab} />
      )}
    </div>
  );
}

function useInvalidateRoles() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['roles'] });
    qc.invalidateQueries({ queryKey: ['audit-logs'] });
  };
}

function PermMatrix({ all, selected, onChange, disabled }: { all: string[]; selected: string[]; onChange: (p: string[]) => void; disabled?: boolean }) {
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, string[]>();
    for (const p of all) {
      const g = groupOf(p);
      if (!map.has(g)) { map.set(g, []); order.push(g); }
      map.get(g)!.push(p);
    }
    return order.map((g) => ({ group: g, perms: map.get(g)! }));
  }, [all]);

  const toggle = (p: string) => {
    if (disabled) return;
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  };
  const toggleGroup = (perms: string[]) => {
    if (disabled) return;
    const allOn = perms.every((p) => selected.includes(p));
    if (allOn) onChange(selected.filter((x) => !perms.includes(x)));
    else onChange([...new Set([...selected, ...perms])]);
  };

  return (
    <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1 scrollbar-thin">
      {groups.map(({ group, perms }) => {
        const on = perms.filter((p) => selected.includes(p)).length;
        return (
          <div key={group} className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{humanModule(group)}</span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', on === perms.length ? 'bg-accent-green/15 text-accent-green' : on > 0 ? 'bg-accent-gold/15 text-accent-gold' : 'bg-white/[0.06] text-zinc-500')}>
                  {on}/{perms.length}
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggleGroup(perms)}
                className={cn(
                  'text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors',
                  on === perms.length ? 'text-accent-green hover:bg-accent-green/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]',
                  disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {on === perms.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-1 p-3">
              {perms.map((p) => {
                const checked = selected.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(p)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all border',
                      checked
                        ? 'bg-accent-gold/10 border-accent-gold/30 text-white'
                        : 'bg-white/[0.02] border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
                      disabled && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-accent-gold border-accent-gold text-base-950' : 'border-zinc-600 bg-transparent'
                    )}>
                      {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate">{humanPerm(p)}</span>
                      <span className="block text-[10px] font-mono text-zinc-600 truncate">{p}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RolesTab({ data, isLoading }: { data?: RolesData; isLoading: boolean }) {
  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'view'; role: RoleItem | null } | null>(null);
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [formErr, setFormErr] = useState('');
  const [deleting, setDeleting] = useState<RoleItem | null>(null);
  const { can } = useAuth();
  const manage = can('roles.manage');
  const invalidate = useInvalidateRoles();

  const all = data?.allPermissions ?? [];
  const total = all.length || 1;

  const createMut = useMutation({
    mutationFn: () => api.post('/admin/roles', { name: name.trim(), permissions: perms }),
    onSuccess: () => { invalidate(); setModal(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not create role'),
  });
  const updateMut = useMutation({
    mutationFn: () => api.put(`/admin/roles/${modal!.role!._id}`, { name: name.trim(), permissions: perms }),
    onSuccess: () => { invalidate(); setModal(null); },
    onError: (e: unknown) => setFormErr((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Could not save role'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => { invalidate(); setDeleting(null); },
  });

  const openCreate = () => { setModal({ mode: 'create', role: null }); setName(''); setPerms([]); setFormErr(''); };
  const openEdit = (r: RoleItem) => {
    setModal({ mode: r.isSystem ? 'view' : 'edit', role: r });
    setName(r.name); setPerms([...r.permissions]); setFormErr('');
  };
  const canSave = name.trim().length >= 2 && !(createMut.isPending || updateMut.isPending);

  const roles = data?.roles ?? [];

  return (
    <>
      <div className="glass overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.08]">
          <p className="text-sm text-zinc-500"><span className="text-white font-semibold">{roles.length}</span> roles · permission catalog: <span className="text-accent-gold font-semibold">{all.length}</span></p>
          {manage && (
            <button onClick={openCreate} className="btn-gold !py-2 px-3.5 text-xs"><Plus className="w-3.5 h-3.5" /> New role</button>
          )}
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />)}</div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Inbox className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No roles</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 p-4">
            {roles.map((r, i) => {
              const pct = Math.round((r.permissions.length / total) * 100);
              const groups = [...new Set(r.permissions.map(groupOf))];
              return (
                <div key={r._id} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-accent-gold/30 transition-all animate-fade-in relative overflow-hidden">
                  <div className={cn('absolute -top-16 -right-16 w-40 h-40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity', r.isSystem ? 'bg-accent-violet/15' : 'bg-accent-gold/10')} />
                  <div className="relative flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('p-2.5 rounded-xl bg-gradient-to-br shrink-0', r.isSystem ? 'from-accent-violet/25 to-accent-violet/5 text-accent-violet' : 'from-accent-gold/25 to-accent-gold/5 text-accent-gold')}>
                        {r.isSystem ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{r.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.isSystem ? <Badge variant="info">System</Badge> : <Badge variant="success">Custom</Badge>}
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500"><Users className="w-2.5 h-2.5" />{r.adminCount} admins</span>
                        </div>
                      </div>
                    </div>
                    {manage && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="btn-ghost p-1.5 text-accent-blue" title={r.isSystem ? 'View permissions' : 'Edit role'}>
                          {r.isSystem ? <Lock className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        </button>
                        {!r.isSystem && (
                          <button onClick={() => setDeleting(r)} className="btn-ghost p-1.5 text-accent-red" disabled={r.adminCount > 0} title={r.adminCount > 0 ? 'Role in use' : 'Delete role'}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                      <span>Permission coverage</span>
                      <span className="text-zinc-300 font-bold">{r.permissions.length}/{all.length} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={cn('h-full rounded-full bg-gradient-to-r', r.isSystem ? 'from-accent-violet to-accent-blue' : 'from-accent-gold to-accent-blue')} style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {groups.map((g) => (
                        <span key={g} className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] font-semibold text-zinc-400 capitalize">
                          {humanModule(g)} <span className="text-zinc-600">×{r.permissions.filter((p) => groupOf(p) === g).length}</span>
                        </span>
                      ))}
                      {groups.length === 0 && <span className="text-[11px] text-zinc-600">No permissions assigned</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* role editor modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'New role' : modal?.mode === 'view' ? `${modal.role?.name} · permissions` : 'Edit role'}
        wide
      >
        {modal && (
          <div className="space-y-4">
            {modal.mode !== 'view' && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Role name *</label>
                <input className="field-gold" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Content Moderator" />
              </div>
            )}
            {modal.mode === 'view' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-violet/10 border border-accent-violet/25 text-xs text-accent-violet">
                <Lock className="w-3.5 h-3.5 shrink-0" /> System role — permissions are locked and cannot be edited.
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">Select the capabilities this role grants</p>
              <p className="text-xs font-bold text-accent-gold tabular-nums">{perms.length}/{all.length} selected</p>
            </div>
            <PermMatrix all={all} selected={perms} onChange={setPerms} disabled={modal.mode === 'view'} />
            {formErr && <p className="text-xs text-accent-red">{formErr}</p>}
            {modal.mode !== 'view' && (
              <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
                <button onClick={() => setModal(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
                <button
                  onClick={() => (modal.mode === 'create' ? createMut.mutate() : updateMut.mutate())}
                  disabled={!canSave}
                  className="btn-gold !py-2 px-4 text-xs disabled:opacity-50"
                >
                  {(createMut.isPending || updateMut.isPending) ? 'Saving…' : modal.mode === 'create' ? 'Create role' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete role">
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><Trash2 className="w-4 h-4 text-accent-red" /></span>
              <div>
                <p className="text-sm text-white font-semibold">{deleting.name}</p>
                <p className="text-xs text-zinc-500">{deleting.adminCount} admins · {deleting.permissions.length} permissions</p>
              </div>
            </div>
            {deleting.adminCount > 0 && <p className="text-xs text-accent-red">Role is in use — reassign admins first.</p>}
            {delMut.isError && (
              <p className="text-xs text-accent-red">{(delMut.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Delete failed'}</p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setDeleting(null)} className="btn-ghost !py-2 px-4 text-xs">Cancel</button>
              <button onClick={() => delMut.mutate(deleting._id)} disabled={delMut.isPending || deleting.adminCount > 0} className="btn !py-2 px-4 text-xs bg-accent-red/90 hover:bg-accent-red text-white disabled:opacity-50">
                {delMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function AuditTab({ onTab }: { onTab: (t: TabKey) => void }) {
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entity, search, page],
    queryFn: async (): Promise<AuditData> =>
      (await api.get('/admin/audit-logs', { params: { entity: entity || undefined, search: search || undefined, page, limit: 30 } })).data.data,
    placeholderData: (prev) => prev,
  });

  const items = data?.logs ?? [];
  const total = data?.total ?? 0;
  const entities = data?.entities ?? [];

  return (
    <div className="glass overflow-hidden animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-white/[0.08]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="field-gold !py-2 pl-10" placeholder="Search action, actor or entity…" />
        </div>
        <button onClick={() => onTab('roles')} className="btn-ghost !py-2 px-3 text-xs lg:ml-auto self-start">
          <Shield className="w-3.5 h-3.5" /> Switch to roles
        </button>
      </div>

      {entities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Entity</span>
          {[{ k: '', l: 'All' }, ...entities.map((e) => ({ k: e, l: humanModule(e) }))].map((x) => (
            <button
              key={x.k || 'all'}
              onClick={() => { setEntity(x.k); setPage(1); }}
              className={cn(
                'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border',
                entity === x.k
                  ? 'bg-gradient-to-r from-accent-gold to-accent-goldDark text-base-950 border-transparent shadow-glow-goldSoft'
                  : 'bg-white/[0.04] text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.08]'
              )}
            >
              {x.l}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-brand-blue/10 flex items-center justify-center mb-4"><Scroll className="w-6 h-6 text-accent-gold" /></div>
            <p className="text-white font-semibold">No audit entries</p>
            <p className="mt-1 text-sm text-zinc-500">{search || entity ? 'Try different filters.' : 'Admin actions will be recorded here.'}</p>
          </div>
        ) : (
          items.map((l, i) => {
            const tone = toneFor(l.action);
            return (
              <div
                key={l._id}
                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-2 md:gap-4 items-center px-3 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] transition-colors animate-fade-in relative rounded-lg"
              >
                <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-gradient-to-b from-accent-gold/70 to-accent-blue/50 transition-all rounded-full" />
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-mono shrink-0', tone.cls)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} /> {l.action}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-zinc-400 font-semibold shrink-0">{l.entity}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{l.actorEmail ?? 'system'}</p>
                  {l.ip && <p className="text-[10px] text-zinc-600 font-mono truncate">ip {l.ip}</p>}
                </div>
                <p className="text-[11px] text-zinc-500 md:text-right" title={formatDate(l.createdAt)}>{rel(l.createdAt)}</p>
              </div>
            );
          })
        )}

        {data && data.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-white/[0.08]">
            <p className="text-xs text-zinc-500">
              Showing <span className="text-zinc-300 font-medium">{(page - 1) * 30 + 1}–{Math.min(page * 30, total)}</span> of <span className="text-zinc-300 font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !py-1.5 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
              <span className="text-xs text-zinc-500 px-2">Page {page} / {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-ghost !py-1.5 disabled:opacity-40">Next <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
