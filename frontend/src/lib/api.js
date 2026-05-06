import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
export const API_BASE = BASE ? `${BASE}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const tok = localStorage.getItem("mf_token");
  if (tok) config.headers.Authorization = `Bearer ${tok}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup") && window.location.pathname !== "/") {
      // Don't blow up landing
    }
    return Promise.reject(err);
  }
);
