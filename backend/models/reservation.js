import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required."],
    minLength: [3, "First name must be at least 3 characters."],
    maxLength: [30, "First name cannot exceed 30 characters."],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required."],
    minLength: [3, "Last name must be at least 3 characters."],
    maxLength: [30, "Last name cannot exceed 30 characters."],
  },
  date: {
    type: String,
    required: [true, "Reservation date is required."],
  },
  time: {
    type: String,
    required: [true, "Reservation time is required."],
  },
  tableNo: {
    type: Number,
    required: [true, "Table number is required."],
    min: [1, "Table number must be at least 1."],
    max: [100, "Table number cannot exceed 100."],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required."],
    minLength: [10, "Phone number must contain exactly 10 digits."],
    maxLength: [10, "Phone number must contain exactly 10 digits."],
  },
});

// ✅ Prevent double booking of the same table for the same date and time
reservationSchema.index({ tableNo: 1, date: 1, time: 1 }, { unique: true });

export const Reservation = mongoose.model("Reservation", reservationSchema);
