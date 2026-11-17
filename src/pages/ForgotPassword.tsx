import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft, KeyRound, Check, X } from 'lucide-react';
import api from '../lib/api';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong';

  const sendOtp = async (isResend = false) => {
    if (!email) return;
    setErr(''); setInfo(''); setLoading(true);
    try {
      const res = await api.post('/admin/forgot-password', { email });
      setStep('otp');
      setInfo(isResend ? 'A new OTP has been sent' : res.data?.message || 'OTP sent');
      setCooldown(30);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return;
    setErr(''); setInfo(''); setLoading(true);
    try {
      await api.post('/admin/forgot-password/verify', { email, otp });
      setStep('password');
      setInfo('OTP verified — now set your new password');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (newPw !== confPw) { setErr('Passwords do not match'); return; }
    setErr(''); setLoading(true);
    try {
      await api.post('/admin/forgot-password/reset', { email, otp, newPassword: newPw });
      nav('/login', { state: { flash: 'Password updated — sign in with your new password' } });
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const checks = [
    { ok: newPw.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-zA-Z]/.test(newPw), label: 'Contains a letter' },
    { ok: /\d/.test(newPw), label: 'Contains a number' },
    { ok: newPw.length > 0 && newPw === confPw, label: 'Passwords match' },
  ];
  const validOtp = /^\d{6}$/.test(otp);
  const canVerify = validOtp && !loading;
  const canReset = checks.every((c) => c.ok) && !loading;

  const resetOtpFlow = () => { setStep('email'); setErr(''); setInfo(''); setOtp(''); setNewPw(''); setConfPw(''); };

  const headerIcon =
    step === 'email' ? <Mail className="w-5 h-5 text-accent-gold" />
    : step === 'otp' ? <KeyRound className="w-5 h-5 text-accent-gold" />
    : <ShieldCheck className="w-5 h-5 text-accent-gold" />;
  const headerTitle =
    step === 'email' ? 'Forgot password?'
    : step === 'otp' ? 'Enter reset code'
    : 'Set new password';
  const headerSub =
    step === 'email' ? "We'll email you a 6-digit OTP"
    : step === 'otp' ? `Code sent to ${email}`
    : `OTP verified for ${email}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-brand-navy relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(46,107,255,0.22),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(10,21,64,0.9),transparent_65%)]" />
      <div className="absolute -top-24 right-[-8%] w-[420px] h-[420px] rounded-full bg-brand-blue/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-5%] w-[340px] h-[340px] rounded-full bg-accent-gold/10 blur-[120px]" />
      <div className="absolute inset-0 dots-grid opacity-25" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-7">
          <div className="relative mb-3.5">
            <div className="absolute -inset-2 rounded-full bg-accent-gold/20 blur-lg" />
            <img
              src="/logo.jpeg"
              alt="Dream Ads"
              className="relative w-20 h-20 rounded-full object-cover ring-2 ring-accent-gold/60 shadow-glow-gold"
              draggable={false}
            />
          </div>
          <h1 className="text-gradient-gold text-2xl font-extrabold tracking-[0.16em] bg-[length:200%_100%] animate-shimmer">
            DREAM ADS
          </h1>
          <p className="mt-1 text-xs text-faint">Admin Control Center</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'email') sendOtp();
            else if (step === 'otp') verifyOtp();
            else reset();
          }}
          className="p-7 sm:p-9 rounded-2xl border border-overlay/[0.1] bg-brand-navyLight/60 backdrop-blur-xl shadow-glow-blueSoft"
        >
          <div className="mb-6 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center shrink-0">
              {headerIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-heading">{headerTitle}</h2>
              <p className="text-sm text-faint mt-1">{headerSub}</p>
            </div>
          </div>

          {info && (
            <div className="mb-5 p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-sm animate-fade-in">
              {info}
            </div>
          )}

          {err && (
            <div className="mb-5 p-3.5 rounded-xl bg-accent-red/10 border border-accent-red/25 text-accent-red text-sm flex items-start gap-2.5 animate-fade-in">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-red/20 flex items-center justify-center shrink-0 text-[10px] font-bold">!</span>
              {err}
            </div>
          )}

          {/* Step 1 — email */}
          {step === 'email' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-email" className="text-xs font-medium text-muted">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-gold pl-10"
                    placeholder="admin@yourcompany.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full shine !py-3">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…
                  </span>
                ) : (
                  <>Send OTP <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          {/* Step 2 — OTP verify only */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-otp" className="text-xs font-medium text-muted">6-digit OTP</label>
                <input
                  id="fp-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="field-gold text-center tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <button type="submit" disabled={!canVerify} className="btn-gold w-full shine !py-3 disabled:opacity-50">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                  </span>
                ) : (
                  <>Verify OTP <ShieldCheck className="w-4 h-4" /></>
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={resetOtpFlow}
                  className="inline-flex items-center gap-1 text-faint hover:text-body transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change email
                </button>
                <button
                  type="button"
                  onClick={() => sendOtp(true)}
                  disabled={cooldown > 0 || loading}
                  className="text-accent-gold hover:text-accent-gold/80 hover:underline disabled:text-dim disabled:no-underline transition-colors"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — new password only (OTP already verified) */}
          {step === 'password' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-new" className="text-xs font-medium text-muted">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                  <input
                    id="fp-new"
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="field-gold pl-10 pr-11"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-faint hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fp-conf" className="text-xs font-medium text-muted">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                  <input
                    id="fp-conf"
                    type={showConf ? 'text' : 'password'}
                    value={confPw}
                    onChange={(e) => setConfPw(e.target.value)}
                    className="field-gold pl-10 pr-11"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-faint hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
                    aria-label={showConf ? 'Hide password' : 'Show password'}
                  >
                    {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-accent-green' : 'text-faint'}`}>
                    {c.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {c.label}
                  </li>
                ))}
              </ul>

              <button type="submit" disabled={!canReset} className="btn-gold w-full shine !py-3 disabled:opacity-50">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                  </span>
                ) : (
                  <>Reset password <ShieldCheck className="w-4 h-4" /></>
                )}
              </button>

              <div className="flex items-center justify-start text-xs">
                <button
                  type="button"
                  onClick={() => { setStep('otp'); setErr(''); setInfo(''); setNewPw(''); setConfPw(''); }}
                  className="inline-flex items-center gap-1 text-faint hover:text-body transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change OTP
                </button>
              </div>
            </div>
          )}

          <p className="mt-5 text-center text-[11px] text-dim">
            <button type="button" onClick={() => nav('/login')} className="hover:text-muted transition-colors">
              ← Back to sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
