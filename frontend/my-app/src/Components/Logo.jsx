import React, { useEffect } from "react";
import "./Logo.css";

const Logo = () => {
  useEffect(() => {
    const text = document.querySelector(".yummy-text");
    text.innerHTML = text.textContent
      .split("")
      .map((letter, i) => `<span style="animation-delay:${i * 0.05}s">${letter}</span>`)
      .join("");
  }, []);

  return (
    <div className="logo-container">
      <h1 className="yummy-text">YummyBytes</h1>
    </div>
  );
};

export default Logo;
