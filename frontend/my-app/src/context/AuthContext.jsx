// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // { email, name }
  const [loading, setLoading] = useState(true); // true while checking saved token

  // ─── On app load: check if a valid token exists in localStorage ───
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      try {
        const res = await axios.get(`${BACKEND_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data); // { email, name }
      } catch {
        // Token expired or invalid — clear it
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, []);

  // ─── Login ───
  const login = async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/login`, { email, password });
    const token = res.data.access_token;
    localStorage.setItem("token", token);

    // Fetch user profile right after login
    const userRes = await axios.get(`${BACKEND_URL}/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUser(userRes.data);
    toast.success(`Welcome back, ${userRes.data.name || userRes.data.email}! 👋`);
  };

  // ─── Signup ───
  const signup = async (name, email, password) => {
    await axios.post(`${BACKEND_URL}/signup`, { name, email, password });
    toast.success("Account created! Please log in.");
  };

  // ─── Logout ───
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Logged out successfully.");
  };

  // ─── Get auth header for protected API calls ───
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — use this anywhere in the app
export const useAuth = () => useContext(AuthContext);