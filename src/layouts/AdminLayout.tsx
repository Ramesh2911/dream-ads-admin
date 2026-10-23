import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Wallet, Share2, Video, ListChecks,
  Banknote, Ticket, Shield, BarChart3, Settings, LogOut, Menu, X, Bell, Inbox,
  CalendarDays, ChevronDown, UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const GROUPS = ['Overview', 'Growth', 'Money', 'Engagement', 'Control'] as const;

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', group: 'Overview' },
  { to: '/users', label: 'Users', icon: Users, perm: 'users.read', group: 'Growth' },
  { to: '/referrals', label: 'Referrals', icon: Share2, perm: 'referral.read', group: 'Growth' },
  { to: '/leads', label: 'Leads', icon: Inbox, perm: 'leads.read', group: 'Growth' },
  { to: '/wallet', label: 'Wallet & Ledger', icon: Wallet, perm: 'wallet.read', group: 'Money' },
  { to: '/finance', label: 'Finance', icon: Banknote, perm: 'finance.read', group: 'Money' },
  { to: '/vouchers', label: 'Vouchers', icon: Ticket, perm: 'vouchers.read', group: 'Money' },
  { to: '/content', label: 'Content & Ads', icon: Video, perm: 'content.read', group: 'Engagement' },
  { to: '/tasks', label: 'Task Verification', icon: ListChecks, perm: 'tasks.verify', group: 'Engagement' },
  { to: '/roles', label: 'Roles & Audit', icon: Shield, perm: 'roles.read', group: 'Control' },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports.read', group: 'Control' },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'settings.read', group: 'Control' },
];

export default function AdminLayout() {
  const { admin, logout, can } = useAuth();
  const nav2 = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menu]);

  const visible = nav.filter((n) => can(n.perm));
  const groups = GROUPS
    .map((g) => ({ name: g, items: visible.filter((n) => n.group === g) }))
    .filter((g) => g.items.length > 0);

  const pageTitle =
    pathname === '/profile'
      ? 'My Profile'
      : nav.find((n) => n.to === pathname)?.label ??
        nav.find((n) => n.to !== '/' && pathname.startsWith(n.to + '/'))?.label ??
        'Dashboard';

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const initials = admin?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ============ SIDEBAR ============ */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col overflow-hidden bg-brand-navy border-r border-white/[0.07] transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* navy texture layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(46,107,255,0.18),transparent_55%)]" />
        <div className="absolute -left-20 top-[45%] w-64 h-64 rounded-full bg-accent-gold/[0.07] blur-[90px]" />
        <div className="absolute inset-0 dots-grid opacity-30" />
        {/* right edge: gold→blue hairline */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-accent-gold/50 via-accent-blue/30 to-transparent" />

        {/* brand block */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-accent-gold/60 shadow-glow-gold shrink-0">
              <img src="/logo.jpeg" alt="Dream Ads" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="min-w-0">
              <p className="text-gradient-gold font-extrabold text-[15px] tracking-[0.14em] leading-tight">DREAM ADS</p>
              <p className="text-[10px] text-zinc-500 tracking-wide mt-0.5">Admin Control Center</p>
            </div>
          </div>
          <div className="mt-4 h-px bg-gradient-to-r from-accent-gold/45 via-white/10 to-transparent" />
        </div>

        {/* grouped nav */}
        <nav className="relative flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-3.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                {g.name}
              </p>
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white/[0.07] text-white'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.045]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-accent-gold to-accent-goldDark shadow-glow-gold" />
                        )}
                        <item.icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-accent-gold' : 'text-zinc-500 group-hover:text-accent-blue'
                          )}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* user card + sign out */}
        <div className="relative px-3 py-3 border-t border-white/[0.07] space-y-1.5">
          <button
            onClick={() => { setOpen(false); nav2('/profile'); }}
            title="Open my profile"
            className="flex w-full text-left items-center gap-3 px-2.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:border-accent-gold/35 hover:bg-white/[0.08] transition-all"
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-accent-gold/80 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/15">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green ring-2 ring-brand-navy" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">{admin?.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{admin?.email}</p>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent-gold/15 text-accent-gold">
              {admin?.role}
            </span>
          </button>
          <button
            onClick={() => { logout(); nav2('/login'); }}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-accent-red hover:bg-accent-red/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-brand-navy/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ============ MAIN ============ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="shrink-0 z-20 h-16 flex items-center justify-between gap-3 px-4 sm:px-6 bg-brand-navy/80 backdrop-blur-xl border-b border-white/[0.08]">
          {/* bottom gradient hairline */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent-gold/45 via-accent-blue/30 to-transparent" />

          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(!open)} className="lg:hidden btn-ghost p-2" aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white truncate leading-tight">{pageTitle}</p>
              <p className="hidden sm:block text-[11px] text-zinc-500 mt-0.5">Admin Control Center</p>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-zinc-400 shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-accent-gold/70" />
              {dateStr}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-ghost p-2 relative hover:border-accent-gold/40" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-gold shadow-glow-gold" />
            </button>

            {/* avatar dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-transparent hover:border-white/[0.1] hover:bg-white/[0.06] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-accent-gold/80 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/15">
                  {initials}
                </div>
                <span className="hidden md:block text-xs font-medium text-zinc-300">
                  {admin?.name?.split(' ')[0]}
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform', menu && 'rotate-180')} />
              </button>

              {menu && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-white/[0.1] bg-brand-navyLight/95 backdrop-blur-xl shadow-glow-blueSoft overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.04]">
                    <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{admin?.email}</p>
                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-gold/15 text-accent-gold">
                      {admin?.role}
                    </span>
                  </div>
                  <button
                    onClick={() => { setMenu(false); nav2('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]"
                  >
                    <UserCircle className="w-4 h-4" /> My profile
                  </button>
                  <button
                    onClick={() => { setMenu(false); logout(); nav2('/login'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-400 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
