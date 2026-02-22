import React, { useState } from "react";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext"; // ✅ Import theme context

const Reservation = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const { dark } = useTheme(); // ✅ Get current theme

  const handleReservation = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        "http://localhost:8000/api/v1/reservation/send",
        {
          firstName,
          lastName,
          tableNo,
          phone,
          date,
          time,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      toast.success(data.message);

      // Reset only on success
      setFirstName("");
      setLastName("");
      setTableNo("");
      setPhone("");
      setDate("");
      setTime("");

      navigate("/success");
    } catch (error) {
      console.error("Reservation error:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "Reservation failed. Try again!";
      toast.error(errorMsg);
    }
  };

  return (
    <section
      className={`reservation ${dark ? "dark-theme" : "light-theme"}`}
      id="reservation"
    >
      <div className="container">
        <div className="banner">
          <img src="/reservation.png" alt="reservation" />
        </div>

        <div className="banner">
          <div className="reservation_form_box">
            <h1>MAKE A RESERVATION</h1>
            <p>Book your table in advance to enjoy dining experience!</p>

            <form onSubmit={handleReservation}>
              <div>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <input
                  type="number"
                  placeholder="Table No."
                  min="1"
                  max="100"
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <button type="submit">
                RESERVE NOW{" "}
                <span>
                  <HiOutlineArrowNarrowRight />
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reservation;