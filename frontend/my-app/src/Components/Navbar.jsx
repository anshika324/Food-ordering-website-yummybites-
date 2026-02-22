// src/Components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { MdClose } from "react-icons/md";
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

  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, login, signup, logout } = useAuth();
  const { dark, toggle }                = useTheme();
  const navigate    = useNavigate();
  const btnRef      = useRef(null);
  const dropdownRef = useRef(null);

  const st = makeStyles(dark);

  const handleUserBtnClick = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowUserMenu((s) => !s);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const insideBtn      = btnRef.current      && btnRef.current.contains(e.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideBtn && !insideDropdown) setShowUserMenu(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!show) return;
    const close = (e) => {
      if (!e.target.closest("nav")) setShow(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [show]);

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

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate("/");
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {/* ── Inline styles for mobile menu ── */}
      <style>{`
        .nav-mobile-menu {
          display: none;
        }
        @media (max-width: 1100px) {
          .nav-desktop-links {
            display: none !important;
          }
          .nav-hamburger {
            display: flex !important;
          }
          .nav-mobile-menu {
            display: ${show ? "flex" : "none"};
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 15, 40, 0.97);
            z-index: 9999;
            align-items: center;
            justify-content: center;
            gap: 0;
            padding: 40px 30px;
          }
          .nav-mobile-close {
            position: absolute;
            top: 20px;
            right: 24px;
            background: none;
            border: none;
            color: #e0e0e0;
            font-size: 2rem;
            cursor: pointer;
          }
          .nav-mobile-links {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
            margin-bottom: 40px;
            padding-bottom: 40px;
            border-bottom: 1px solid rgba(255,255,255,0.12);
            width: 100%;
          }
          .nav-mobile-links a,
          .nav-mobile-links span {
            color: #cbd5e1;
            font-size: 22px;
            letter-spacing: 3px;
            text-decoration: none;
            cursor: pointer;
            font-family: "Oswald", sans-serif;
          }
          .nav-mobile-links a:hover,
          .nav-mobile-links span:hover {
            color: #fff;
          }
          .nav-mobile-buttons {
            display: flex;
            flex-direction: column;
            gap: 14px;
            width: 100%;
            max-width: 340px;
          }
          .nav-mobile-buttons button,
          .nav-mobile-buttons a button {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            letter-spacing: 1.5px;
            cursor: pointer;
          }
          .nav-mobile-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            color: #e0e0e0;
            font-family: "Oswald", sans-serif;
          }
          .nav-mobile-menu-btn {
            background: linear-gradient(135deg, #ff4d6d, #c9184a);
            border: none;
            border-radius: 10px;
            color: white;
            font-family: "Oswald", sans-serif;
          }
          .nav-mobile-login-btn {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.35);
            border-radius: 10px;
            color: #e0e0e0;
            font-family: "Oswald", sans-serif;
          }
          .nav-mobile-user-btn {
            background: #ff4d6d;
            border: none;
            border-radius: 10px;
            color: white;
            font-family: "Oswald", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
        }
        @media (min-width: 1101px) {
          .nav-hamburger { display: none !important; }
          .nav-desktop-links { display: flex !important; }
        }
      `}</style>

      <nav>
        <div className="logo"><Logo /></div>

        {/* ── Desktop nav links ── */}
        <div className="navLinks nav-desktop-links">
          <div className="links">
            {data[0].navbarLinks.map((element) => (
              <ScrollLink to={element.link} spy smooth duration={500} key={element.id}>
                {element.title}
              </ScrollLink>
            ))}
          </div>
          <div className="navButtons">
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

        {/* ── Hamburger icon ── */}
        <button
          className="nav-hamburger"
          style={{ background: "none", border: "none", color: "#e0e0e0", fontSize: "1.8rem", cursor: "pointer", display: "none" }}
          onClick={() => setShow(true)}
          aria-label="Open menu"
        >
          <GiHamburgerMenu />
        </button>
      </nav>

      {/* ── Full-screen mobile menu ── */}
      <div className="nav-mobile-menu">
        <button className="nav-mobile-close" onClick={() => setShow(false)}>
          <MdClose />
        </button>

        {/* Links */}
        <div className="nav-mobile-links">
          {data[0].navbarLinks.map((element) => (
            <ScrollLink
              to={element.link}
              spy
              smooth
              duration={500}
              key={element.id}
              onClick={() => setShow(false)}
            >
              {element.title}
            </ScrollLink>
          ))}
        </div>

        {/* Buttons */}
        <div className="nav-mobile-buttons">
          {/* Dark toggle */}
          <button className="nav-mobile-toggle" onClick={() => { toggle(); }}>
            {dark ? <FaSun size={16} /> : <FaMoon size={16} />}
            <span>{dark ? "Switch to Light" : "Switch to Dark"}</span>
          </button>

          {/* OUR MENU */}
          <RouterLink to="/menu" style={{ width: "100%" }} onClick={() => setShow(false)}>
            <button className="nav-mobile-menu-btn">OUR MENU</button>
          </RouterLink>

          {/* User or Login */}
          {user ? (
            <>
              {isAdmin && (
                <RouterLink to="/admin" style={{ width: "100%" }} onClick={() => setShow(false)}>
                  <button className="nav-mobile-user-btn">
                    <FaUserShield size={16} /> ADMIN PANEL
                  </button>
                </RouterLink>
              )}
              <RouterLink to="/order-history" style={{ width: "100%" }} onClick={() => setShow(false)}>
                <button className="nav-mobile-user-btn" style={{ background: "rgba(255,77,109,0.7)" }}>
                  <FaHistory size={16} /> ORDER HISTORY
                </button>
              </RouterLink>
              <button
                className="nav-mobile-login-btn"
                onClick={() => { handleLogout(); setShow(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <FaSignOutAlt size={14} /> LOGOUT ({user.name || user.email.split("@")[0]})
              </button>
            </>
          ) : (
            <button
              className="nav-mobile-login-btn"
              onClick={() => { setShowModal(true); setIsLogin(true); setShow(false); }}
            >
              LOGIN / SIGN UP
            </button>
          )}
        </div>
      </div>

      {/* ── User dropdown (desktop) ── */}
      {showUserMenu && user && (
        <div ref={dropdownRef} style={{ ...st.dropdown, top: dropdownPos.top, right: dropdownPos.right }}>
          <div style={st.dropdownHeader}>
            <div style={st.dropdownName}>{user.name || "User"}</div>
            <div style={st.dropdownEmail}>{user.email}</div>
          </div>
          {isAdmin && (
            <RouterLink to="/admin" style={{ ...st.dropdownItem, color: "#e91e63" }} onClick={() => setShowUserMenu(false)}>
              <FaUserShield style={{ marginRight: 10 }} /> Admin Panel
            </RouterLink>
          )}
          <RouterLink to="/order-history" style={st.dropdownItem} onClick={() => setShowUserMenu(false)}>
            <FaHistory style={{ marginRight: 10 }} /> Order History
          </RouterLink>
          <div style={st.divider} />
          <button style={st.dropdownLogout} onClick={handleLogout}>
            <FaSignOutAlt style={{ marginRight: 10 }} /> Logout
          </button>
        </div>
      )}

      {/* ── Login / Signup Modal ── */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={st.closeModal}>✕</button>
            <div className="modalHeader">
              <button className={isLogin ? "activeTab" : ""} onClick={() => { setIsLogin(true); setName(""); setEmail(""); setPassword(""); }}>Login</button>
              <button className={!isLogin ? "activeTab" : ""} onClick={() => { setIsLogin(false); setName(""); setEmail(""); setPassword(""); }}>Sign Up</button>
            </div>
            <div className="modalBody">
              {isLogin ? (
                <>
                  <h2 style={st.formTitle}>Welcome Back! 👋</h2>
                  <p style={st.formSubtitle}>Login to access your orders</p>
                  <input type="email" placeholder="Email address" value={email} name="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                  <input type="password" placeholder="Password" value={password} name="password" autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
                  <button className="submitBtn" onClick={handleLogin} disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Logging in..." : "Login"}
                  </button>
                  <p style={st.switchText}>New here?{" "}<span style={st.switchLink} onClick={() => setIsLogin(false)}>Create an account</span></p>
                </>
              ) : (
                <>
                  <h2 style={st.formTitle}>Create Account 🍽️</h2>
                  <p style={st.formSubtitle}>Join YummyBites today</p>
                  <input type="text" placeholder="Full Name" value={name} name="name" autoComplete="name" onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                  <input type="email" placeholder="Email address" value={email} name="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
                  <input type="password" placeholder="Password (min 6 characters)" value={password} name="new-password" autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
                  <button className="submitBtn" onClick={handleSignup} disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Creating account..." : "Sign Up"}
                  </button>
                  <p style={st.switchText}>Already have an account?{" "}<span style={st.switchLink} onClick={() => setIsLogin(true)}>Login</span></p>
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

const makeStyles = (dark) => ({
  userBtn: {
    display: "flex", alignItems: "center", padding: "8px 18px",
    background: "#ff4d6d", color: "#fff", border: "none",
    borderRadius: "20px", fontSize: "15px", cursor: "pointer",
    fontFamily: "Oswald, sans-serif", letterSpacing: "0.5px",
  },
  dropdown: {
    position: "fixed",
    background: dark ? "#16213e" : "#fff",
    border: `1px solid ${dark ? "#2a2a3e" : "#f0f0f0"}`,
    borderRadius: "14px",
    boxShadow: dark ? "0 8px 30px rgba(0,0,0,0.55)" : "0 8px 30px rgba(0,0,0,0.18)",
    minWidth: "215px", zIndex: 99999, overflow: "hidden",
  },
  dropdownHeader: {
    padding: "14px 16px 12px",
    borderBottom: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}`,
    background: dark ? "#1a1a2e" : "#fff7f9",
  },
  dropdownName: { fontWeight: 700, fontSize: 15, color: dark ? "#e0e0e0" : "#222", fontFamily: "Oswald, sans-serif" },
  dropdownEmail: { fontSize: 12, color: dark ? "#666" : "#888", marginTop: 2 },
  dropdownItem: {
    display: "flex", alignItems: "center", padding: "13px 16px",
    fontSize: "15px", color: dark ? "#cccccc" : "#333",
    textDecoration: "none", cursor: "pointer",
    fontFamily: "Oswald, sans-serif", background: "transparent",
    borderBottom: `1px solid ${dark ? "#1a1a2e" : "#fafafa"}`,
  },
  divider: { height: 1, background: dark ? "#2a2a3e" : "#f0f0f0" },
  dropdownLogout: {
    display: "flex", alignItems: "center", width: "100%",
    padding: "13px 16px", fontSize: "15px", color: "#ff4d6d",
    background: "none", border: "none", cursor: "pointer",
    fontFamily: "Oswald, sans-serif", textAlign: "left",
  },
  closeModal: {
    position: "absolute", top: "14px", right: "16px",
    background: "none", border: "none", fontSize: "18px",
    cursor: "pointer", color: dark ? "#777" : "#888",
  },
  formTitle: { fontSize: "22px", color: dark ? "#e0e0e0" : "#222", marginBottom: "4px", fontFamily: "Oswald, sans-serif" },
  formSubtitle: { fontSize: "14px", color: dark ? "#777" : "#888", marginBottom: "8px" },
  switchText: { textAlign: "center", fontSize: "14px", color: dark ? "#777" : "#666", marginTop: "4px" },
  switchLink: { color: "#ff4d6d", cursor: "pointer", fontWeight: "600" },
});