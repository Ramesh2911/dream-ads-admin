import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCoins(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const apiBase = import.meta.env.VITE_API_BASE || '/api';

/** Resolve a stored video/thumbnail value: absolute URL passthrough, else API media path. */
export function mediaSrc(file?: string | null): string {
  if (!file) return '';
  if (file.startsWith('http')) return file;
  return `${apiBase}/videos/media/${file}`;
}
