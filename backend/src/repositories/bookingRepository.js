const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

async function createBooking(seatId, userId, client) {
  const db = client || pool;
  const bookingId = uuidv4();
  await db.query(
    `INSERT INTO bookings (id, seat_id, user_id, booked_at) VALUES ($1, $2, $3, NOW())`,
    [bookingId, seatId, userId]
  );
  return bookingId;
}

module.exports = { createBooking };
