import ErrorHandler from "../middlewares/error.js";
import { Reservation } from "../models/reservation.js";

const send_reservation = async (req, res, next) => {
  const { firstName, lastName, tableNo, date, time, phone } = req.body;

  if (!firstName || !lastName || !tableNo || !date || !time || !phone) {
    return next(new ErrorHandler("Please fill out the full reservation form!", 400));
  }

  try {
    await Reservation.create({ firstName, lastName, tableNo, date, time, phone });

    res.status(201).json({
      success: true,
      message: "Reservation booked successfully!",
    });
  } catch (error) {
    // ⚠️ Duplicate Key Error (MongoDB code 11000)
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue).join(", ");
      return next(new ErrorHandler(
        `Table ${error.keyValue.tableNo} is already booked for ${error.keyValue.date} at ${error.keyValue.time}. Please choose another time or table.`,
        400
      ));
    }

    // ⚠️ Mongoose Validation Errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return next(new ErrorHandler(validationErrors.join(", "), 400));
    }

    return next(error);
  }
};

export default send_reservation;
