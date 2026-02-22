// src/Pages/Cart.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaShoppingCart, FaMoon, FaSun } from "react-icons/fa";
import Modal from "react-modal";
import CartIcon from "../Components/CartIcon";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

Modal.setAppElement("#root");

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const PLACEHOLDER = "https://via.placeholder.com/80?text=Food";

// ── All styles as a function of dark ──
const makeStyles = (dark) => ({
  container:  { padding: "80px 30px 60px", backgroundColor: dark ? "#0f0f1a" : "#fff7f9", minHeight: "100vh", fontFamily: "Oswald, sans-serif" },
  emptyPage:  { backgroundColor: dark ? "#0f0f1a" : "#fff7f9", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  emptyBox:   { textAlign: "center", padding: "40px 20px" },
  emptyTitle: { fontSize: "1.8rem", color: dark ? "#e0e0e0" : "#333", margin: "16px 0 8px" },
  emptyText:  { color: dark ? "#666" : "#888", marginBottom: 24 },
  browseBtn:  { background: "#e91e63", color: "#fff", padding: "12px 28px", borderRadius: 30, textDecoration: "none", fontSize: 16, fontWeight: 600 },
  homeBtn:    { position: "fixed", top: 20, left: 20, background: "#e91e63", color: "#fff", textDecoration: "none", padding: "10px 18px", borderRadius: 30, display: "flex", alignItems: "center", gap: 6, zIndex: 1000, fontFamily: "Oswald, sans-serif" },
  themeBtn:   { position: "fixed", top: 20, right: 90, background: dark ? "#e91e63" : "#333", color: "#fff", border: "none", borderRadius: 30, padding: "10px 16px", cursor: "pointer", zIndex: 1000, display: "flex", alignItems: "center", gap: 6, fontFamily: "Oswald, sans-serif", fontSize: 14 },
  heading:    { textAlign: "center", color: "#e91e63", fontSize: "2rem", marginBottom: 20 },
  card:       { display: "flex", alignItems: "center", background: dark ? "#16213e" : "#fff", borderRadius: 12, padding: 14, margin: "10px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", position: "relative" },
  image:      { width: 80, height: 80, borderRadius: 8, marginRight: 15, objectFit: "cover", flexShrink: 0 },
  info:       { flex: 1 },
  itemName:   { fontSize: 17, fontWeight: 600, color: dark ? "#e0e0e0" : "#222" },
  itemPrice:  { color: "#e91e63", fontWeight: 600, margin: "4px 0" },
  quantity:   { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },
  qtyBtn:     { width: 28, height: 28, borderRadius: "50%", border: `1px solid ${dark ? "#333" : "#ddd"}`, background: dark ? "#1a1a2e" : "#f5f5f5", color: dark ? "#e0e0e0" : "#333", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum:     { fontSize: 16, fontWeight: 600, minWidth: 20, textAlign: "center", color: dark ? "#e0e0e0" : "#222" },
  subtotal:   { fontSize: 13, color: dark ? "#666" : "#888", marginTop: 4 },
  removeBtn:  { position: "absolute", top: 10, right: 10, background: "none", border: "none", color: dark ? "#888" : "#ccc", fontSize: 16, cursor: "pointer" },
  totalBox:   { background: dark ? "#16213e" : "#fff", borderRadius: 12, padding: 20, marginTop: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", textAlign: "center" },
  total:      { color: "#e91e63", fontSize: "1.6rem", marginBottom: 8 },
  loginHint:  { background: dark ? "#1a1a2e" : "#fff7f9", border: `1px solid ${dark ? "#333" : "#ffd6de"}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: dark ? "#aaa" : "#555", marginBottom: 14 },
  actions:    { display: "flex", justifyContent: "center", gap: 16, marginTop: 16 },
  clearBtn:   { background: "#888", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 15 },
  checkoutBtn:{ background: "#4CAF50", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontFamily: "Oswald, sans-serif", fontSize: 15 },
  modalContent: {
    width: "420px", maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
    background: dark ? "#16213e" : "#fff",
    borderRadius: 16, padding: 24,
    display: "flex", flexDirection: "column", gap: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    position: "fixed", top: "50%", left: "50%", right: "auto", bottom: "auto",
    transform: "translate(-50%, -50%)", border: "none",
  },
  modalTitle: { fontFamily: "Oswald, sans-serif", marginBottom: 4, color: dark ? "#e0e0e0" : "#222" },
  modalHint:  { color: dark ? "#666" : "#888", fontSize: 13, marginBottom: 12 },
  modalInput: { width: "100%", padding: "10px 12px", border: `1px solid ${dark ? "#333" : "#ddd"}`, borderRadius: 8, fontSize: 14, fontFamily: "Oswald, sans-serif", outline: "none", boxSizing: "border-box", background: dark ? "#0f3460" : "#fff", color: dark ? "#e0e0e0" : "#333" },
});

const modalOverlay = { background: "rgba(0,0,0,0.55)", zIndex: 2000, position: "fixed", top: 0, left: 0, right: 0, bottom: 0 };

const Cart = () => {
  const [cart, setCart]           = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [paying, setPaying]       = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({ name: "", phone: "", address: "", instructions: "" });

  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { dark, toggle }        = useTheme();
  const st = makeStyles(dark);   // recomputed each render — instant theme

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(storedCart);
    if (user?.name) setDeliveryDetails(d => ({ ...d, name: user.name }));
  }, [user]);

  const updateQuantity = (id, change) => {
    const updated = cart.map(item => item._id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const removeItem = (id) => {
    const updated = cart.filter(item => item._id !== id);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cart-updated"));
  };

  const total = cart.reduce((sum, item) => sum + Number(String(item.price).replace("₹", "").trim()) * item.quantity, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) { toast.error("Your cart is empty!"); return; }
    setShowModal(true);
  };

  const handlePayment = async () => {
    const { name, phone, address } = deliveryDetails;
    if (!name || !phone || !address) { toast.error("Please fill all required fields!"); return; }
    setPaying(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/v1/payment/create-order`, { amount: total });
      const options = {
        key: data.key, amount: data.amount, currency: data.currency,
        name: "YummyBites", description: "Secure Food Payment", order_id: data.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(`${BACKEND_URL}/api/v1/payment/verify`, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            if (verifyRes.data.status === "success") {
              toast.success("✅ Payment verified!");
              const orderRes = await axios.post(`${BACKEND_URL}/api/v1/order/place`, {
                items: cart.map(item => ({ _id: item._id, name: item.name, price: Number(String(item.price).replace("₹", "").trim()), quantity: item.quantity, image: item.image })),
                total, deliveryDetails,
              }, { headers: getAuthHeader() });
              if (orderRes.status === 200) {
                toast.success("🍽️ Order placed successfully!");
                clearCart(); setShowModal(false);
                navigate(`/order/${orderRes.data.order_id}`);
              } else { toast.error("⚠️ Order could not be saved!"); }
            } else { toast.error("❌ Payment verification failed!"); }
          } catch { toast.error("❌ Payment verification failed!"); }
        },
        prefill: { name: deliveryDetails.name, contact: deliveryDetails.phone },
        theme: { color: "#FF69B4" },
        modal: { ondismiss: () => setPaying(false) },
      };
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch { toast.error("Payment failed! Please try again."); setPaying(false); }
  };

  // ── Empty state ──
  if (cart.length === 0) {
    return (
      <div style={st.emptyPage}>
        <CartIcon />
        <Link to="/" style={st.homeBtn}><FaHome /> Home</Link>
        <button onClick={toggle} style={st.themeBtn}>{dark ? <FaSun size={14} /> : <FaMoon size={14} />} {dark ? "Light" : "Dark"}</button>
        <div style={st.emptyBox}>
          <FaShoppingCart size={70} color="#ffd6de" />
          <h2 style={st.emptyTitle}>Your cart is empty!</h2>
          <p style={st.emptyText}>Looks like you haven't added anything yet.</p>
          <Link to="/menu" style={st.browseBtn}>Browse Menu 🍽️</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <CartIcon />
      <div style={st.container}>
        <Link to="/" style={st.homeBtn}><FaHome /> Home</Link>
        <button onClick={toggle} style={st.themeBtn}>{dark ? <FaSun size={14} /> : <FaMoon size={14} />} {dark ? "Light" : "Dark"}</button>
        <h1 style={st.heading}>🛍️ Your Cart</h1>

        {cart.map(item => (
          <div key={item._id} style={st.card}>
            <img src={item.image || PLACEHOLDER} alt={item.name} style={st.image} onError={e => { e.target.src = PLACEHOLDER; }} />
            <div style={st.info}>
              <h3 style={st.itemName}>{item.name}</h3>
              <p style={st.itemPrice}>₹{item.price}</p>
              <div style={st.quantity}>
                <button style={st.qtyBtn} onClick={() => updateQuantity(item._id, -1)}>−</button>
                <span style={st.qtyNum}>{item.quantity}</span>
                <button style={st.qtyBtn} onClick={() => updateQuantity(item._id, 1)}>+</button>
              </div>
              <p style={st.subtotal}>Subtotal: ₹{(Number(String(item.price).replace("₹","").trim()) * item.quantity).toFixed(0)}</p>
            </div>
            <button onClick={() => removeItem(item._id)} style={st.removeBtn}>✕</button>
          </div>
        ))}

        <div style={st.totalBox}>
          <h2 style={st.total}>Total: ₹{total.toFixed(2)}</h2>
          {!user && <p style={st.loginHint}>💡 <strong>Login</strong> before ordering so your order appears in Order History</p>}
          <div style={st.actions}>
            <button style={st.clearBtn} onClick={clearCart}>Clear Cart 🗑️</button>
            <button style={st.checkoutBtn} onClick={handlePlaceOrder}>Place Order ✅</button>
          </div>
        </div>
      </div>

      {/* Delivery Modal */}
      <Modal isOpen={showModal} onRequestClose={() => setShowModal(false)} style={{ content: st.modalContent, overlay: modalOverlay }} contentLabel="Delivery Details">
        <h2 style={st.modalTitle}>Delivery Details 🏠</h2>
        <p style={st.modalHint}>We'll deliver to this address</p>
        <input type="text" placeholder="Full Name *" name="delivery-name" autoComplete="name" value={deliveryDetails.name} onChange={e => setDeliveryDetails({ ...deliveryDetails, name: e.target.value })} style={st.modalInput} />
        <input type="tel" placeholder="Phone Number *" name="delivery-phone" autoComplete="tel" value={deliveryDetails.phone} onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })} style={st.modalInput} />
        <textarea placeholder="Delivery Address *" value={deliveryDetails.address} onChange={e => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })} style={{ ...st.modalInput, height: 70, resize: "none" }} />
        <textarea placeholder="Delivery Instructions (optional)" value={deliveryDetails.instructions} onChange={e => setDeliveryDetails({ ...deliveryDetails, instructions: e.target.value })} style={{ ...st.modalInput, height: 60, resize: "none" }} />
        <div style={st.actions}>
          <button onClick={() => setShowModal(false)} style={st.clearBtn}>Cancel</button>
          <button onClick={handlePayment} style={st.checkoutBtn} disabled={paying}>{paying ? "Processing..." : "Pay & Confirm 🚀"}</button>
        </div>
      </Modal>
    </>
  );
};

export default Cart;