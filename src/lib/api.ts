import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('da_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes('/admin/login')) {
      localStorage.removeItem('da_admin_token');
      localStorage.removeItem('da_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
