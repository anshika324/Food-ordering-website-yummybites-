import React, { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { Link } from "react-router-dom";

const CartIcon = () => {
  const [cartCount, setCartCount] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const updateCartCount = () => {
      const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCartCount(storedCart.reduce((sum, item) => sum + item.quantity, 0));
    };

    updateCartCount();

    // listen to storage changes from other tabs or pages
    window.addEventListener("storage", updateCartCount);

    // custom event from add-to-cart button
    window.addEventListener("cart-updated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  // Trigger bounce animation when count changes
  useEffect(() => {
    if (cartCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  return (
    <Link to="/cart" style={styles.iconContainer}>
      <FaShoppingCart
        size={28}
        style={{
          ...styles.icon,
          transform: animate ? "scale(1.3)" : "scale(1)",
          transition: "transform 0.3s ease",
        }}
      />
      {cartCount > 0 && (
        <span style={styles.badge}>{cartCount}</span>
      )}
    </Link>
  );
};

const styles = {
  iconContainer: {
    position: "fixed",
    top: "20px",
    right: "25px",
    background: "#e91e63",
    color: "#fff",
    borderRadius: "50%",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    zIndex: 1000,
  },
  icon: {
    color: "#fff",
  },
  badge: {
    position: "absolute",
    top: "5px",
    right: "5px",
    background: "#fff",
    color: "#e91e63",
    fontSize: "12px",
    fontWeight: "bold",
    borderRadius: "50%",
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default CartIcon;
