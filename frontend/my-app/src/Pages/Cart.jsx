import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import Modal from "react-modal";
import CartIcon from "../Components/CartIcon";

Modal.setAppElement("#root");

const Cart = () => {
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: "",
    phone: "",
    address: "",
    instructions: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(storedCart);
  }, []);

  const updateQuantity = (id, change) => {
    const updated = cart.map((item) =>
      item._id === id
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    );
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const removeItem = (id) => {
    const updated = cart.filter((item) => item._id !== id);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(String(item.price).replace("₹", "").trim()) * item.quantity,
    0
  );

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    setShowModal(true);
  };

  // 🧩 Step 1: Payment Handler
  const handlePayment = async () => {
    const { name, phone, address } = deliveryDetails;
    if (!name || !phone || !address) {
      toast.error("Please fill all required fields!");
      return;
    }

    try {
      // 🟢 Create Razorpay order
      const { data } = await axios.post(
        "https://food-ordering-website-backend-v7w7.onrender.com/api/v1/payment/create-order",
        { amount: total }
      );

      console.log("🟢 Razorpay Order:", data);

      const options = {
        key: data.key || "rzp_test_RZNXWq4xYzFPoa",
        amount: data.amount,
        currency: data.currency,
        name: "Food Ordering App",
        description: "Secure Food Payment",
        order_id: data.order_id,
        handler: async function (response) {
          console.log("🧾 Razorpay Response:", response);

          // ✅ Step 2: Verify payment
          try {
            const verifyRes = await axios.post(
              "https://food-ordering-website-backend-v7w7.onrender.com/api/v1/payment/verify",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (verifyRes.data.status === "success") {
              toast.success("✅ Payment verified successfully!");

              // ✅ Step 3: Place order in DB
              const orderPayload = {
                items: cart.map((item) => ({
                  _id: item._id,
                  name: item.name,
                  price: Number(String(item.price).replace("₹", "").trim()),
                  quantity: item.quantity,
                  image: item.image,
                })),
                total: total,
                deliveryDetails,
              };

              const orderRes = await axios.post(
                "https://food-ordering-website-backend-v7w7.onrender.com/api/v1/order/place",
                orderPayload
              );

              if (orderRes.status === 200) {
                toast.success("🍽️ Order placed successfully!");
                clearCart();
                navigate(`/order/${orderRes.data.order_id}`);
              } else {
                toast.error("⚠️ Order could not be saved!");
              }
            } else {
              toast.error("❌ Payment verification failed!");
            }
          } catch (error) {
            console.error("❌ Verification error:", error);
            toast.error("❌ Payment verification failed!");
          }
        },
        prefill: {
          name: deliveryDetails.name,
          contact: deliveryDetails.phone,
          email: "customer@example.com",
        },
        theme: { color: "#FF69B4" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error("Payment failed! Try again.");
    }
  };

  return (
    <>
      <CartIcon />
      <div style={styles.container}>
        <Link to="/" style={styles.homeBtnFixed}>
          <FaHome style={{ marginRight: "6px" }} /> Home
        </Link>

        <h1 style={styles.heading}>🛍️ Your Cart</h1>

        {cart.length === 0 ? (
          <p style={styles.empty}>
            Your cart is empty!<br />Add your favourite dishes...
          </p>
        ) : (
          <>
            {cart.map((item) => (
              <div key={item._id} style={styles.card}>
                <img src={item.image} alt={item.name} style={styles.image} />
                <div style={styles.info}>
                  <h3>{item.name}</h3>
                  <p>₹{item.price}</p>
                  <div style={styles.quantity}>
                    <button onClick={() => updateQuantity(item._id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, 1)}>+</button>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    style={styles.removeBtn}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <h2 style={styles.total}>Total: ₹{total.toFixed(2)}</h2>

            <div style={styles.actions}>
              <button style={styles.clearBtn} onClick={clearCart}>
                Clear Cart 🗑️
              </button>
              <button style={styles.checkoutBtn} onClick={handlePlaceOrder}>
                Place Order ✅
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delivery Modal */}
      <Modal
        isOpen={showModal}
        onRequestClose={() => setShowModal(false)}
        style={modalStyles}
        contentLabel="Delivery Details"
      >
        <h2>Enter Delivery Details 🏠</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={deliveryDetails.name}
          onChange={(e) =>
            setDeliveryDetails({ ...deliveryDetails, name: e.target.value })
          }
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={deliveryDetails.phone}
          onChange={(e) =>
            setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })
          }
        />
        <textarea
          placeholder="Delivery Address"
          value={deliveryDetails.address}
          onChange={(e) =>
            setDeliveryDetails({ ...deliveryDetails, address: e.target.value })
          }
        />
        <textarea
          placeholder="Delivery Instructions (optional)"
          value={deliveryDetails.instructions}
          onChange={(e) =>
            setDeliveryDetails({ ...deliveryDetails, instructions: e.target.value })
          }
        />

        <div style={styles.actions}>
          <button onClick={() => setShowModal(false)} style={styles.clearBtn}>
            Cancel
          </button>
          <button onClick={handlePayment} style={styles.checkoutBtn}>
            Pay & Confirm 🚀
          </button>
        </div>
      </Modal>
    </>
  );
};

// =============== Styling (unchanged) ===============
const styles = {
  container: { padding: "30px", backgroundColor: "#fff7f9", minHeight: "100vh" },
  heading: { textAlign: "center", color: "#e91e63", fontSize: "2rem" },
  empty: { textAlign: "center", color: "#777", fontSize: "1.2rem" },
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
  quantity: { display: "flex", alignItems: "center", gap: "10px" },
  removeBtn: {
    marginTop: "8px",
    background: "#ff5252",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
  },
  total: { textAlign: "center", color: "#e91e63", marginTop: "20px" },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "20px",
  },
  clearBtn: {
    background: "#e91e63",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  checkoutBtn: {
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
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
};

const modalStyles = {
  content: {
    width: "400px",
    margin: "auto",
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
  },
  overlay: {
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
};


export default Cart;

