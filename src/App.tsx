import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Kyc from './pages/Kyc';
import Content from './pages/Content';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import Referrals from './pages/Referrals';
import RolesAudit from './pages/RolesAudit';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Vouchers from './pages/Vouchers';
import WalletLedger from './pages/WalletLedger';
import Leads from './pages/Leads';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import { ReactNode } from 'react';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });

function Protected({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  return admin ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><AdminLayout /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/kyc" element={<Kyc />} />
              <Route path="/wallet" element={<WalletLedger />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/content" element={<Content />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/roles" element={<RolesAudit />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
