import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('glass p-6 animate-fade-in', className)}>{children}</div>;
}

export function StatCard({ label, value, icon, accent = 'violet', sub }: {
  label: string; value: string | number; icon: ReactNode; accent?: 'violet' | 'gold' | 'green' | 'red' | 'blue'; sub?: string;
}) {
  const accents = {
    violet: 'from-accent-violet/20 to-accent-violet/5 text-accent-violet',
    gold: 'from-accent-gold/20 to-accent-gold/5 text-accent-gold',
    green: 'from-accent-green/20 to-accent-green/5 text-accent-green',
    red: 'from-accent-red/20 to-accent-red/5 text-accent-red',
    blue: 'from-accent-blue/20 to-accent-blue/5 text-accent-blue',
  };
  return (
    <div className="glass glass-hover p-5 animate-slide-up group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={cn('p-3 rounded-xl bg-gradient-to-br group-hover:scale-110 transition-transform', accents[accent])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const styles = {
    default: 'bg-white/10 text-zinc-300',
    success: 'bg-accent-green/15 text-accent-green',
    warning: 'bg-accent-gold/15 text-accent-gold',
    danger: 'bg-accent-red/15 text-accent-red',
    info: 'bg-accent-blue/15 text-accent-blue',
  };
  return <span className={cn('badge', styles[variant])}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="glass p-12 text-center animate-fade-in">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-violet/20 to-accent-blue/10 flex items-center justify-center mb-4">
        <span className="text-2xl">✦</span>
      </div>
      <p className="text-white font-semibold">{title}</p>
      {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('glass relative animate-slide-up max-h-[85vh] overflow-y-auto p-6 w-full', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 p-1 glass w-fit mb-6">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
            active === t.key ? 'bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-glow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs opacity-70">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
