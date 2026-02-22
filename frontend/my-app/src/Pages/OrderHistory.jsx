// src/Pages/OrderHistory.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaHome, FaShoppingBag, FaClock, FaCheckCircle, FaTimesCircle, FaTruck, FaUtensils, FaMoon, FaSun } from "react-icons/fa";
import CartIcon from "../Components/CartIcon";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const PLACEHOLDER = "https://via.placeholder.com/60?text=Food";

const STATUS_STYLES = {
  "Pending":          { bg: "#fff3cd", color: "#856404",  icon: <FaClock /> },
  "Confirmed":        { bg: "#d1ecf1", color: "#0c5460",  icon: <FaCheckCircle /> },
  "Preparing":        { bg: "#fde8d8", color: "#7d3c0a",  icon: <FaUtensils /> },
  "Out for Delivery": { bg: "#d4edda", color: "#155724",  icon: <FaTruck /> },
  "Delivered":        { bg: "#c3e6cb", color: "#155724",  icon: <FaCheckCircle /> },
  "Cancelled":        { bg: "#f8d7da", color: "#721c24",  icon: <FaTimesCircle /> },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Pending"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: "Oswald, sans-serif" }}>
      {s.icon} {status}
    </span>
  );
};

const Skeleton = ({ dark }) => (
  <div style={{ background: dark ? "#16213e" : "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 16 }}>
    {[70, 50, 40].map((w, i) => (
      <div key={i} style={{ height: 16, background: dark ? "#2a2a3e" : "#f0f0f0", borderRadius: 6, marginBottom: 10, width: `${w}%`, animation: "pulse 1.5s infinite" }} />
    ))}
  </div>
);

// ── All colours as a function of dark ──
const makeStyles = (dark) => ({
  page:         { minHeight: "100vh", backgroundColor: dark ? "#0f0f1a" : "#fff7f9", paddingBottom: 60, fontFamily: "Oswald, sans-serif" },
  homeBtn:      { position: "fixed", top: 20, left: 20, background: "#e91e63", color: "#fff", textDecoration: "none", padding: "10px 18px", borderRadius: 30, display: "flex", alignItems: "center", gap: 6, zIndex: 1000, fontSize: 15, boxShadow: "0 3px 10px rgba(0,0,0,0.15)" },
  themeBtn:     { position: "fixed", top: 20, right: 90, background: dark ? "#e91e63" : "#333", color: "#fff", border: "none", borderRadius: 30, padding: "10px 16px", cursor: "pointer", zIndex: 1000, display: "flex", alignItems: "center", gap: 6, fontFamily: "Oswald, sans-serif", fontSize: 14 },
  header:       { background: "linear-gradient(135deg, #ff4d6d, #ff6b81)", padding: "80px 20px 30px", textAlign: "center", color: "#fff" },
  title:        { fontSize: "2.2rem", fontWeight: 600, letterSpacing: 1 },
  subtitle:     { fontSize: 14, opacity: 0.85, marginTop: 6 },
  container:    { maxWidth: 750, margin: "30px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 },
  card:         { background: dark ? "#16213e" : "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" },
  cardHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", cursor: "pointer", transition: "background 0.2s" },
  cardLeft:     { display: "flex", flexDirection: "column", gap: 4 },
  orderId:      { fontSize: 16, fontWeight: 700, color: dark ? "#e0e0e0" : "#222" },
  orderDate:    { fontSize: 13, color: dark ? "#666" : "#888" },
  cardRight:    { display: "flex", alignItems: "center", gap: 12 },
  orderTotal:   { fontSize: 16, fontWeight: 700, color: "#e91e63" },
  chevron:      { color: "#aaa", fontSize: 12 },
  cardBody:     { borderTop: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: dark ? "#555" : "#888", marginBottom: 10 },
  itemRow:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  itemImg:      { width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 },
  itemInfo:     { flex: 1 },
  itemName:     { fontSize: 15, fontWeight: 600, color: dark ? "#e0e0e0" : "#333" },
  itemMeta:     { fontSize: 13, color: dark ? "#666" : "#888", marginTop: 2 },
  itemSubtotal: { fontSize: 15, fontWeight: 700, color: dark ? "#e0e0e0" : "#333" },
  deliveryBox:  { background: dark ? "#1a1a2e" : "#fff7f9", borderRadius: 10, padding: "12px 16px", lineHeight: 1.8, fontSize: 14, color: dark ? "#aaa" : "#444" },
  cardFooter:   { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}` },
  trackBtn:     { background: "#e91e63", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "Oswald, sans-serif" },
  grandTotal:   { fontSize: 16, fontWeight: 700, color: "#e91e63" },
  empty:        { textAlign: "center", padding: "80px 20px" },
  emptyIcon:    { fontSize: 64, marginBottom: 16 },
  emptyTitle:   { color: dark ? "#aaa" : "#444", marginTop: 12, fontSize: "1.4rem" },
  emptyText:    { color: dark ? "#666" : "#888", marginTop: 8 },
  menuBtn:      { display: "inline-block", marginTop: 20, background: "#e91e63", color: "#fff", padding: "10px 24px", borderRadius: 30, textDecoration: "none", fontWeight: 600 },
});

const OrderHistory = () => {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { user, getAuthHeader } = useAuth();
  const { dark, toggle }        = useTheme();
  const navigate                = useNavigate();
  const st                      = makeStyles(dark);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/order/history`, { headers: getAuthHeader() });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  return (
    <div style={st.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      <CartIcon />
      <Link to="/" style={st.homeBtn}><FaHome /> Home</Link>
      <button onClick={toggle} style={st.themeBtn}>{dark ? <FaSun size={14} /> : <FaMoon size={14} />} {dark ? "Light" : "Dark"}</button>

      {/* Header */}
      <div style={st.header}>
        <FaShoppingBag size={36} style={{ marginBottom: 10 }} />
        <h1 style={st.title}>Order History</h1>
        <p style={st.subtitle}>{user?.name ? `Hi ${user.name}!` : ""} All your past orders in one place</p>
      </div>

      {/* Content */}
      <div style={st.container}>
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i} dark={dark} />)
        ) : orders.length === 0 ? (
          <div style={st.empty}>
            <div style={st.emptyIcon}>🍽️</div>
            <h2 style={st.emptyTitle}>No orders yet</h2>
            <p style={st.emptyText}>Your order history will appear here after your first order.</p>
            <Link to="/menu" style={st.menuBtn}>Explore Menu</Link>
          </div>
        ) : (
          orders.map(order => {
            const isOpen  = expanded === order._id;
            const dateStr = new Date(order.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={order._id} style={st.card}>
                {/* Header row */}
                <div style={st.cardHeader} onClick={() => setExpanded(isOpen ? null : order._id)}>
                  <div style={st.cardLeft}>
                    <span style={st.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                    <span style={st.orderDate}>{dateStr}</span>
                  </div>
                  <div style={st.cardRight}>
                    <StatusBadge status={order.status} />
                    <span style={st.orderTotal}>₹{order.total}</span>
                    <span style={st.chevron}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div style={st.cardBody}>
                    {/* Items */}
                    <div>
                      <div style={st.sectionTitle}>Items Ordered</div>
                      {order.items?.map((item, i) => (
                        <div key={i} style={st.itemRow}>
                          <img src={item.image || PLACEHOLDER} alt={item.name} style={st.itemImg} onError={e => { e.target.src = PLACEHOLDER; }} />
                          <div style={st.itemInfo}>
                            <div style={st.itemName}>{item.name}</div>
                            <div style={st.itemMeta}>₹{item.price} × {item.quantity}</div>
                          </div>
                          <span style={st.itemSubtotal}>₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery */}
                    {order.delivery_details && (
                      <div>
                        <div style={st.sectionTitle}>Delivery Details</div>
                        <div style={st.deliveryBox}>
                          <p><strong>Name:</strong> {order.delivery_details.name}</p>
                          <p><strong>Phone:</strong> {order.delivery_details.phone}</p>
                          <p><strong>Address:</strong> {order.delivery_details.address}</p>
                          {order.delivery_details.instructions && <p><strong>Notes:</strong> {order.delivery_details.instructions}</p>}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={st.cardFooter}>
                      <span style={st.grandTotal}>Total Paid: ₹{order.total}</span>
                      <Link to={`/order/${order._id}`} style={st.trackBtn}>Track Order →</Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderHistory;