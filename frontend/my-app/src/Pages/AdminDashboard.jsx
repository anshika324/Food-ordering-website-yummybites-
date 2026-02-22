// src/Pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaHome, FaBoxOpen, FaRupeeSign, FaUsers,
  FaCheckCircle, FaClock, FaTimesCircle, FaTruck, FaUtensils, FaMoon, FaSun
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL    = import.meta.env.VITE_BACKEND_URL  || "http://localhost:8000";
const ADMIN_EMAIL    = import.meta.env.VITE_ADMIN_EMAIL  || "admin@yummybites.com";
const STATUS_OPTIONS = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

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
  <div style={{ background: dark ? "#16213e" : "#fff", borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
    {[80, 60, 40].map((w, i) => (
      <div key={i} style={{ height: 14, width: `${w}%`, background: dark ? "#2a2a3e" : "#f0f0f0", borderRadius: 6, marginBottom: 10, animation: "pulse 1.5s infinite" }} />
    ))}
  </div>
);

// ── All colours computed from dark — no hardcoded light/dark assumptions ──
const makeStyles = (dark) => ({
  page:        { minHeight: "100vh", backgroundColor: dark ? "#0f0f1a" : "#f8f9fa", fontFamily: "Oswald, sans-serif", paddingBottom: 60 },
  header:      { background: "linear-gradient(135deg, #1a1a2e, #16213e)", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  homeBtn:     { background: "#e91e63", color: "#fff", textDecoration: "none", padding: "10px 18px", borderRadius: 30, display: "flex", alignItems: "center", gap: 6, fontSize: 14 },
  title:       { fontSize: "1.8rem", color: "#fff", textAlign: "center" },
  subtitle:    { color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 4 },
  iconBtn:     { background: "transparent", border: "1px solid #444", color: "#aaa", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  statsRow:    { display: "flex", gap: 16, padding: "24px 24px 0", flexWrap: "wrap" },
  statCard:    { flex: 1, minWidth: 160, background: dark ? "#16213e" : "#fff", borderRadius: 12, padding: "20px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  statNum:     { fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 4px" },
  statLabel:   { fontSize: 13, color: dark ? "#666" : "#888" },
  controls:    { padding: "20px 24px 8px", display: "flex", flexDirection: "column", gap: 12 },
  searchInput: { padding: "10px 14px", borderRadius: 10, border: `1px solid ${dark ? "#333" : "#ddd"}`, fontSize: 14, outline: "none", fontFamily: "Oswald, sans-serif", width: "100%", boxSizing: "border-box", background: dark ? "#16213e" : "#fff", color: dark ? "#e0e0e0" : "#333" },
  filterTabs:  { display: "flex", gap: 8, flexWrap: "wrap" },
  filterBtn:   (active) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "#e91e63" : dark ? "#333" : "#ddd"}`, background: active ? "#e91e63" : dark ? "#1a1a2e" : "#f5f5f5", color: active ? "#fff" : dark ? "#aaa" : "#555", cursor: "pointer", fontSize: 13, fontFamily: "Oswald, sans-serif", transition: "0.2s" }),
  countText:   { padding: "0 24px 8px", color: dark ? "#555" : "#888", fontSize: 14, fontFamily: "Oswald, sans-serif" },
  list:        { padding: "8px 24px" },
  card:        { background: dark ? "#16213e" : "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", marginBottom: 12, overflow: "hidden" },
  cardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", cursor: "pointer" },
  orderId:     { fontSize: 16, fontWeight: 700, color: dark ? "#e0e0e0" : "#222" },
  orderMeta:   { fontSize: 13, color: dark ? "#666" : "#888", marginTop: 3 },
  orderTotal:  { fontSize: 16, fontWeight: 700, color: "#e91e63" },
  cardBody:    { borderTop: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 },
  sectionTitle:{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: dark ? "#666" : "#888", marginBottom: 8 },
  bodyText:    { fontSize: 14, color: dark ? "#aaa" : "#444", lineHeight: 1.9 },
  itemRow:     { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  itemImg:     { width: 44, height: 44, borderRadius: 8, objectFit: "cover" },
  itemName:    { flex: 1, color: dark ? "#e0e0e0" : "#333" },
  itemQty:     { color: dark ? "#666" : "#888" },
  itemPrice:   { fontWeight: 600, color: dark ? "#e0e0e0" : "#333" },
  totalLine:   { fontWeight: 700, fontSize: 15, color: "#e91e63", borderTop: `1px solid ${dark ? "#2a2a3e" : "#f5f5f5"}`, paddingTop: 8, marginTop: 4 },
  statusBtns:  { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  statusBtn:   (active, updating) => ({ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Oswald, sans-serif", transition: "0.2s", background: active ? "#e91e63" : dark ? "#1a1a2e" : "#f5f5f5", color: active ? "#fff" : dark ? "#aaa" : "#555", opacity: updating ? 0.6 : 1 }),
  empty:       { textAlign: "center", padding: 40, color: dark ? "#555" : "#888", fontFamily: "Oswald, sans-serif" },
});

const AdminDashboard = () => {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const navigate      = useNavigate();
  const { dark, toggle } = useTheme();
  const st            = makeStyles(dark);   // recomputed each render — instant theme switch

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { toast.error("Please log in first."); navigate("/"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.sub !== ADMIN_EMAIL) { toast.error("Admin access only."); navigate("/"); return; }
    } catch { navigate("/"); return; }
    fetchOrders();
  }, []);

  const getHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/admin/orders`, { headers: getHeader() });
      setOrders(res.data);
    } catch { toast.error("Failed to load orders."); }
    finally { setLoading(false); }
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await axios.patch(`${BACKEND_URL}/api/v1/order/${orderId}/status`, { status: newStatus }, { headers: getHeader() });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Status → "${newStatus}"`);
    } catch { toast.error("Failed to update status."); }
    finally { setUpdatingId(null); }
  };

  const totalRevenue  = orders.filter(o => o.status === "Delivered").reduce((a, o) => a + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "Pending").length;
  const uniqueUsers   = new Set(orders.map(o => o.user_email).filter(e => e && e !== "guest")).size;

  const displayed = orders.filter(o => {
    const matchFilter = filter === "All" || o.status === filter;
    const matchSearch = !search ||
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      (o.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.delivery_details?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={st.page}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Header */}
      <div style={st.header}>
        <Link to="/" style={st.homeBtn}><FaHome /> Home</Link>
        <div>
          <h1 style={st.title}>Admin Dashboard</h1>
          <p style={st.subtitle}>YummyBites Order Management</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggle} style={st.iconBtn} title="Toggle dark mode">
            {dark ? <FaSun size={14} /> : <FaMoon size={14} />}
          </button>
          <button onClick={fetchOrders} style={st.iconBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={st.statsRow}>
        {[
          { icon: <FaBoxOpen size={28} color="#e91e63" />,   val: orders.length,                 label: "Total Orders",        clr: "#e91e63" },
          { icon: <FaRupeeSign size={28} color="#4CAF50" />, val: `₹${totalRevenue.toFixed(0)}`, label: "Revenue (Delivered)", clr: "#4CAF50" },
          { icon: <FaClock size={28} color="#ff9800" />,     val: pendingOrders,                 label: "Pending Orders",      clr: "#ff9800" },
          { icon: <FaUsers size={28} color="#2196f3" />,     val: uniqueUsers,                   label: "Customers",           clr: "#2196f3" },
        ].map((s, i) => (
          <div key={i} style={st.statCard}>
            {s.icon}
            <div style={{ ...st.statNum, color: s.clr }}>{s.val}</div>
            <div style={st.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={st.controls}>
        <input type="text" placeholder="Search by order ID, email or name..." value={search} onChange={e => setSearch(e.target.value)} style={st.searchInput} />
        <div style={st.filterTabs}>
          {["All", ...STATUS_OPTIONS].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={st.filterBtn(filter === f)}>{f}</button>
          ))}
        </div>
      </div>
      <p style={st.countText}>Showing {displayed.length} of {orders.length} orders</p>

      {/* List */}
      <div style={st.list}>
        {loading ? [1,2,3,4].map(i => <Skeleton key={i} dark={dark} />) : displayed.length === 0 ? (
          <div style={st.empty}>No orders found.</div>
        ) : displayed.map(order => {
          const isOpen = expanded === order._id;
          const dateStr = new Date(order.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <div key={order._id} style={st.card}>
              <div style={st.cardHeader} onClick={() => setExpanded(isOpen ? null : order._id)}>
                <div>
                  <div style={st.orderId}>#{order._id.slice(-8).toUpperCase()}</div>
                  <div style={st.orderMeta}>{order.user_email || "guest"} · {dateStr}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <StatusBadge status={order.status} />
                  <span style={st.orderTotal}>₹{order.total}</span>
                  <span style={{ color: "#aaa", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div style={st.cardBody}>
                  {/* Items */}
                  <div>
                    <div style={st.sectionTitle}>Items ({order.items?.length || 0})</div>
                    {order.items?.map((item, i) => (
                      <div key={i} style={st.itemRow}>
                        <img src={item.image || "https://via.placeholder.com/48?text=Food"} alt={item.name} style={st.itemImg} onError={e => { e.target.src = "https://via.placeholder.com/48?text=Food"; }} />
                        <span style={st.itemName}>{item.name}</span>
                        <span style={st.itemQty}>×{item.quantity}</span>
                        <span style={st.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <div style={st.totalLine}>Total: ₹{order.total}</div>
                  </div>

                  {/* Delivery */}
                  <div>
                    <div style={st.sectionTitle}>Delivery Details</div>
                    <div style={st.bodyText}>
                      <p>Name: {order.delivery_details?.name || "N/A"}</p>
                      <p>Phone: {order.delivery_details?.phone || "N/A"}</p>
                      <p>Address: {order.delivery_details?.address || "N/A"}</p>
                      {order.delivery_details?.instructions && <p>Instructions: {order.delivery_details.instructions}</p>}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <div style={st.sectionTitle}>Update Status</div>
                    <div style={st.statusBtns}>
                      {STATUS_OPTIONS.map(s => (
                        <button key={s} onClick={() => updateStatus(order._id, s)} disabled={order.status === s || updatingId === order._id} style={st.statusBtn(order.status === s, updatingId === order._id)}>
                          {updatingId === order._id && order.status !== s ? "..." : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;