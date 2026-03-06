import axios from "axios";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// ── Axios instance with long timeout ──────────────────────────────────────────
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,         
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT automatically ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yb_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: retry on timeout / network error ────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    config._retryCount = config._retryCount || 0;

    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      !error.response;

    if (isTimeout && config._retryCount < 2) {
      config._retryCount += 1;
      console.warn(
        `[api] Request timed out. Retry ${config._retryCount}/2 …`
      );
      await new Promise((r) => setTimeout(r, 3000)); 
      return api(config);
    }

    return Promise.reject(error);
  }
);

// ── Wake backend on app load ──────────────────────────────────────────────────

let woken = false;
export const wakeBackend = async () => {
  if (woken) return;
  woken = true;
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 60000 });
    console.log("[api] Backend is awake ✓");
  } catch {
    console.warn("[api] Wake ping failed — backend may still be sleeping.");
  }
};

export default api;