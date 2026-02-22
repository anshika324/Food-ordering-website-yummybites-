// src/Components/Reservation.jsx
import React, { useState } from "react";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const Reservation = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [tableNo,   setTableNo]   = useState("");
  const [date,      setDate]      = useState("");
  const [time,      setTime]      = useState("");
  const [phone,     setPhone]     = useState("");
  const navigate = useNavigate();

  const handleReservation = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/v1/reservation/send`,
        { firstName, lastName, tableNo, phone, date, time },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(data.message);
      setFirstName(""); setLastName(""); setTableNo("");
      setPhone(""); setDate(""); setTime("");
      navigate("/success");
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || "Reservation failed. Try again!";
      toast.error(errorMsg);
    }
  };

  return (
    <>
      <style>{`
        .res-section {
          display: flex;
          min-height: 75vh;
          padding: 30px 20px;
          justify-content: center;
          align-items: center;
          background: url(/reserve.svg) no-repeat right / cover;
        }
        .res-container {
          max-width: 1500px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 40px;
        }
        .res-img-side {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .res-img-side img {
          width: 100%;
          max-width: 550px;
        }
        .res-form-side {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        /* === THE FORM BOX — always dark to match screenshot === */
        .res-box {
          background: rgba(18, 28, 59, 0.92);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 36px 40px;
          width: 100%;
          max-width: 400px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 40px rgba(0, 255, 200, 0.45);
        }
        .res-box h1 {
          color: #ffffff;
          font-weight: 300;
          font-size: 2.2rem;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }
        .res-box p {
          color: #80a4c8ff;
          font-size: 16px;
          font-weight: 300;
          text-align: center;
          margin-bottom: 32px;
        }
        .res-row {
          display: flex;
          gap: 24px;
          margin-bottom: 28px;
        }
        /* Each input wrapper */
        .res-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid rgba(248, 243, 243, 0.82);
          padding-bottom: 6px;
        }
        .res-field input {
          background: none;
          border: none;
          outline: none;
          color: #e0e8f0;
          font-size: 16px;
          font-family: "Oswald", sans-serif;
          font-weight: 400;
          width: 100%;
          padding: 4px 0;
          caret-color: #e91e63;
          colorScheme: light;
        }
        .res-field input::placeholder {
          color: #eaedefff;
          opacity: 1;
        }
        /* Date/time picker icons white */
        .res-field input[type="date"]::-webkit-calendar-picker-indicator,
        .res-field input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(1);
          cursor: pointer;
          color-scheme: light;
        }
        /* Submit button */
        .res-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 32px auto 0;
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 30px;
          padding: 10px 32px;
          background: transparent;
          color: #ebeef2fe;
          font-size: 14px;
          font-family: "Oswald", sans-serif;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .res-btn:hover {
          background: rgba(144, 135, 175, 0.34);
        }
        .res-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e91e63;
          border-radius: 50%;
          padding: 4px;
          color: #fff;
        }
        /* Responsive */
        @media (max-width: 885px) {
          .res-container { flex-direction: column; }
          .res-img-side img { max-width: 70vw; }
          .res-box { max-width: 100%; }
        }
        @media (max-width: 520px) {
          .res-box { padding: 24px 20px; }
          .res-box h1 { font-size: 1.6rem; }
          .res-row { gap: 14px; }
        }
      `}</style>

      <section className="res-section" id="reservation">
        <div className="res-container">

          {/* Left: image */}
          <div className="res-img-side">
            <img src="/reservation.png" alt="reservation" />
          </div>

          {/* Right: dark form box */}
          <div className="res-form-side">
            <div className="res-box">
              <h1>MAKE A RESERVATION</h1>
              <p>Book your table in advance to enjoy dining experience!</p>

              <form onSubmit={handleReservation}>
                {/* Row 1 */}
                <div className="res-row">
                  <div className="res-field">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="res-field">
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="res-row">
                  <div className="res-field">
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                  <div className="res-field">
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      required
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="res-row">
                  <div className="res-field">
                    <input
                      type="number"
                      placeholder="Table No."
                      min="1"
                      max="100"
                      value={tableNo}
                      onChange={e => setTableNo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="res-field">
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="res-btn">
                  RESERVE NOW
                  <span className="res-btn-icon">
                    <HiOutlineArrowNarrowRight />
                  </span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </section>
    </>
  );
};

export default Reservation;