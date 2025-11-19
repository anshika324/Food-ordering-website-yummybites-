import React, { useState } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import Logo from "./Logo";
import axios from "axios";
import { data } from "../restApi.json";
import ChatWidget from "./ChatWidget";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // 🔹 Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const API_URL = "https://food-ordering-website-backend-v7w7.onrender.com"; // change if backend runs elsewhere

  // 🔹 LOGIN Function
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem("token", res.data.access_token);
      alert("Login successful!");
      setShowModal(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.detail || "Login failed... New user! Please SignUp");
    }
  };

  // 🔹 SIGNUP Function
  const handleSignup = async () => {
    try {
      const res = await axios.post(`${API_URL}/signup`, { name, email, password });
      alert(res.data.message || "Signup successful!");
      setShowModal(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.detail || "Signup failed... User already exists!");
    }
  };

  return (
    <>
      <nav>
        <div className="logo">
          <Logo />
        </div>

        <div className={show ? "navLinks showmenu" : "navLinks"}>
          <div className="links">
            {data[0].navbarLinks.map((element) => (
              <ScrollLink
                to={element.link}
                spy={true}
                smooth={true}
                duration={500}
                key={element.id}
              >
                {element.title}
              </ScrollLink>
            ))}
          </div>

          <div className="navButtons">
            {/* ✅ Navigate to Menu Page */}
            <RouterLink to="/menu">
              <button className="menuBtn">OUR MENU</button>
            </RouterLink>


            {/* ✅ Open Login/Signup Modal */}
            <button className="loginBtn" onClick={() => setShowModal(true)}>
              LOGIN / SIGN UP
            </button>
          </div>
        </div>

        <div className="hamburger" onClick={() => setShow(!show)}>
          <GiHamburgerMenu />
        </div>
      </nav>

      {/* ✅ Login/Signup Modal */}
      {showModal && (
        <div className="modalOverlay" onClick={() => setShowModal(false)}>
          <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <button
                className={isLogin ? "activeTab" : ""}
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
              <button
                className={!isLogin ? "activeTab" : ""}
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </div>

            <div className="modalBody">
              {isLogin ? (
                <>
                  <h2>Welcome Back!</h2>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="submitBtn" onClick={handleLogin}>
                    Login
                  </button>
                </>
              ) : (
                <>
                  <h2>Create Account</h2>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="submitBtn" onClick={handleSignup}>
                    Sign Up
                  </button>
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

