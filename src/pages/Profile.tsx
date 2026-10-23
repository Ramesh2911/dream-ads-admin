import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, ShieldCheck, Clock, Activity, KeyRound, Eye, EyeOff, Save,
  CheckCircle2, XCircle, AlertTriangle, CalendarDays, LogIn, Info, Sparkles, Lock,
} from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate, formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface ActivityRow { action: string; entity: string; createdAt: string; ip?: string }
interface ProfileData {
  id: string;
  name: string;
  email: string;
  status: string;
  role: { id: string | null; name: string; permissions: string[]; permissionCount: number; totalPermissions: number };
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  auditCount: number;
  activity: ActivityRow[];
  topActions: { action: string; count: number }[];
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'Users', wallet: 'Wallet', referral: 'Referrals',
  content: 'Content', ads: 'Ads', tasks: 'Tasks', kyc: 'KYC', finance: 'Finance',
  vouchers: 'Vouchers', cms: 'CMS', roles: 'Roles', leads: 'Leads', audit: 'Audit',
  reports: 'Reports', settings: 'Settings',
};

function ago(iso?: string | null) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

function actionTone(action: string) {
  if (/delete|remove|reject|fail|ban|suspend|disable|password/.test(action)) return 'bg-accent-red/12 text-accent-red border-accent-red/25';
  if (/create|approve|verify|publish|fulfill/.test(action)) return 'bg-accent-green/12 text-accent-green border-accent-green/25';
  if (/login|auth|session/.test(action)) return 'bg-accent-violet/12 text-accent-violet border-accent-violet/25';
  if (/update|adjust|edit|config|broadcast/.test(action)) return 'bg-brand-blue/15 text-accent-blue border-brand-blue/30';
  return 'bg-accent-gold/12 text-accent-gold border-accent-gold/25';
}
function actionDot(action: string) {
  if (/delete|remove|reject|fail|ban|suspend|disable|password/.test(action)) return 'bg-accent-red';
  if (/create|approve|verify|publish|fulfill/.test(action)) return 'bg-accent-green';
  if (/login|auth|session/.test(action)) return 'bg-accent-violet';
  if (/update|adjust|edit|config|broadcast/.test(action)) return 'bg-accent-blue';
  return 'bg-accent-gold';
}

const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export default function Profile() {
  const { admin, updateAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<ProfileData> => (await api.get('/admin/profile')).data.data,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [profileErr, setProfileErr] = useState('');

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [showPw, setShowPw] = useState({ cur: false, next: false, conf: false });
  const [pwFlash, setPwFlash] = useState(false);
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (res) {
      setName(res.name);
      setEmail(res.email);
    }
  }, [res?.id, res?.name, res?.email]);

  const serverName = res?.name ?? '';
  const serverEmail = res?.email ?? '';
  const dirty = !isLoading && (name !== serverName || email !== serverEmail);

  const formErrors = useMemo(() => {
    const e: string[] = [];
    if (name.trim().length < 2) e.push('Name must be at least 2 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.push('Enter a valid email address');
    return e;
  }, [name, email]);

  const pwChecks = useMemo(
    () => ({
      len: newPw.length >= 8,
      letter: /[a-zA-Z]/.test(newPw),
      digit: /\d/.test(newPw),
      symbol: /[^a-zA-Z0-9]/.test(newPw),
      match: newPw.length > 0 && newPw === confPw,
      cur: curPw.length > 0,
    }),
    [newPw, confPw, curPw]
  );
  const score = [pwChecks.len, pwChecks.letter, pwChecks.digit, pwChecks.symbol].filter(Boolean).length;
  const pwLabel = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const pwColor = score <= 1 ? 'bg-accent-red' : score === 2 ? 'bg-accent-gold' : score === 3 ? 'bg-accent-blue' : 'bg-accent-green';
  const pwReady = pwChecks.len && pwChecks.letter && pwChecks.digit && pwChecks.match && pwChecks.cur;

  const profileMut = useMutation({
    mutationFn: () => api.put('/admin/profile', { name: name.trim(), email: email.trim() }),
    onSuccess: async (r) => {
      updateAdmin({ name: r.data.data.name, email: r.data.data.email });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      setProfileErr('');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    },
    onError: (e) => setProfileErr(errMsg(e, 'Could not save profile')),
  });

  const pwMut = useMutation({
    mutationFn: () => api.post('/admin/profile/password', { currentPassword: curPw, newPassword: newPw }),
    onSuccess: async () => {
      setCurPw(''); setNewPw(''); setConfPw('');
      setPwErr('');
      setPwFlash(true);
      setTimeout(() => setPwFlash(false), 5000);
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => setPwErr(errMsg(e, 'Could not change password')),
  });

  const isSuper = res?.role.permissions.includes('*') ?? admin?.role === 'Super Admin';
  const permGroups = useMemo(() => {
    if (!res || isSuper) return [];
    const acc: Record<string, string[]> = {};
    for (const p of res.role.permissions) {
      const mod = p.split('.')[0];
      (acc[mod] ||= []).push(p);
    }
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b));
  }, [res, isSuper]);

  const initials = (name || admin?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const memberDays = res ? Math.max(0, Math.floor((Date.now() - new Date(res.createdAt).getTime()) / 864e5)) : 0;
  const pct = res ? Math.round((res.role.permissionCount / res.role.totalPermissions) * 100) : 0;

  return (
    <div>
      {/* ============ HERO ============ */}
      <div className="relative overflow-hidden glass p-6 sm:p-8 mb-6 animate-slide-up">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-12 w-72 h-72 rounded-full bg-brand-blue/25 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent-gold/50 via-accent-blue/35 to-transparent" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          {/* identity */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            {isLoading ? (
              <div className="w-20 h-20 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
            ) : (
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-gold via-accent-goldDark to-brand-blue p-[3px] shadow-glow-gold">
                  <div className="w-full h-full rounded-full bg-brand-navy flex items-center justify-center text-2xl font-black text-gradient-gold ring-1 ring-white/10">
                    {initials}
                  </div>
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-accent-green ring-4 ring-brand-navyLight" />
              </div>
            )}
            <div className="min-w-0">
              {isLoading ? (
                <div className="space-y-2"><div className="h-6 w-48 rounded-lg bg-white/[0.06] animate-pulse" /><div className="h-4 w-64 rounded-lg bg-white/[0.04] animate-pulse" /></div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white truncate">{res?.name ?? admin?.name}</h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent-gold/15 text-accent-gold border border-accent-gold/30">
                      <ShieldCheck className="w-3 h-3" /> {res?.role.name ?? admin?.role}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                      res?.status === 'active' ? 'bg-accent-green/12 text-accent-green border-accent-green/30' : 'bg-accent-red/12 text-accent-red border-accent-red/30'
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {res?.status ?? 'active'}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> {res?.email ?? admin?.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border',
                      res?.totpEnabled ? 'bg-accent-violet/12 text-accent-violet border-accent-violet/30' : 'bg-white/[0.05] text-zinc-500 border-white/[0.1]'
                    )}>
                      <Lock className="w-3 h-3" /> 2FA {res?.totpEnabled ? 'enabled' : 'off'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-zinc-600 bg-white/[0.04] border border-white/[0.07] truncate">
                      #{String(res?.id ?? '').slice(-10)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* stat tiles 2x2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:w-[440px] shrink-0 gap-3">
            {isLoading
              ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[74px] rounded-xl bg-white/[0.04] animate-pulse" />)
              : [
                  { l: 'Member for', v: `${memberDays}d`, s: formatDate(res!.createdAt), icon: CalendarDays, tone: 'text-accent-blue' },
                  { l: 'Last login', v: ago(res!.lastLoginAt), s: res!.lastLoginAt ? formatDateTime(res!.lastLoginAt) : 'first session', icon: LogIn, tone: 'text-accent-violet' },
                  { l: 'Actions logged', v: res!.auditCount, s: 'audit trail entries', icon: Activity, tone: 'text-accent-green' },
                  { l: 'Access', v: `${res!.role.permissionCount}/${res!.role.totalPermissions}`, s: 'permissions granted', icon: Sparkles, tone: 'text-accent-gold' },
                ].map((tile) => (
                  <div key={tile.l} className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-zinc-600 font-semibold">
                      <tile.icon className={cn('w-3 h-3', tile.tone)} /> {tile.l}
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-white tabular-nums leading-tight">{tile.v}</p>
                    <p className="text-[9px] text-zinc-600 truncate">{tile.s}</p>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ============ LEFT ============ */}
        <div className="lg:col-span-3 space-y-6">
          {/* account details */}
          <div className="glass p-5 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><User className="w-4 h-4 text-accent-blue" /></span>
                <h3 className="font-semibold text-white">Account details</h3>
              </div>
              {dirty && (
                <span className="text-[10px] font-bold text-accent-gold px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/25 animate-pulse">Unsaved</span>
              )}
            </div>

            {savedFlash && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-accent-green/10 border border-accent-green/25 text-sm text-accent-green animate-slide-down">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile saved — header updated too.
              </div>
            )}
            {profileErr && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/25 text-sm text-accent-red">
                <XCircle className="w-4 h-4 shrink-0" /> {profileErr}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Display name</label>
                  <input className="glass-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Email (login)</label>
                  <input className="glass-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-[11px] text-zinc-600 mt-1">You sign in with this email next time</p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                  {dirty && (
                    <button
                      onClick={() => { setName(serverName); setEmail(serverEmail); setProfileErr(''); }}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-zinc-300 hover:bg-white/[0.1] transition-colors text-sm font-semibold"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => profileMut.mutate()}
                    disabled={!dirty || formErrors.length > 0 || profileMut.isPending}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" /> {profileMut.isPending ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
                {formErrors.length > 0 && dirty && (
                  <ul className="sm:col-span-2 space-y-1">
                    {formErrors.map((e) => (
                      <li key={e} className="text-[11px] text-accent-red flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* security */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '70ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-accent-red/10 border border-accent-red/20"><KeyRound className="w-4 h-4 text-accent-red" /></span>
                <h3 className="font-semibold text-white">Security</h3>
                <span className="text-[11px] text-zinc-500">change password</span>
              </div>
              <span className={cn('text-[11px] font-bold px-2 py-1 rounded-lg border', pwReady ? 'text-accent-green bg-accent-green/10 border-accent-green/25' : 'text-zinc-500 bg-white/[0.05] border-white/[0.1]')}>
                {pwReady ? 'Ready' : 'Fill all checks'}
              </span>
            </div>

            {pwFlash && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-accent-green/10 border border-accent-green/25 text-sm text-accent-green animate-slide-down">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Password changed — use the new one at your next sign-in.
              </div>
            )}
            {pwErr && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/25 text-sm text-accent-red">
                <XCircle className="w-4 h-4 shrink-0" /> {pwErr}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400">Current password</label>
                <div className="relative mt-1">
                  <input
                    type={showPw.cur ? 'text' : 'password'}
                    className="glass-input pr-10"
                    placeholder="••••••••"
                    value={curPw}
                    autoComplete="current-password"
                    onChange={(e) => setCurPw(e.target.value)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => ({ ...s, cur: !s.cur }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent-gold transition-colors">
                    {showPw.cur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">New password</label>
                <div className="relative mt-1">
                  <input
                    type={showPw.next ? 'text' : 'password'}
                    className="glass-input pr-10"
                    placeholder="min 8 chars"
                    value={newPw}
                    autoComplete="new-password"
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent-gold transition-colors">
                    {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Confirm new</label>
                <div className="relative mt-1">
                  <input
                    type={showPw.conf ? 'text' : 'password'}
                    className="glass-input pr-10"
                    placeholder="repeat it"
                    value={confPw}
                    autoComplete="new-password"
                    onChange={(e) => setConfPw(e.target.value)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => ({ ...s, conf: !s.conf }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent-gold transition-colors">
                    {showPw.conf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* strength meter */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-zinc-500 font-medium">Strength</span>
                <span className={cn('font-bold', score <= 1 ? 'text-accent-red' : score === 2 ? 'text-accent-gold' : score === 3 ? 'text-accent-blue' : 'text-accent-green')}>
                  {newPw ? `${pwLabel} · ${score}/4` : '—'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-500', i < score ? pwColor : 'w-0')} style={i < score ? { width: '100%' } : undefined} />
                  </div>
                ))}
              </div>
            </div>

            {/* checklist + action */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
                {([
                  { ok: pwChecks.len, l: '8+ characters' },
                  { ok: pwChecks.letter, l: 'Has letter' },
                  { ok: pwChecks.digit, l: 'Has number' },
                  { ok: pwChecks.match, l: 'Matches confirm' },
                ] as Array<{ ok: boolean; l: string }>).map((c) => (
                  <span key={c.l} className={cn('flex items-center gap-1.5 text-[11px] font-medium', c.ok ? 'text-accent-green' : 'text-zinc-600')}>
                    {c.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {c.l}
                  </span>
                ))}
              </div>
              <button
                onClick={() => pwMut.mutate()}
                disabled={!pwReady || pwMut.isPending}
                className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <KeyRound className="w-4 h-4" /> {pwMut.isPending ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </div>

          {/* activity */}
          <div className="glass overflow-hidden animate-slide-up" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-accent-green/10 border border-accent-green/20"><Activity className="w-4 h-4 text-accent-green" /></span>
                <h3 className="font-semibold text-white">My activity</h3>
                <span className="text-[11px] text-zinc-500">audit trail · own actions only</span>
              </div>
              <span className="text-[11px] font-bold text-accent-gold tabular-nums">{res?.auditCount ?? 0} total</span>
            </div>

            {/* top actions */}
            {res && res.topActions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap px-4 sm:px-5 pt-4">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Most frequent:</span>
                {res.topActions.map((a) => (
                  <span key={a.action} className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold border', actionTone(a.action))}>
                    {a.action} <span className="opacity-70">×{a.count}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="p-4 sm:p-5 space-y-3">
              {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-white/[0.03] animate-pulse" />)}
              {!isLoading && res?.activity.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-green/20 to-brand-blue/10 flex items-center justify-center mb-3"><Activity className="w-5 h-5 text-accent-green" /></div>
                  <p className="text-sm font-semibold text-white">No actions yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Everything you do in the admin panel shows up here.</p>
                </div>
              )}
              {!isLoading && res?.activity.map((a, i) => (
                <div key={i} className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className={cn('w-2 h-2 rounded-full shrink-0', actionDot(a.action))} />
                  <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0', actionTone(a.action))}>{a.action}</span>
                  <span className="text-[11px] text-zinc-500 truncate">{a.entity}</span>
                  <span className="ml-auto flex items-center gap-3 shrink-0">
                    {a.ip && <span className="hidden sm:block text-[10px] font-mono text-zinc-700">{a.ip}</span>}
                    <span className="text-[10px] text-zinc-600">{ago(a.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ RIGHT ============ */}
        <div className="lg:col-span-2 space-y-6">
          {/* role & access */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '70ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><ShieldCheck className="w-4 h-4 text-accent-gold" /></span>
                <h3 className="font-semibold text-white">Role & access</h3>
              </div>
              <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border', isSuper ? 'text-accent-gold bg-accent-gold/12 border-accent-gold/30' : 'text-accent-blue bg-brand-blue/15 border-brand-blue/30')}>
                {isSuper ? 'Full access' : 'Scoped'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3"><div className="h-8 rounded-xl bg-white/[0.03] animate-pulse" /><div className="h-4 rounded-lg bg-white/[0.03] animate-pulse" /></div>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xl font-extrabold text-white">{res?.role.name}</p>
                  <p className="text-xs font-bold text-accent-gold tabular-nums">{res?.role.permissionCount}/{res?.role.totalPermissions} · {pct}%</p>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-gold to-brand-blue transition-all duration-700" style={{ width: `${Math.max(4, pct)}%` }} />
                </div>

                {isSuper ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-accent-gold/12 to-brand-blue/10 border border-accent-gold/25">
                    <p className="text-xs font-bold text-accent-gold flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5" /> Super Admin</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">Unrestricted access to {res?.role.totalPermissions} permissions across every module — actions are still audit-logged.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permGroups.map(([mod, perms]) => (
                      <div key={mod}>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1.5">{MODULE_LABELS[mod] ?? mod}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {perms.sort().map((p) => (
                            <span
                              key={p}
                              className={cn(
                                'px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border',
                                p.endsWith('.read') ? 'text-accent-blue bg-brand-blue/12 border-brand-blue/25' : 'text-accent-green bg-accent-green/10 border-accent-green/25'
                              )}
                            >
                              {p.split('.')[1]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {permGroups.length === 0 && <p className="text-xs text-zinc-600">No permissions granted.</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* account info */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-lg bg-accent-violet/10 border border-accent-violet/20"><Info className="w-4 h-4 text-accent-violet" /></span>
              <h3 className="font-semibold text-white">Account info</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {[
                  { l: 'Status', v: res?.status ?? '—', tone: res?.status === 'active' ? 'text-accent-green' : 'text-accent-red' },
                  { l: '2FA (TOTP)', v: res?.totpEnabled ? 'enabled' : 'not enabled', tone: res?.totpEnabled ? 'text-accent-violet' : 'text-zinc-500' },
                  { l: 'Joined', v: res ? `${formatDateTime(res.createdAt)} (${memberDays}d ago)` : '—', tone: 'text-white' },
                  { l: 'Profile updated', v: res ? `${formatDateTime(res.updatedAt)} · ${ago(res.updatedAt)}` : '—', tone: 'text-white' },
                  { l: 'Last login', v: res?.lastLoginAt ? `${formatDateTime(res.lastLoginAt)} · ${ago(res.lastLoginAt)}` : 'never', tone: 'text-white' },
                ].map((row) => (
                  <div key={row.l} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-[11px] text-zinc-500 font-medium shrink-0">{row.l}</span>
                    <span className={cn('text-xs font-semibold truncate text-right', row.tone)}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* tip */}
          <div className="glass p-5 animate-slide-up border border-accent-gold/20" style={{ animationDelay: '210ms' }}>
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20 shrink-0"><Clock className="w-4 h-4 text-accent-gold" /></span>
              <div>
                <p className="text-xs font-bold text-accent-gold">Security tip</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                  Rotate your admin password regularly. Every password change and profile edit is audit-logged with your IP for compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
