// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("yb_theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("yb_theme", dark ? "dark" : "light");
    // Apply class to <html> so global CSS variables can respond
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
