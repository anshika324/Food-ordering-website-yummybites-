// src/Pages/Menu.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaHome, FaSearch, FaTimes, FaStar, FaMoon, FaSun } from "react-icons/fa";
import CartIcon from "../Components/CartIcon";
import ChatWidget from "../Components/ChatWidget";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const PLACEHOLDER  = "https://via.placeholder.com/100?text=Food";
const PAGE_SIZE    = 8; // items per page

// ── Star rating display ──
const Stars = ({ value, size = 13, interactive = false, onRate }) => (
  <div style={{ display: "inline-flex", gap: 2 }}>
    {[1,2,3,4,5].map(n => (
      <FaStar
        key={n}
        size={size}
        style={{ cursor: interactive ? "pointer" : "default", color: n <= value ? "#f59e0b" : "#ddd", transition: "color 0.15s" }}
        onClick={() => interactive && onRate && onRate(n)}
      />
    ))}
  </div>
);

// ── Skeleton card ──
const SkeletonCard = ({ dark }) => (
  <div style={{ ...cardStyle(dark), gap: 14 }}>
    <div style={{ width: 100, height: 100, borderRadius: 12, background: dark ? "#2a2a2a" : "#f0f0f0", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
    <div style={{ flex: 1 }}>
      {[60, 80, 40, 100].map((w, i) => (
        <div key={i} style={{ height: 13, width: `${w}%`, background: dark ? "#2a2a2a" : "#f0f0f0", borderRadius: 6, marginBottom: 10, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  </div>
);

function cardStyle(dark) {
  return { display: "flex", alignItems: "center", backgroundColor: dark ? "#16213e" : "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", gap: 14 };
}

// ── Rating modal ──
const RatingModal = ({ dish, onClose, dark, getAuthHeader }) => {
  const [stars,   setStars]   = useState(0);
  const [comment, setComment] = useState("");
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    if (!stars) { toast.error("Please select a star rating"); return; }
    setSaving(true);
    try {
      await axios.post(`${BACKEND_URL}/api/v1/ratings/`, { dish_id: dish._id, stars, comment }, { headers: getAuthHeader() });
      toast.success("Rating saved! ⭐");
      onClose(true); // true = refresh
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save rating");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: dark ? "#1a1a2e" : "#fff", borderRadius: 20, padding: 28, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h3 style={{ margin: "0 0 4px", color: dark ? "#fff" : "#222", fontFamily: "Oswald, sans-serif", fontSize: 20 }}>Rate {dish.name}</h3>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>How was it? Your review helps others</p>
        <div style={{ marginBottom: 16 }}>
          <Stars value={stars} size={28} interactive onRate={setStars} />
          {stars > 0 && <span style={{ marginLeft: 10, color: "#f59e0b", fontWeight: 700, fontFamily: "Oswald, sans-serif" }}>{["", "Poor", "Fair", "Good", "Great", "Excellent!"][stars]}</span>}
        </div>
        <textarea
          placeholder="Leave a comment (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${dark ? "#333" : "#ddd"}`, background: dark ? "#0f3460" : "#f9f9f9", color: dark ? "#eee" : "#333", fontSize: 14, resize: "none", height: 80, boxSizing: "border-box", outline: "none", fontFamily: "Oswald, sans-serif" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => onClose(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${dark ? "#333" : "#ddd"}`, background: "none", color: dark ? "#aaa" : "#666", cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 14 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#e91e63", color: "#fff", cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 14, fontWeight: 700 }}>
            {saving ? "Saving..." : "Submit ⭐"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Menu = () => {
  const [dishes, setDishes]         = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("All");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [ratingsMap, setRatingsMap] = useState({});  // dish_id → {average, count}
  const [ratingDish, setRatingDish] = useState(null); // dish being rated
  const navigate  = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { dark, toggle }        = useTheme();

  // ── Fetch menu ──
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${BACKEND_URL}/api/v1/menu`);
        const data = await res.json();
        setDishes(Array.isArray(data) ? data : data.menu || []);
      } catch { setDishes([]); }
      finally { setLoading(false); }
    };
    fetch_();
  }, []);

  // ── Fetch categories ──
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/menu/categories`)
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(["All", ...d.categories]); })
      .catch(() => {});
  }, []);

  // ── Fetch ratings for all visible dishes ──
  const fetchRatings = useCallback(async (dishIds) => {
    const results = await Promise.allSettled(
      dishIds.map(id => axios.get(`${BACKEND_URL}/api/v1/ratings/${id}`))
    );
    const map = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        map[dishIds[i]] = { average: r.value.data.average, count: r.value.data.count };
      }
    });
    setRatingsMap(prev => ({ ...prev, ...map }));
  }, []);

  // ── Add to cart ──
  const handleAddToCart = (dish) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const ex = cart.find(i => i._id === dish._id);
    if (ex) ex.quantity += 1; else cart.push({ ...dish, quantity: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    toast.success(`${dish.name} added to cart! 🛒`);
  };

  // ── Combined filter ──
  const filtered = useMemo(() => {
    let r = dishes;
    if (category !== "All") r = r.filter(d => d.category?.toLowerCase() === category.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(d => d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q));
    }
    return r;
  }, [dishes, category, search]);

  // ── Pagination ──
  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, category]);

  // Fetch ratings when visible dishes change
  useEffect(() => {
    if (paginated.length) fetchRatings(paginated.map(d => d._id));
  }, [paginated.map(d => d._id).join(",")]);

  const bg     = dark ? "#0f0f1a" : "#fff7f9";
  const text   = dark ? "#e0e0e0" : "#333";
  const cardBg = dark ? "#16213e" : "#fff";

  return (
    <>
      <CartIcon />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}} body{background:${bg};transition:background 0.3s}`}</style>

      <div style={{ padding: "80px 20px 120px", backgroundColor: bg, minHeight: "100vh", fontFamily: "Oswald, sans-serif", color: text }}>

        <Link to="/" style={styles.homeBtn}>
          <FaHome style={{ marginRight: 6 }} /> Home
        </Link>

        {/* Dark mode toggle */}
        <button onClick={toggle} style={{ position: "fixed", top: 20, right: 100, background: dark ? "#e91e63" : "#333", color: "#fff", border: "none", borderRadius: 30, padding: "10px 16px", cursor: "pointer", zIndex: 1000, display: "flex", alignItems: "center", gap: 6, fontFamily: "Oswald, sans-serif", fontSize: 14 }}>
          {dark ? <FaSun size={14} /> : <FaMoon size={14} />}
          {dark ? "Light" : "Dark"}
        </button>

        <h1 style={{ textAlign: "center", fontSize: "2.2rem", color: "#e91e63", marginBottom: 24 }}>🍴 Our Menu</h1>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto 20px" }}>
          <FaSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 15 }} />
          <input
            type="text" placeholder="Search dishes, categories..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px 40px", borderRadius: 30, border: `1.5px solid ${dark ? "#333" : "#ddd"}`, fontSize: 15, outline: "none", fontFamily: "Oswald, sans-serif", boxSizing: "border-box", background: dark ? "#16213e" : "#fff", color: text, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#aaa", cursor: "pointer" }}><FaTimes size={14} /></button>}
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${category === cat ? "#e91e63" : dark ? "#333" : "#ddd"}`, background: category === cat ? "#e91e63" : dark ? "#1a1a2e" : "#fff", color: category === cat ? "#fff" : dark ? "#aaa" : "#555", cursor: "pointer", fontSize: 13, fontFamily: "Oswald, sans-serif", transition: "all 0.2s" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loading && <p style={{ textAlign: "center", fontSize: 13, color: "#aaa", marginBottom: 16 }}>
          {filtered.length} dish{filtered.length !== 1 ? "es" : ""}{search || category !== "All" ? " found" : ""}
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </p>}

        {/* Dish list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800, margin: "0 auto" }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} dark={dark} />)
          ) : paginated.length > 0 ? (
            paginated.map(dish => {
              const rating = ratingsMap[dish._id];
              return (
                <div key={dish._id} style={cardStyle(dark)}>
                  <img src={dish.image || PLACEHOLDER} alt={dish.name} style={{ width: 100, height: 100, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} onError={e => e.target.src = PLACEHOLDER} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: text, margin: 0 }}>{dish.name}</h3>
                    {dish.category && <span style={{ display: "inline-block", background: "rgba(233,30,99,0.1)", color: "#e91e63", fontSize: 11, padding: "2px 8px", borderRadius: 10, margin: "4px 0 6px", fontWeight: 600 }}>{dish.category}</span>}
                    <p style={{ fontSize: "0.88rem", color: dark ? "#888" : "#666", margin: "4px 0" }}>{dish.description}</p>

                    {/* Rating display */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Stars value={Math.round(rating?.average || 0)} size={12} />
                      <span style={{ fontSize: 12, color: "#aaa" }}>
                        {rating?.count ? `${rating.average} (${rating.count})` : "No ratings yet"}
                      </span>
                      {user && (
                        <button onClick={() => setRatingDish(dish)} style={{ fontSize: 11, color: "#e91e63", background: "none", border: "none", cursor: "pointer", padding: "0 4px", fontFamily: "Oswald, sans-serif", textDecoration: "underline" }}>
                          Rate
                        </button>
                      )}
                    </div>

                    <p style={{ color: "#e91e63", fontWeight: 700, margin: "4px 0", fontSize: 15 }}>
                      {String(dish.price).startsWith("₹") ? dish.price : `₹${dish.price}`}
                    </p>
                    <button onClick={() => handleAddToCart(dish)} style={{ padding: "8px 14px", backgroundColor: "#e91e63", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>
                      Add to Cart 🛒
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48 }}>🍽️</div>
              <h3 style={{ color: dark ? "#aaa" : "#444", marginTop: 12 }}>No dishes found</h3>
              <button onClick={() => { setSearch(""); setCategory("All"); }} style={{ marginTop: 16, padding: "10px 24px", background: "#e91e63", color: "#fff", border: "none", borderRadius: 30, cursor: "pointer", fontFamily: "Oswald, sans-serif" }}>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ ...paginationBtn(dark), opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ ...paginationBtn(dark), background: p === page ? "#e91e63" : dark ? "#16213e" : "#fff", color: p === page ? "#fff" : dark ? "#aaa" : "#555", borderColor: p === page ? "#e91e63" : dark ? "#333" : "#ddd" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={{ ...paginationBtn(dark), opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        )}

        <button style={{ ...styles.cartBtn }} onClick={() => navigate("/cart")}>🛍️ View Cart</button>
      </div>

      {ratingDish && (
        <RatingModal
          dish={ratingDish}
          dark={dark}
          getAuthHeader={getAuthHeader}
          onClose={(refresh) => {
            setRatingDish(null);
            if (refresh) fetchRatings(paginated.map(d => d._id));
          }}
        />
      )}

      <ChatWidget />
    </>
  );
};

export default Menu;

const paginationBtn = (dark) => ({
  padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${dark ? "#333" : "#ddd"}`,
  background: dark ? "#16213e" : "#fff", color: dark ? "#aaa" : "#555",
  cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 14, minWidth: 40,
});

const styles = {
  homeBtn: { position: "fixed", top: 20, left: 20, background: "#e91e63", color: "#fff", textDecoration: "none", padding: "10px 18px", borderRadius: 30, display: "flex", alignItems: "center", zIndex: 1000, fontSize: 15 },
  cartBtn: { position: "fixed", bottom: 100, right: 20, backgroundColor: "#e91e63", color: "#fff", padding: "12px 20px", borderRadius: 30, border: "none", cursor: "pointer", fontWeight: 700, zIndex: 100, boxShadow: "0 4px 12px rgba(233,30,99,0.35)", fontFamily: "Oswald, sans-serif" },
};

