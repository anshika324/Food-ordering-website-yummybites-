// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import api, { wakeBackend } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: wake backend + restore session from localStorage
  useEffect(() => {
    wakeBackend(); // silent ping so Render warms up immediately

    const token = localStorage.getItem("yb_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Validate stored token
    api
      .get("/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("yb_token"); // expired / invalid
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });
    const { access_token } = res.data;
    localStorage.setItem("yb_token", access_token);

    // Fetch full user profile
    const me = await api.get("/user/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setUser(me.data);
    return me.data;
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const signup = async (name, email, password) => {
    await api.post("/signup", { name, email, password });
    // After signup, auto-login
    return login(email, password);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("yb_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);