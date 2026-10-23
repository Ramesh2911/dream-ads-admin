import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings2, Smartphone, Wallet, ShieldAlert, CheckCircle2, AlertTriangle, XCircle,
  Save, RotateCcw, ExternalLink, Server, Clock,
} from 'lucide-react';
import api from '../lib/api';
import { cn, formatDateTime } from '../lib/utils';
import { Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';

interface SettingsPayload {
  data: Record<string, unknown>;
  meta: Record<string, string>;
}

type Form = {
  appName: string;
  androidDownloadUrl: string;
  iosDownloadUrl: string;
  minWithdrawal: string;
  signupBonus: string;
  maintenanceMode: boolean;
};

const toForm = (d?: Record<string, unknown>): Form => ({
  appName: String(d?.appName ?? ''),
  androidDownloadUrl: String(d?.androidDownloadUrl ?? ''),
  iosDownloadUrl: String(d?.iosDownloadUrl ?? ''),
  minWithdrawal: String(d?.minWithdrawal ?? '0'),
  signupBonus: String(d?.signupBonus ?? '0'),
  maintenanceMode: Boolean(d?.maintenanceMode),
});

const isValidUrl = (v: string) => v === '' || /^https?:\/\/\S+$/.test(v);
const isInt = (v: string) => /^\d+$/.test(v.trim());

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const editable = can('settings.manage');

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsPayload> => (await api.get('/admin/settings')).data,
  });

  const [form, setForm] = useState<Form>(toForm());
  const [confirmMaint, setConfirmMaint] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (res?.data) setForm(toForm(res.data));
  }, [res]);

  const server = useMemo(() => toForm(res?.data), [res]);
  const dirtyKeys = useMemo(
    () =>
      (Object.keys(server) as Array<keyof Form>).filter(
        (k) => String(server[k]) !== String(form[k])
      ),
    [server, form]
  );
  const dirty = dirtyKeys.length > 0;

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!form.appName.trim()) e.push('App name cannot be empty');
    if (!isValidUrl(form.androidDownloadUrl)) e.push('Android URL must be a valid http(s) link');
    if (!isValidUrl(form.iosDownloadUrl)) e.push('iOS URL must be a valid http(s) link');
    if (!isInt(form.minWithdrawal)) e.push('Minimum withdrawal must be a whole number');
    else if (Number(form.minWithdrawal) < 0) e.push('Minimum withdrawal cannot be negative');
    if (!isInt(form.signupBonus)) e.push('Signup bonus must be a whole number');
    else if (Number(form.signupBonus) > 100_000) e.push('Signup bonus looks too high (max 100,000)');
    return e;
  }, [form]);

  const mut = useMutation({
    mutationFn: () =>
      api.put('/admin/settings', {
        appName: form.appName.trim(),
        androidDownloadUrl: form.androidDownloadUrl.trim(),
        iosDownloadUrl: form.iosDownloadUrl.trim(),
        minWithdrawal: Number(form.minWithdrawal),
        signupBonus: Number(form.signupBonus),
        maintenanceMode: form.maintenanceMode,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings'] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    },
  });

  const lastSaved = useMemo(() => {
    const times = Object.values(res?.meta ?? {}).map((t) => new Date(t).getTime());
    return times.length ? Math.max(...times) : 0;
  }, [res]);

  const toggleMaintenance = (next: boolean) => {
    if (next && editable) {
      setConfirmMaint(true);
    } else {
      setForm((f) => ({ ...f, maintenanceMode: next }));
    }
  };

  const checks = [
    { ok: form.appName.trim().length > 0, label: 'App name set', hint: 'Shown across app & website' },
    { ok: isValidUrl(form.androidDownloadUrl) && form.androidDownloadUrl !== '', label: 'Android download link', hint: form.androidDownloadUrl || 'not set yet' },
    { ok: isValidUrl(form.iosDownloadUrl) && form.iosDownloadUrl !== '', warn: form.iosDownloadUrl === '', label: 'iOS download link', hint: form.iosDownloadUrl || 'optional — missing' },
    { ok: isInt(form.minWithdrawal) && Number(form.minWithdrawal) >= 0, label: 'Minimum withdrawal valid', hint: `${Number(form.minWithdrawal) || 0} coins` },
    { ok: isInt(form.signupBonus) && Number(form.signupBonus) <= 100_000, label: 'Signup bonus valid', hint: `${Number(form.signupBonus) || 0} coins per new user` },
  ];

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20"><Settings2 className="w-5 h-5 text-accent-gold" /></span>
            Platform Settings
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">App identity, economy rules and maintenance control</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-sm-end">
          {lastSaved > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <Clock className="w-3 h-3" /> Saved {formatDateTime(new Date(lastSaved).toISOString())}
            </span>
          )}
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-gold px-2.5 py-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/25 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {dirtyKeys.length} unsaved change{dirtyKeys.length > 1 ? 's' : ''}
            </span>
          )}
          {!editable && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-violet px-2.5 py-1.5 rounded-lg bg-accent-violet/10 border border-accent-violet/25">
              <ShieldAlert className="w-3 h-3" /> Read-only
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" /> Live from Atlas
          </span>
        </div>
      </div>

      {savedFlash && (
        <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-accent-green/10 border border-accent-green/25 text-sm text-accent-green animate-slide-down">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Settings saved successfully — audit-logged.
        </div>
      )}

      {!editable && (
        <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-accent-violet/10 border border-accent-violet/25 text-sm text-accent-violet">
          <ShieldAlert className="w-4 h-4 shrink-0" /> You have <b>settings.read</b> only — contact a Super Admin to edit.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* form column */}
        <div className="lg:col-span-3 space-y-6">
          {/* general */}
          <div className="glass p-5 sm:p-6 animate-slide-up">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="p-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20"><Smartphone className="w-4 h-4 text-accent-blue" /></span>
              <h3 className="font-semibold text-white">General</h3>
            </div>
            {isLoading ? (
              <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                <Field label="App name" hint="Displayed in header, splash and download pages">
                  <input
                    className="glass-input mt-1"
                    value={form.appName}
                    disabled={!editable}
                    onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  />
                </Field>
                <Field label="Android download URL" hint="Google Play / APK link used by the website download button">
                  <div className="relative mt-1">
                    <input
                      className="glass-input pr-9"
                      placeholder="https://play.google.com/..."
                      value={form.androidDownloadUrl}
                      disabled={!editable}
                      onChange={(e) => setForm({ ...form, androidDownloadUrl: e.target.value })}
                    />
                    {form.androidDownloadUrl && isValidUrl(form.androidDownloadUrl) && (
                      <a href={form.androidDownloadUrl} target="_blank" rel="noreferrer" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent-gold transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </Field>
                <Field label="iOS download URL" hint="App Store link — leave empty if not published yet">
                  <div className="relative mt-1">
                    <input
                      className="glass-input pr-9"
                      placeholder="https://apps.apple.com/..."
                      value={form.iosDownloadUrl}
                      disabled={!editable}
                      onChange={(e) => setForm({ ...form, iosDownloadUrl: e.target.value })}
                    />
                    {form.iosDownloadUrl && isValidUrl(form.iosDownloadUrl) && (
                      <a href={form.iosDownloadUrl} target="_blank" rel="noreferrer" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent-gold transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </Field>
              </div>
            )}
          </div>

          {/* economy */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '70ms' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="p-2 rounded-lg bg-accent-gold/10 border border-accent-gold/20"><Wallet className="w-4 h-4 text-accent-gold" /></span>
              <h3 className="font-semibold text-white">Economy</h3>
              <span className="text-[11px] text-zinc-500">coin rules</span>
            </div>
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Minimum withdrawal</label>
                  <div className="relative mt-1">
                    <input
                      className="glass-input pr-16 tabular-nums"
                      inputMode="numeric"
                      value={form.minWithdrawal}
                      disabled={!editable}
                      onChange={(e) => setForm({ ...form, minWithdrawal: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-accent-gold">coins</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">Withdrawals below {Number(form.minWithdrawal) || 0} coins are blocked</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Signup bonus</label>
                  <div className="relative mt-1">
                    <input
                      className="glass-input pr-16 tabular-nums"
                      inputMode="numeric"
                      value={form.signupBonus}
                      disabled={!editable}
                      onChange={(e) => setForm({ ...form, signupBonus: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-accent-gold">coins</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">Credited to social wallet on account creation</p>
                </div>
              </div>
            )}
          </div>

          {/* maintenance */}
          <div className={cn(
            'glass p-5 sm:p-6 border animate-slide-up transition-colors',
            form.maintenanceMode ? 'border-accent-red/40 bg-accent-red/[0.06]' : 'border-white/[0.07]',
          )} style={{ animationDelay: '140ms' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className={cn(
                  'p-2 rounded-lg border shrink-0',
                  form.maintenanceMode ? 'bg-accent-red/15 border-accent-red/30' : 'bg-white/[0.05] border-white/[0.08]'
                )}>
                  <ShieldAlert className={cn('w-4 h-4', form.maintenanceMode ? 'text-accent-red' : 'text-zinc-500')} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">Maintenance mode</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {form.maintenanceMode
                      ? '⚠ Users are currently blocked from the app — only admins can log in.'
                      : 'When enabled, the user app is blocked while you ship fixes.'}
                  </p>
                </div>
              </div>
              {/* switch */}
              <button
                type="button"
                role="switch"
                aria-checked={form.maintenanceMode}
                disabled={!editable}
                onClick={() => toggleMaintenance(!form.maintenanceMode)}
                className={cn(
                  'relative w-12 h-[26px] rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
                  form.maintenanceMode ? 'bg-accent-red shadow-[0_0_14px_rgba(248,113,113,0.4)]' : 'bg-white/[0.12]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                  form.maintenanceMode ? 'left-[24px]' : 'left-0.5'
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* validation health */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '70ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-accent-green/10 border border-accent-green/20"><Server className="w-4 h-4 text-accent-green" /></span>
                <h3 className="font-semibold text-white">Config health</h3>
              </div>
              <span className={cn(
                'text-[11px] font-bold px-2 py-1 rounded-lg border',
                errors.length === 0
                  ? 'text-accent-green bg-accent-green/10 border-accent-green/25'
                  : 'text-accent-red bg-accent-red/10 border-accent-red/25'
              )}>
                {errors.length === 0 ? 'All good' : `${errors.length} issue${errors.length > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="space-y-2.5">
              {checks.map((c) => {
                const warn = 'warn' in c && c.warn;
                return (
                  <div key={c.label} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    {c.ok && !warn ? (
                      <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                    ) : warn ? (
                      <AlertTriangle className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold', c.ok && !warn ? 'text-white' : warn ? 'text-accent-gold' : 'text-accent-red')}>{c.label}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{c.hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* actions */}
            <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3">
              {errors.length > 0 && (
                <ul className="space-y-1">
                  {errors.map((e) => (
                    <li key={e} className="text-[11px] text-accent-red flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {e}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => mut.mutate()}
                  disabled={!editable || !dirty || errors.length > 0 || mut.isPending}
                  className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" /> {mut.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => setForm(server)}
                  disabled={!editable || !dirty || mut.isPending}
                  className="px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-zinc-300 hover:bg-white/[0.1] transition-colors font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
              {mut.isError && (
                <p className="text-[11px] text-accent-red">
                  Save failed: {(mut.error as Error)?.message || 'server rejected the values'}
                </p>
              )}
            </div>
          </div>

          {/* key meta */}
          <div className="glass p-5 sm:p-6 animate-slide-up" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="p-2 rounded-lg bg-accent-violet/10 border border-accent-violet/20"><Clock className="w-4 h-4 text-accent-violet" /></span>
              <h3 className="font-semibold text-white">Key history</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(res?.meta ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-xs text-zinc-400 font-mono truncate">{k}</span>
                    <span className="text-[10px] text-zinc-600 shrink-0">{formatDateTime(v)}</span>
                  </div>
                ))}
                {Object.keys(res?.meta ?? {}).length === 0 && (
                  <p className="text-xs text-zinc-600">No keys stored yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* maintenance confirm */}
      <Modal open={confirmMaint} onClose={() => setConfirmMaint(false)} title="Enable maintenance mode?">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-accent-red/10 border border-accent-red/25">
            <AlertTriangle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300 leading-relaxed">
              The user app will <b className="text-white">immediately block all user access</b> until you turn this off.
              Existing sessions cannot redeem, watch or withdraw while maintenance is on.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmMaint(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-zinc-300 hover:bg-white/[0.1] transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setForm((f) => ({ ...f, maintenanceMode: true }));
                setConfirmMaint(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-accent-red text-white hover:bg-accent-red/90 transition-colors text-sm font-semibold shadow-lg shadow-accent-red/25"
            >
              Yes, turn it on
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
