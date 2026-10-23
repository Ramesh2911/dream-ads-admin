import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, ScrollText, Database, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      nav('/');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(msg || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-brand-navy">
      {/* ============ LEFT: brand panel ============ */}
      <aside className="hidden lg:flex relative w-[46%] max-w-[640px] flex-col justify-between p-12 overflow-hidden bg-brand-navy">
        {/* backdrop layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(46,107,255,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_85%,rgba(255,216,111,0.14),transparent_55%)]" />
        <div className="absolute -left-32 top-1/4 w-[420px] h-[420px] rounded-full bg-brand-blue/25 blur-[130px]" />
        <div className="absolute -right-24 bottom-0 w-[380px] h-[380px] rounded-full bg-accent-gold/10 blur-[120px]" />
        <div className="absolute inset-0 dots-grid opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,11,31,0.75)_100%)]" />

        {/* top badge */}
        <div className="relative flex items-center gap-2.5 w-fit px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-accent-gold/30 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider text-accent-gold uppercase">MCA Registered Entity</span>
        </div>

        {/* center: logo + title */}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-8">
            {/* orbiting ring */}
            <div className="absolute -inset-6 rounded-full border border-dashed border-accent-gold/30 animate-spin-slow" />
            <div className="absolute -inset-3 rounded-full bg-[conic-gradient(from_0deg,transparent_0%,rgba(255,216,111,0.5)_12%,transparent_28%,transparent_100%)] animate-spin-slow opacity-70" />
            {/* gold halo */}
            <div className="absolute inset-0 rounded-full bg-accent-gold/25 blur-2xl animate-pulse" />
            <img
              src="/logo.jpeg"
              alt="Dream Ads"
              className="relative w-52 h-52 rounded-full object-cover ring-4 ring-accent-gold/60 shadow-glow-goldStrong animate-float select-none"
              draggable={false}
            />
          </div>

          <h1 className="text-gradient-gold text-4xl font-extrabold tracking-[0.18em] bg-[length:200%_100%] animate-shimmer">
            DREAM ADS
          </h1>
          <p className="mt-3 text-zinc-400 text-sm tracking-wide">
            Admin Control Center · Multi Solutions Private Limited
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {[
              { icon: ShieldCheck, label: 'RBAC Secured' },
              { icon: ScrollText, label: 'Audit Logged' },
              { icon: Database, label: 'Atlas Powered' },
            ].map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs text-zinc-300 backdrop-blur-sm hover:border-accent-gold/40 hover:text-accent-gold transition-colors"
              >
                <c.icon className="w-3.5 h-3.5" /> {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* bottom note */}
        <p className="relative text-[11px] text-zinc-600 text-center">
          © {new Date().getFullYear()} Dream Ads Multi Solutions Pvt Ltd · CIN U62011WR2026PTC295658
        </p>
      </aside>

      {/* ============ RIGHT: form ============ */}
      <main className="flex-1 relative flex items-center justify-center p-5 sm:p-8 overflow-hidden bg-brand-navy">
        {/* navy/blue backdrop layers (no flat black) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(46,107,255,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(10,21,64,0.9),transparent_65%)]" />
        <div className="absolute -top-24 right-[-8%] w-[420px] h-[420px] rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[340px] h-[340px] rounded-full bg-accent-gold/10 blur-[110px]" />
        <div className="absolute inset-0 dots-grid opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,11,31,0.55)_100%)]" />

        <div className="relative w-full max-w-md animate-slide-up">
          {/* mobile logo header */}
          <div className="lg:hidden flex flex-col items-center mb-7">
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
            <p className="mt-1 text-xs text-zinc-500">Admin Control Center</p>
          </div>

          <form onSubmit={submit} className="p-7 sm:p-9 rounded-2xl border border-white/[0.1] bg-brand-navyLight/60 backdrop-blur-xl shadow-glow-blueSoft">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Sign in</h2>
              <p className="text-sm text-zinc-500 mt-1">Use your admin credentials to continue</p>
            </div>

            {err && (
              <div className="mb-5 p-3.5 rounded-xl bg-accent-red/10 border border-accent-red/25 text-accent-red text-sm flex items-start gap-2.5 animate-fade-in">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-red/20 flex items-center justify-center shrink-0 text-[10px] font-bold">!</span>
                {err}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-zinc-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    id="email"
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

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-zinc-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-gold pl-10 pr-11"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full mt-6 shine !py-3">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </span>
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-5 text-center text-[11px] text-zinc-600">
              Access is role-restricted · all actions are audit-logged
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
