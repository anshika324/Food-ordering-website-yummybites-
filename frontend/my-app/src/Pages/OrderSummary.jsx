import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { FaHome } from "react-icons/fa";
import CartIcon from "../Components/CartIcon";

const OrderSummary = () => {
  const { order_id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/order/${order_id}`);
        setOrder(response.data);
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [order_id]);

  if (loading) return <p style={styles.loading}>Loading your order...</p>;

  if (!order)
    return (
      <p style={styles.error}>
        ❌ Order not found. <Link to="/">Go Home</Link>
      </p>
    );

  const { deliveryDetails = {} } = order;

  return (
    <div style={styles.container}>
      <CartIcon />
      <Link to="/" style={styles.homeBtn}>
        <FaHome style={{ marginRight: "6px" }} /> Home
      </Link>

      <h1 style={styles.heading}>Order Summary 🧾</h1>
      <p style={styles.status}>Status: <strong>{order.status}</strong></p>

      <div style={styles.itemsList}>
        {order.items.map((item, index) => (
          <div key={item._id || index} style={styles.card}>
            <img src={item.image} alt={item.name} style={styles.image} />
            <div style={styles.info}>
              <h3>{item.name}</h3>
              <p>₹{item.price}</p>
              <p>Qty: {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 style={styles.total}>Total Paid: ₹{order.total}</h2>
      <p style={styles.timestamp}>
        Ordered on: {new Date(order.timestamp).toLocaleString()}
      </p>

      {/* ✅ Delivery Details Section */}
      <div style={styles.deliveryBox}>
  <h3>📦 Delivery Details</h3>
  <p><strong>Name:</strong> {order.delivery_details?.name || "N/A"}</p>
  <p><strong>Phone:</strong> {order.delivery_details?.phone || "N/A"}</p>
  <p><strong>Address:</strong> {order.delivery_details?.address || "N/A"}</p>

        {deliveryDetails.instructions && (
          <p><strong>Instructions:</strong> {deliveryDetails.instructions}</p>
        )}
      </div>

      <Link to="/menu" style={styles.continueBtn}>
        Explore more Dishes... 🍽️
      </Link>
    </div>
  );
};



const styles = {
  container: { padding: "30px", minHeight: "100vh", backgroundColor: "#fff7f9" },
  heading: { textAlign: "center", color: "#e91e63", fontSize: "2rem" },
  status: { textAlign: "center", color: "#333", marginBottom: "20px" },
  itemsList: { marginTop: "20px" },
  card: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    borderRadius: "12px",
    padding: "10px",
    margin: "10px 0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  image: { width: "80px", height: "80px", borderRadius: "8px", marginRight: "15px" },
  info: { flex: 1 },
  total: { textAlign: "center", color: "#4CAF50", marginTop: "20px" },
  timestamp: { textAlign: "center", color: "#777", marginTop: "10px" },
  deliveryBox: {
    background: "#fff",
    padding: "15px",
    marginTop: "25px",
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    maxWidth: "500px",
    marginInline: "auto",
    lineHeight: "1.6",
  },
  loading: { textAlign: "center", color: "#e91e63", marginTop: "100px" },
  error: { textAlign: "center", color: "red", marginTop: "100px" },
  continueBtn: {
    display: "block",
    textAlign: "center",
    background: "#e91e63",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    margin: "30px auto",
    textDecoration: "none",
    width: "fit-content",
  },
  homeBtn: {
    position: "fixed",
    top: "20px",
    left: "20px",
    background: "#e91e63",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 18px",
    borderRadius: "30px",
    display: "flex",
    alignItems: "center",
    zIndex: 1000,
  },
};

export default OrderSummary;
