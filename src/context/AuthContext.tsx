import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthCtx {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAdmin: (patch: Partial<Pick<AdminUser, 'name' | 'email'>>) => void;
  can: (perm: string) => boolean;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem('da_admin_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading] = useState(false);

  useEffect(() => {
    if (admin) localStorage.setItem('da_admin_user', JSON.stringify(admin));
    else localStorage.removeItem('da_admin_user');
  }, [admin]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/admin/login', { email, password });
    localStorage.setItem('da_admin_token', data.data.token);
    setAdmin(data.data.admin);
  };

  const logout = () => {
    localStorage.removeItem('da_admin_token');
    setAdmin(null);
  };

  const updateAdmin = (patch: Partial<Pick<AdminUser, 'name' | 'email'>>) => {
    setAdmin((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const can = (perm: string) => {
    if (!admin) return false;
    return admin.permissions.includes('*') || admin.permissions.includes(perm);
  };

  return <Ctx.Provider value={{ admin, login, logout, updateAdmin, can, loading }}>{children}</Ctx.Provider>;
}
