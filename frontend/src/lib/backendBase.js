export const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.REACT_APP_BACKEND_URL ||
  (import.meta.env.PROD ? '/_/backend' : '');
