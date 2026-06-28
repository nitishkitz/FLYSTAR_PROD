import axios from "axios";
import { BACKEND_BASE } from "./backendBase";

export const api = axios.create({
  baseURL: `${BACKEND_BASE}/api`,
  withCredentials: true,
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  const tok = localStorage.getItem("flystar_token");
  if (tok && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});

export function setToken(token) {
  if (token) localStorage.setItem("flystar_token", token);
  else localStorage.removeItem("flystar_token");
}

export function getToken() {
  return localStorage.getItem("flystar_token");
}

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function errMsg(e) {
  return formatApiError(e?.response?.data?.detail) || e?.message || "Error";
}
