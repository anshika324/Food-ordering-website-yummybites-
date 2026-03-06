// frontend/src/Components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { recognitionRef.current = null; return; }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => handleSendText(event.results[0][0].transcript);
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleChat = () => {
    setIsOpen((s) => !s);
    if (!isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([{ sender: "bot", text: "Hi 👋 I'm Foodie AI — chat or use voice to order! Try: 'Add Paneer Tikka to cart' 🎙️" }]);
      }, 250);
    }
  };

  const startStopListening = () => {
    const rec = recognitionRef.current;
    if (!rec) { alert("Voice not supported in this browser."); return; }
    if (listening) { rec.stop(); setListening(false); }
    else { try { rec.start(); setListening(true); } catch (err) { console.warn(err); } }
  };

  const handleSendText = async (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setLoading(true);
    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];

    try {
      // api.js: 60s timeout + auto-retry — handles Render cold start on mobile data
      const res = await api.post("/api/v1/ai/chat", { message: text, cart: currentCart });
      const { reply, dishes, action, order_id } = res.data;
      const botMsg = { sender: "bot", text: reply || "Sorry, I didn't get that." };

      if (dishes?.length > 0) botMsg.dishes = dishes;

      if (action === "add_to_cart" && dishes?.length > 0) {
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const ex = cart.find((it) => it._id === dishes[0]._id);
        if (ex) ex.quantity += 1; else cart.push({ ...dishes[0], quantity: 1 });
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
      }

      if (action === "place_order" && order_id) {
        botMsg.text += " Redirecting to your order summary...";
        setTimeout(() => navigate(`/order/${order_id}`), 2500);
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const isTimeout = err.code === "ECONNABORTED" || err.code === "ERR_NETWORK" || !err.response;
      setMessages((prev) => [...prev, {
        sender: "bot",
        text: isTimeout
          ? "⏳ Server is waking up, please try again in a moment..."
          : "⚠️ Something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
      setListening(false);
    }
  };

  const handleSend = (e) => { e?.preventDefault(); handleSendText(input); };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  return (
    <div className="chat-widget-wrapper">
      {!isOpen && (
        <div onClick={toggleChat} style={styles.floatingButton} title="Talk to Foodie AI">
          <img src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png" alt="AI" style={{ width: 40, height: 40 }} />
        </div>
      )}

      <div style={{ ...styles.chatWindow, bottom: isOpen ? "100px" : "-600px", opacity: isOpen ? 1 : 0, transform: isOpen ? "scale(1)" : "scale(0.9)" }}>
        <div style={styles.header}>
          🍰 Foodie AI
          <div style={styles.headerBtns}>
            <button onClick={startStopListening} style={{ ...styles.micBtn, background: listening ? "rgba(255,255,255,0.3)" : "transparent" }}>
              {listening ? "🔴 Listening" : "🎙️"}
            </button>
            <span onClick={() => setIsOpen(false)} style={styles.closeBtn}>✖</span>
          </div>
        </div>

        <div id="chat-messages-container" style={styles.messageContainer}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ ...styles.messageRow, justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}>
              {msg.sender === "bot" && <img src="https://cdn-icons-png.flaticon.com/512/4712/4712100.png" alt="bot" style={styles.avatar} />}
              <div style={{ ...styles.messageBubble, backgroundColor: msg.sender === "user" ? "#ff4d6d" : "#f1f1f1", color: msg.sender === "user" ? "#fff" : "#000", borderRadius: msg.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px" }}>
                {msg.text}
                {msg.dishes && (
                  <div style={styles.dishContainer}>
                    {msg.dishes.map((d, i) => (
                      <div key={i} style={styles.dishCard}>
                        {d.image && <img src={d.image} alt={d.name} style={styles.dishImage} onError={(e) => { e.target.style.display = "none"; }} />}
                        <div style={styles.dishName}>{d.name}</div>
                        <div style={styles.dishPrice}>₹{d.price}</div>
                        <button onClick={() => {
                          const cart = JSON.parse(localStorage.getItem("cart")) || [];
                          const ex = cart.find((it) => it._id === d._id);
                          if (ex) ex.quantity += 1; else cart.push({ ...d, quantity: 1 });
                          localStorage.setItem("cart", JSON.stringify(cart));
                          window.dispatchEvent(new Event("cart-updated"));
                          setMessages((prev) => [...prev, { sender: "bot", text: `✅ ${d.name} added to cart!` }]);
                        }} style={styles.addBtn}>Add</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.sender === "user" && <img src="https://cdn-icons-png.flaticon.com/512/1077/1077012.png" alt="user" style={styles.avatar} />}
            </div>
          ))}
          {loading && <div style={{ textAlign: "center", fontStyle: "italic" }}>🤖 Foodie AI is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <input type="text" placeholder="Ask about dishes, offers..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} style={styles.textInput} />
          <button onClick={handleSend} style={styles.sendBtn}>➤</button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;

const styles = {
  floatingButton:  { position: "fixed", bottom: "25px", right: "25px", width: "70px", height: "70px", borderRadius: "50%", background: "linear-gradient(135deg, #ff4d6d, #ff6b81)", boxShadow: "0 8px 20px rgba(0,0,0,0.3)", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  chatWindow:      { position: "fixed", right: "25px", bottom: "100px", width: "380px", height: "520px", backgroundColor: "#fff", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 3000, transition: "all 0.35s ease" },
  header:          { background: "linear-gradient(135deg, #ff4d6d, #ff6b81)", color: "white", padding: "14px 16px", fontWeight: 600, fontSize: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flex: "0 0 auto" },
  headerBtns:      { display: "flex", gap: 8, alignItems: "center" },
  micBtn:          { border: "none", color: "white", padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontWeight: "700" },
  closeBtn:        { cursor: "pointer", padding: 6 },
  messageContainer:{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "14px 12px 20px", backgroundColor: "#fafafa", display: "flex", flexDirection: "column", gap: "10px", scrollBehavior: "smooth" },
  avatar:          { width: 32, height: 32, borderRadius: "50%", flexShrink: 0 },
  messageRow:      { display: "flex", alignItems: "flex-end", gap: "8px" },
  messageBubble:   { padding: "10px 14px", fontSize: "15px", lineHeight: "1.5", maxWidth: "100%", width: "fit-content", wordWrap: "break-word", overflowWrap: "break-word", borderRadius: "16px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" },
  dishContainer:   { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, maxHeight: "200px", overflowY: "auto" },
  dishCard:        { width: "120px", borderRadius: 10, background: "#fff", padding: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", textAlign: "center" },
  dishImage:       { width: "100%", height: "80px", objectFit: "cover", borderRadius: 8 },
  dishName:        { fontWeight: 700, marginTop: 6 },
  dishPrice:       { fontSize: 13, color: "#777" },
  addBtn:          { marginTop: 6, background: "#ff4d6d", color: "#fff", border: "none", width: "100%", padding: "6px", borderRadius: 6, cursor: "pointer" },
  inputArea:       { flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: "1px solid #eee", background: "#fff" },
  textInput:       { flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd", outline: "none", fontSize: "15px" },
  sendBtn:         { background: "#ff4d6d", color: "#fff", border: "none", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: "18px" },
};

if (typeof document !== "undefined" && !document.getElementById("chatScopedFix")) {
  const style = document.createElement("style");
  style.id = "chatScopedFix";
  style.textContent = `
    .chat-widget-wrapper * { overflow: visible !important; }
    .chat-widget-wrapper #chat-messages-container { overflow-y: auto !important; max-height: calc(100% - 100px); padding-bottom: 80px; scroll-behavior: smooth; }
    .chat-widget-wrapper #chat-messages-container::-webkit-scrollbar { width: 6px; }
    .chat-widget-wrapper #chat-messages-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 8px; }
    .chat-widget-wrapper { position: relative; z-index: 4000; }
  `;
  document.head.appendChild(style);
}