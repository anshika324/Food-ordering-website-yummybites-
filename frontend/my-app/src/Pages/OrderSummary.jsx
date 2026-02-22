// src/Pages/OrderSummary.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { FaHome, FaCheckCircle, FaClock, FaTruck, FaUtensils, FaTimesCircle, FaBox, FaWifi } from "react-icons/fa";
import CartIcon from "../Components/CartIcon";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const WS_URL      = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://");
const PLACEHOLDER = "https://via.placeholder.com/80?text=Food";

const STATUS_STEPS = [
  { key: "Pending",          label: "Order Placed",    icon: <FaBox />,         desc: "We received your order" },
  { key: "Confirmed",        label: "Confirmed",        icon: <FaCheckCircle />, desc: "Restaurant confirmed" },
  { key: "Preparing",        label: "Preparing",        icon: <FaUtensils />,    desc: "Chef is cooking" },
  { key: "Out for Delivery", label: "Out for Delivery", icon: <FaTruck />,       desc: "On the way!" },
  { key: "Delivered",        label: "Delivered",        icon: <FaCheckCircle />, desc: "Enjoy your meal!" },
];

const StatusTimeline = ({ currentStatus, dark }) => {
  if (currentStatus === "Cancelled") return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <FaTimesCircle size={36} color="#e53935" />
      <div style={{ color: "#e53935", fontWeight: 700, fontSize: 18, marginTop: 8 }}>Order Cancelled</div>
    </div>
  );

  const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div style={styles.timeline}>
      {STATUS_STEPS.map((step, idx) => {
        const done   = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} style={styles.timelineItem}>
            {idx > 0 && (
              <div style={{ ...styles.connector, background: done || active ? "#e91e63" : dark ? "#444" : "#e0e0e0" }} />
            )}
            <div style={{
              ...styles.iconCircle,
              background:  done || active ? "#e91e63"       : dark ? "#333" : "#f0f0f0",
              color:       done || active ? "#fff"           : dark ? "#666" : "#bbb",
              boxShadow:   active         ? "0 0 0 5px rgba(233,30,99,0.2)" : "none",
              transform:   active         ? "scale(1.18)"   : "scale(1)",
            }}>
              {step.icon}
            </div>
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: done || active ? "#e91e63" : dark ? "#555" : "#bbb", fontFamily: "Oswald, sans-serif" }}>
                {step.label}
              </div>
              {active && <div style={{ fontSize: 10, color: "#888", marginTop: 2, maxWidth: 64 }}>{step.desc}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrderSummary = () => {
  const { order_id }          = useParams();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting | live | offline
  const wsRef                 = useRef(null);
  const { dark }              = useTheme();

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/order/${order_id}`);
      setOrder(res.data);
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  }, [order_id]);

  // ── Initial fetch ──
  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── WebSocket for real-time status ──
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/order/${order_id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("live");
        console.log("✅ WS connected");
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status) {
            // Update status instantly without refetch
            setOrder(prev => prev ? { ...prev, status: data.status } : prev);
          }
        } catch {}
      };

      ws.onerror = () => setWsStatus("offline");

      ws.onclose = () => {
        setWsStatus("offline");
        // Reconnect after 5s if not intentionally closed
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) connect();
        }, 5000);
      };
    };

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [order_id]);

  const bg      = dark ? "#1a1a2e" : "#fff7f9";
  const cardBg  = dark ? "#16213e" : "#fff";
  const text     = dark ? "#e0e0e0" : "#333";

  if (loading) return (
    <div style={{ ...styles.container, background: bg }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {[200, 120, 180, 100].map((w, i) => (
        <div key={i} style={{ height: w === 200 ? 40 : 80, background: dark ? "#222" : "#f0f0f0", borderRadius: 12, marginTop: 16, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );

  if (!order) return <p style={{ textAlign: "center", color: "red", marginTop: 100 }}>❌ Order not found. <Link to="/">Go Home</Link></p>;

  return (
    <div style={{ ...styles.container, background: bg, color: text }}>
      <CartIcon />
      <Link to="/" style={styles.homeBtn}><FaHome style={{ marginRight: 6 }} /> Home</Link>

      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 20, paddingBottom: 4 }}>
        <h1 style={{ color: "#e91e63", fontSize: "2rem", margin: "0 0 6px" }}>Order Summary 🧾</h1>
        <div style={{ fontSize: 13, color: "#aaa" }}>#{order._id.slice(-8).toUpperCase()}</div>
        <div style={{ fontSize: 12, color: "#bbb", marginTop: 2 }}>
          {new Date(order.timestamp).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
        </div>
        {/* WebSocket live indicator */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 12px", borderRadius: 20, background: wsStatus === "live" ? "rgba(76,175,80,0.15)" : "rgba(158,158,158,0.15)", fontSize: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: wsStatus === "live" ? "#4CAF50" : "#9e9e9e", animation: wsStatus === "live" ? "pulse 2s infinite" : "none" }} />
          {wsStatus === "live" ? "Live updates on" : "Reconnecting..."}
        </div>
      </div>

      {/* Status Timeline */}
      <div style={{ ...styles.section, background: cardBg }}>
        <h2 style={styles.sectionTitle}>Order Status</h2>
        <StatusTimeline currentStatus={order.status} dark={dark} />
      </div>

      {/* Items */}
      <div style={{ ...styles.section, background: cardBg }}>
        <h2 style={styles.sectionTitle}>Items Ordered</h2>
        {order.items.map((item, i) => (
          <div key={i} style={{ ...styles.card, background: dark ? "#1e2a45" : "#fafafa" }}>
            <img src={item.image || PLACEHOLDER} alt={item.name} style={styles.image} onError={e => e.target.src = PLACEHOLDER} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: text }}>{item.name}</div>
              <div style={{ color: "#e91e63", fontWeight: 600, margin: "3px 0" }}>₹{item.price}</div>
              <div style={{ fontSize: 13, color: "#888" }}>Qty: {item.quantity}</div>
            </div>
            <div style={{ fontWeight: 700, color: text }}>₹{(item.price * item.quantity).toFixed(0)}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${dark ? "#333" : "#f0f0f0"}`, fontWeight: 600, fontSize: 16, color: text }}>
          <span>Total Paid</span>
          <span style={{ color: "#4CAF50", fontSize: 20 }}>₹{order.total}</span>
        </div>
      </div>

      {/* Delivery */}
      <div style={{ ...styles.section, background: cardBg }}>
        <h2 style={styles.sectionTitle}>Delivery Details</h2>
        <div style={{ lineHeight: 1.9, fontSize: 15, color: dark ? "#ccc" : "#444" }}>
          <p><strong>Name:</strong> {order.delivery_details?.name || "N/A"}</p>
          <p><strong>Phone:</strong> {order.delivery_details?.phone || "N/A"}</p>
          <p><strong>Address:</strong> {order.delivery_details?.address || "N/A"}</p>
          {order.delivery_details?.instructions && <p><strong>Instructions:</strong> {order.delivery_details.instructions}</p>}
        </div>
      </div>

      <Link to="/menu" style={styles.continueBtn}>Explore more dishes 🍽️</Link>
    </div>
  );
};

export default OrderSummary;

const styles = {
  container: { padding: "30px 20px 60px", minHeight: "100vh", fontFamily: "Oswald, sans-serif", maxWidth: 680, margin: "0 auto" },
  homeBtn:   { position: "fixed", top: 20, left: 20, background: "#e91e63", color: "#fff", textDecoration: "none", padding: "10px 18px", borderRadius: 30, display: "flex", alignItems: "center", zIndex: 1000, fontSize: 15 },
  section:   { borderRadius: 16, padding: 20, marginTop: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  sectionTitle: { fontSize: 14, color: "#888", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 },
  timeline:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0 4px" },
  timelineItem: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" },
  connector: { position: "absolute", top: 18, left: "-50%", width: "100%", height: 3, borderRadius: 2, zIndex: 0 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, position: "relative", zIndex: 1, transition: "all 0.3s ease" },
  card:      { display: "flex", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 10, gap: 12 },
  image:     { width: 70, height: 70, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  continueBtn: { display: "block", textAlign: "center", background: "#e91e63", color: "#fff", padding: "14px 28px", borderRadius: 30, margin: "28px auto 0", textDecoration: "none", width: "fit-content", fontWeight: 600, boxShadow: "0 4px 12px rgba(233,30,99,0.3)" },
};