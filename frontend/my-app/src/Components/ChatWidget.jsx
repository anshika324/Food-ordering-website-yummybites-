// frontend/src/Components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  // ✅ FIX: Use useNavigate instead of window.location.href for proper SPA routing
  const navigate = useNavigate();

  // 🎙️ Initialize Voice Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("🎙️ Heard:", transcript);
      handleSendText(transcript);
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  // 💬 Toggle chat window
  const toggleChat = () => {
    setIsOpen((s) => !s);
    if (!isOpen && messages.length === 0) {
      setTimeout(() => {
        const intro =
          "Hi 👋 I'm Foodie AI — you can chat or use voice to order food! Try saying 'Add Paneer Tikka to cart' 🎙️";
        setMessages([{ sender: "bot", text: intro }]);
      }, 250);
    }
  };

  // 🎙️ Start / Stop voice recognition
  const startStopListening = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Voice not supported in this browser.");
      return;
    }
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch (err) {
        console.warn("Could not start recognition", err);
      }
    }
  };

  // 🧠 Send text to backend (from user input or voice)
  const handleSendText = async (text) => {
    if (!text.trim()) return;
    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Get current cart to pass along (needed for "place order" intent)
    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/ai/chat`,
        { message: text, cart: currentCart },
        { timeout: 15000 }
      );

      if (res?.data) {
        const { reply, dishes, action, order_id } = res.data;
        const botMsg = { sender: "bot", text: reply || "Sorry, I didn't get that." };

        // 🍽️ Show dishes if AI recommends them
        if (dishes && Array.isArray(dishes) && dishes.length > 0) {
          botMsg.dishes = dishes;
        }

        // 🧩 Handle AI actions
        if (action === "add_to_cart" && dishes?.length > 0) {
          const dish = dishes[0];
          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          const existing = cart.find((it) => it._id === dish._id);
          if (existing) existing.quantity += 1;
          else cart.push({ ...dish, quantity: 1 });
          localStorage.setItem("cart", JSON.stringify(cart));
          window.dispatchEvent(new Event("cart-updated"));
        }

        // ✅ FIX: Corrected route from "/order-summary/:id" to "/order/:id"
        // (matching the route defined in App.jsx)
        if (action === "place_order" && order_id) {
          botMsg.text += " Redirecting you to your order summary...";
          setTimeout(() => {
            navigate(`/order/${order_id}`);
          }, 2500);
        }

        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "⚠️ No response from server." },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setListening(false);
    }
  };

  const handleSend = async (e) => {
    e && e.preventDefault();
    if (!input.trim()) return;
    await handleSendText(input);
  };

  // ⬇️ Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="chat-widget-wrapper">
      {/* Floating Button */}
      {!isOpen && (
        <div
          onClick={toggleChat}
          style={styles.floatingButton}
          title="Talk to Foodie AI"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
            alt="AI Assistant"
            style={{ width: 40, height: 40 }}
          />
        </div>
      )}

      {/* Chat Window */}
      <div
        style={{
          ...styles.chatWindow,
          bottom: isOpen ? "100px" : "-600px",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1)" : "scale(0.9)",
        }}
      >
        {/* Header */}
        <div style={styles.header}>
          🍰 Foodie AI
          <div style={styles.headerBtns}>
            <button
              onClick={startStopListening}
              title="Voice order"
              style={{
                ...styles.micBtn,
                background: listening ? "rgba(255,255,255,0.3)" : "transparent",
              }}
            >
              {listening ? "🔴 Listening" : "🎙️"}
            </button>
            <span onClick={() => setIsOpen(false)} style={styles.closeBtn}>
              ✖
            </span>
          </div>
        </div>

        {/* Messages */}
        <div id="chat-messages-container" style={styles.messageContainer}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.messageRow,
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              {/* 👤 Avatar */}
              {msg.sender === "bot" && (
                <img
                  src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png"
                  alt="bot"
                  style={styles.avatar}
                />
              )}

              <div
                style={{
                  ...styles.messageBubble,
                  backgroundColor:
                    msg.sender === "user" ? "#ff4d6d" : "#f1f1f1",
                  color: msg.sender === "user" ? "#fff" : "#000",
                  borderRadius:
                    msg.sender === "user"
                      ? "16px 16px 2px 16px"
                      : "16px 16px 16px 2px",
                }}
              >
                {msg.text}

                {/* 🍽️ Dishes */}
                {msg.dishes && (
                  <div style={styles.dishContainer}>
                    {msg.dishes.map((d, i) => (
                      <div key={i} style={styles.dishCard}>
                        {d.image && (
                          <img
                            src={d.image}
                            alt={d.name}
                            style={styles.dishImage}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <div style={styles.dishName}>{d.name}</div>
                        <div style={styles.dishPrice}>₹{d.price}</div>
                        <button
                          onClick={() => {
                            const cart =
                              JSON.parse(localStorage.getItem("cart")) || [];
                            const existing = cart.find(
                              (it) => it._id === d._id
                            );
                            if (existing) existing.quantity += 1;
                            else cart.push({ ...d, quantity: 1 });
                            localStorage.setItem(
                              "cart",
                              JSON.stringify(cart)
                            );
                            window.dispatchEvent(new Event("cart-updated"));
                            setMessages((prev) => [
                              ...prev,
                              {
                                sender: "bot",
                                text: `✅ ${d.name} added to your cart!`,
                              },
                            ]);
                          }}
                          style={styles.addBtn}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
                <img
                  src="https://cdn-icons-png.flaticon.com/512/1077/1077012.png"
                  alt="user"
                  style={styles.avatar}
                />
              )}
            </div>
          ))}
          {loading && (
            <div style={{ textAlign: "center", fontStyle: "italic" }}>
              🤖 Foodie AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <input
            type="text"
            placeholder="Ask about dishes, offers..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={styles.textInput}
          />
          <button onClick={handleSend} style={styles.sendBtn}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;

const styles = {
  floatingButton: {
    position: "fixed",
    bottom: "25px",
    right: "25px",
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff4d6d, #ff6b81)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  chatWindow: {
    position: "fixed",
    right: "25px",
    bottom: "100px",
    width: "380px",
    height: "520px",
    backgroundColor: "#fff",
    borderRadius: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 3000,
    transition: "all 0.35s ease",
  },

  header: {
    background: "linear-gradient(135deg, #ff4d6d, #ff6b81)",
    color: "white",
    padding: "14px 16px",
    fontWeight: 600,
    fontSize: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flex: "0 0 auto",
  },

  headerBtns: { display: "flex", gap: 8, alignItems: "center" },

  micBtn: {
    border: "none",
    color: "white",
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "700",
  },

  closeBtn: { cursor: "pointer", padding: 6 },

  messageContainer: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "14px 12px 20px",
    backgroundColor: "#fafafa",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: "10px",
    scrollBehavior: "smooth",
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    flexShrink: 0,
  },

  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },

  messageBubble: {
    padding: "10px 14px",
    fontSize: "15px",
    lineHeight: "1.5",
    maxWidth: "100%",
    width: "fit-content",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    borderRadius: "16px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  dishContainer: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
    maxHeight: "200px",
    overflowY: "auto",
  },

  dishCard: {
    width: "120px",
    maxWidth: "120px",
    borderRadius: 10,
    background: "#fff",
    padding: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    textAlign: "center",
  },

  dishImage: {
    width: "100%",
    height: "80px",
    objectFit: "cover",
    borderRadius: 8,
  },

  dishName: { fontWeight: 700, marginTop: 6 },
  dishPrice: { fontSize: 13, color: "#777" },

  addBtn: {
    marginTop: 6,
    background: "#ff4d6d",
    color: "#fff",
    border: "none",
    width: "100%",
    padding: "6px",
    borderRadius: 6,
    cursor: "pointer",
  },

  inputArea: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderTop: "1px solid #eee",
    background: "#fff",
  },

  textInput: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: "15px",
  },

  sendBtn: {
    background: "#ff4d6d",
    color: "#fff",
    border: "none",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "18px",
  },
};

// 🧩 Scoped CSS fix for ChatWidget scrolling
const chatScopedFix = `
  .chat-widget-wrapper * {
    overflow: visible !important;
  }

  .chat-widget-wrapper #chat-messages-container {
    overflow-y: auto !important;
    max-height: calc(100% - 100px);
    padding-bottom: 80px;
    scroll-behavior: smooth;
  }

  .chat-widget-wrapper #chat-messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .chat-widget-wrapper #chat-messages-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
  }

  .chat-widget-wrapper {
    position: relative;
    z-index: 4000;
  }
`;

if (typeof document !== "undefined" && !document.getElementById("chatScopedFix")) {
  const style = document.createElement("style");
  style.id = "chatScopedFix";
  style.textContent = chatScopedFix;
  document.head.appendChild(style);
}