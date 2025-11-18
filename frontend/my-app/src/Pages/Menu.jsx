import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import CartIcon from "../Components/CartIcon";
import ChatWidget from "../Components/ChatWidget";

const Menu = () => {
  const [dishes, setDishes] = useState([]);
  const [filteredDishes, setFilteredDishes] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const navigate = useNavigate();

  // ✅ Fetch menu from backend
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/menu");
        const data = await res.json();
        console.log("✅ Fetched menu data:", data);

        const menuData = Array.isArray(data) ? data : data.menu || [];
        setDishes(menuData);
        setFilteredDishes(menuData);
      } catch (err) {
        console.error("❌ Error fetching menu:", err);
        setDishes([]);
        setFilteredDishes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // ✅ Fetch categories dynamically
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/menu/categories");
        const data = await res.json();
        if (data.categories) {
          setCategories(["All", ...data.categories]);
        }
        console.log("✅ Categories fetched:", data.categories);
      } catch (err) {
        console.error("❌ Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // ✅ Add to Cart (localStorage)
  const handleAddToCart = (dish) => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((item) => item._id === dish._id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...dish, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${dish.name} added to cart!`);
    window.dispatchEvent(new Event("cart-updated"));
  };

  // ✅ Filter dishes by selected category
  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === "All") {
      setFilteredDishes(dishes);
    } else {
      setFilteredDishes(
        dishes.filter(
          (dish) =>
            dish.category?.toLowerCase() === cat.toLowerCase() ||
            dish.type?.toLowerCase() === cat.toLowerCase()
        )
      );
    }
  };

  return (
    <>
      <CartIcon />

      <div style={styles.container}>
        {/* 🏠 Back to Home Button */}
        <Link to="/" style={styles.homeBtnFixed}>
          <FaHome style={{ marginRight: "6px" }} /> Home
        </Link>

        <h1 style={styles.heading}>🍴 Our Menu</h1>

        {/* 🔹 Category Filter */}
        <div style={styles.filterContainer}>
          <label style={styles.label}>Filter by Category:</label>
          <select
            style={styles.select}
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 🍽️ Menu List */}
        {loading ? (
          <p style={styles.loading}>Loading menu...</p>
        ) : (
          <div style={styles.list}>
            {Array.isArray(filteredDishes) && filteredDishes.length > 0 ? (
              filteredDishes.map((dish) => (
                <div key={dish._id} style={styles.card}>
                  <img
                    src={dish.image || "https://via.placeholder.com/120?text=No+Image"}
                    alt={dish.name}
                    style={styles.image}
                  />
                  <div style={styles.info}>
                    <h3 style={styles.name}>{dish.name}</h3>
                    <p style={styles.desc}>{dish.description}</p>
                    <p style={styles.price}>{dish.price}</p>
                    <button
                      onClick={() => handleAddToCart(dish)}
                      style={styles.button}
                    >
                      Add to Cart 🛒
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={styles.loading}>No dishes found 😞</p>
            )}
          </div>
        )}

        {/* Floating View Cart Button */}
        <button style={styles.cartBtn} onClick={() => navigate("/cart")}>
          🛍️ View Cart
        </button>
      </div>

      {/* 🧠 Foodie AI Assistant */}
      <ChatWidget />
    </>
  );
};

// ===============================
// 🎨 Styling
// ===============================
const styles = {
  container: {
    padding: "40px 20px",
    backgroundColor: "#fff7f9",
    minHeight: "100vh",
  },
  heading: {
    textAlign: "center",
    fontSize: "2.2rem",
    color: "#e91e63",
    marginBottom: "30px",
  },
  filterContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "20px",
  },
  label: {
    marginRight: "10px",
    fontWeight: "bold",
    color: "#444",
  },
  select: {
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  card: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  image: {
    width: "100px",
    height: "100px",
    borderRadius: "12px",
    objectFit: "cover",
    marginRight: "15px",
  },
  info: { flex: 1 },
  name: { fontSize: "1.2rem", fontWeight: "bold", color: "#333" },
  desc: { fontSize: "0.9rem", color: "#666" },
  price: { color: "#e91e63", fontWeight: "600" },
  button: {
    marginTop: "8px",
    padding: "8px 12px",
    backgroundColor: "#e91e63",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
  },
  cartBtn: {
    position: "fixed",
    bottom: "100px", // ✅ above ChatWidget
    right: "20px",
    backgroundColor: "#e91e63",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    zIndex: 100,
  },
  homeBtnFixed: {
    position: "fixed",
    top: "20px",
    left: "20px",
    background: "#e91e63",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 18px",
    borderRadius: "30px",
    fontWeight: "bold",
    boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    transition: "0.3s",
    zIndex: 1000,
  },
  loading: {
    textAlign: "center",
    color: "#666",
  },
};

export default Menu;