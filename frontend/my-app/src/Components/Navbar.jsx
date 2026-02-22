// src/Components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaUserCircle, FaHistory, FaSignOutAlt, FaUserShield, FaMoon, FaSun } from "react-icons/fa";
import Logo from "./Logo";
import { data } from "../restApi.json";
import ChatWidget from "./ChatWidget";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@yummybites.com";

const Navbar = () => {
  const [show, setShow]                 = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [isLogin, setIsLogin]           = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dropdownPos, setDropdownPos]   = useState({ top: 0, right: 0 });

  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, login, signup, logout } = useAuth();
  const { dark, toggle }                = useTheme();   // ← dark mode hook
  const navigate    = useNavigate();
  const btnRef      = useRef(null);
  const dropdownRef = useRef(null);   // ✅ ref to the dropdown itself

  // makeStyles(dark) called here so every inline style responds instantly to toggle
  const st = makeStyles(dark);

  // ── Open dropdown and calculate fixed position ──
  const handleUserBtnClick = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowUserMenu((s) => !s);
  };

  // ✅ FIX: close only when click is OUTSIDE both the button AND the dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const insideBtn      = btnRef.current      && btnRef.current.contains(e.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideBtn && !insideDropdown) {
        setShowUserMenu(false);
      }
    };
    // ✅ Use 'click' not 'mousedown' — so RouterLink onClick fires first, THEN we close
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ── Login ──
  const handleLogin = async () => {
    if (!email || !password) { toast.error("Please fill in all fields."); return; }
    setSubmitting(true);
    try {
      await login(email, password);
      setShowModal(false);
      setEmail(""); setPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setSubmitting(false); }
  };

  // ── Signup ──
  const handleSignup = async () => {
    if (!name || !email || !password) { toast.error("Please fill in all fields."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setSubmitting(true);
    try {
      await signup(name, email, password);
      setIsLogin(true);
      setName(""); setEmail(""); setPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed. Email may already be registered.");
    } finally { setSubmitting(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") isLogin ? handleLogin() : handleSignup();
  };

  // ── Logout ──
  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate("/");
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      <nav>
        <div className="logo"><Logo /></div>

        <div className={show ? "navLinks showmenu" : "navLinks"}>
          <div className="links">
            {data[0].navbarLinks.map((element) => (
              <ScrollLink to={element.link} spy smooth duration={500} key={element.id}>
                {element.title}
              </ScrollLink>
            ))}
          </div>

          <div className="navButtons">
            {/* 🌙 Dark/Light toggle — before OUR MENU, styled via CSS class */}
            <button onClick={toggle} className="darkToggleBtn" title="Toggle dark mode">
              {dark ? <FaSun size={15} /> : <FaMoon size={15} />}
              <span>{dark ? "Light" : "Dark"}</span>
            </button>

            <RouterLink to="/menu">
              <button className="menuBtn">OUR MENU</button>
            </RouterLink>

            {user ? (
              <div style={{ position: "relative" }}>
                <button ref={btnRef} style={st.userBtn} onClick={handleUserBtnClick}>
                  <FaUserCircle size={18} style={{ marginRight: 6 }} />
                  {user.name || user.email.split("@")[0]}
                </button>
              </div>
            ) : (
              <button className="loginBtn" onClick={() => { setShowModal(true); setIsLogin(true); }}>
                LOGIN / SIGN UP
              </button>
            )}
          </div>
        </div>

        <div className="hamburger" onClick={() => setShow(!show)}>
          <GiHamburgerMenu />
        </div>
      </nav>

      {/* ── Dropdown: position:fixed to escape overflow:hidden parents ── */}
      {showUserMenu && user && (
        <div
          ref={dropdownRef}     // ✅ attach ref so click-outside check works
          style={{ ...st.dropdown, top: dropdownPos.top, right: dropdownPos.right }}
        >
          {/* User info header */}
          <div style={st.dropdownHeader}>
            <div style={st.dropdownName}>{user.name || "User"}</div>
            <div style={st.dropdownEmail}>{user.email}</div>
          </div>

          {/* Admin Panel — only for admin email */}
          {isAdmin && (
            <RouterLink
              to="/admin"
              style={{ ...st.dropdownItem, color: "#e91e63" }}
              onClick={() => setShowUserMenu(false)}
            >
              <FaUserShield style={{ marginRight: 10 }} />
              Admin Panel
            </RouterLink>
          )}

          {/* Order History */}
          <RouterLink
            to="/order-history"
            style={st.dropdownItem}
            onClick={() => setShowUserMenu(false)}
          >
            <FaHistory style={{ marginRight: 10 }} />
            Order History
          </RouterLink>

          <div style={st.divider} />

          {/* Logout */}
          <button style={st.dropdownLogout} onClick={handleLogout}>
            <FaSignOutAlt style={{ marginRight: 10 }} />
            Logout
          </button>
        </div>
      )}

      {/* ── Login / Signup Modal ── */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={st.closeModal}>✕</button>

            <div className="modalHeader">
              <button className={isLogin ? "activeTab" : ""}
                onClick={() => { setIsLogin(true); setName(""); setEmail(""); setPassword(""); }}>
                Login
              </button>
              <button className={!isLogin ? "activeTab" : ""}
                onClick={() => { setIsLogin(false); setName(""); setEmail(""); setPassword(""); }}>
                Sign Up
              </button>
            </div>

            <div className="modalBody">
              {isLogin ? (
                <>
                  <h2 style={st.formTitle}>Welcome Back! 👋</h2>
                  <p style={st.formSubtitle}>Login to access your orders</p>
                  <input type="email" placeholder="Email address" value={email}
                    name="email" autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                  <input type="password" placeholder="Password" value={password}
                    name="password" autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
                  <button className="submitBtn" onClick={handleLogin}
                    disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Logging in..." : "Login"}
                  </button>
                  <p style={st.switchText}>
                    New here?{" "}
                    <span style={st.switchLink} onClick={() => setIsLogin(false)}>
                      Create an account
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <h2 style={st.formTitle}>Create Account 🍽️</h2>
                  <p style={st.formSubtitle}>Join YummyBites today</p>
                  <input type="text" placeholder="Full Name" value={name}
                    name="name" autoComplete="name"
                    onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                  <input type="email" placeholder="Email address" value={email}
                    name="email" autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
                  <input type="password" placeholder="Password (min 6 characters)" value={password}
                    name="new-password" autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
                  <button className="submitBtn" onClick={handleSignup}
                    disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Creating account..." : "Sign Up"}
                  </button>
                  <p style={st.switchText}>
                    Already have an account?{" "}
                    <span style={st.switchLink} onClick={() => setIsLogin(true)}>Login</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </>
  );
};

export default Navbar;

// ─────────────────────────────────────────────────────────────────────────────
// makeStyles(dark)
// Original `styles` object converted to a function so dark-aware colours work.
// Every key is IDENTICAL to the original. Light-mode values are unchanged.
// Only colours that need to flip in dark mode are wrapped in ternaries.
// ─────────────────────────────────────────────────────────────────────────────
const makeStyles = (dark) => ({
  userBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 18px",
    background: "#ff4d6d",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    fontSize: "15px",
    cursor: "pointer",
    fontFamily: "Oswald, sans-serif",
    letterSpacing: "0.5px",
   
  },
  dropdown: {
    position: "fixed",            // escapes overflow:hidden on all parents — unchanged
    background: dark ? "#16213e" : "#fff",
    border:     `1px solid ${dark ? "#2a2a3e" : "#f0f0f0"}`,
    borderRadius: "14px",
    boxShadow: dark
      ? "0 8px 30px rgba(0,0,0,0.55)"
      : "0 8px 30px rgba(0,0,0,0.18)",
    minWidth: "215px",
    zIndex: 99999,                // above everything including ChatWidget — unchanged
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "14px 16px 12px",
    borderBottom: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}`,
    background:    dark ? "#1a1a2e" : "#fff7f9",
  },
  dropdownName: {
    fontWeight: 700,
    fontSize: 15,
    color: dark ? "#e0e0e0" : "#222",
    fontFamily: "Oswald, sans-serif",
  },
  dropdownEmail: {
    fontSize: 12,
    color: dark ? "#666" : "#888",
    marginTop: 2,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "13px 16px",
    fontSize: "15px",
    color: dark ? "#cccccc" : "#333",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "Oswald, sans-serif",
    background: "transparent",
    borderBottom: `1px solid ${dark ? "#1a1a2e" : "#fafafa"}`,
  },
  divider: {
    height: 1,
    background: dark ? "#2a2a3e" : "#f0f0f0",
  },
  dropdownLogout: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "13px 16px",
    fontSize: "15px",
    color: "#ff4d6d",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "Oswald, sans-serif",
    textAlign: "left",
  },
  closeModal: {
    position: "absolute",
    top: "14px",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: dark ? "#777" : "#888",
  },
  formTitle: {
    fontSize: "22px",
    color: dark ? "#e0e0e0" : "#222",
    marginBottom: "4px",
    fontFamily: "Oswald, sans-serif",
  },
  formSubtitle: {
    fontSize: "14px",
    color: dark ? "#777" : "#888",
    marginBottom: "8px",
  },
  switchText: {
    textAlign: "center",
    fontSize: "14px",
    color: dark ? "#777" : "#666",
    marginTop: "4px",
  },
  switchLink: {
    color: "#ff4d6d",
    cursor: "pointer",
    fontWeight: "600",
  },
});

