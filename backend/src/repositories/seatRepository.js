const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const getAllSeatsByShowId = async (showId) => {
  const result = await pool.query(
    `SELECT id, seat_number AS "seatNumber", is_booked AS "isBooked", version
     FROM seats WHERE show_id = $1 ORDER BY seat_number`,
    [showId]
  );
  return result.rows;
};

// Alias used by showsController
const getSeatsByShowId = getAllSeatsByShowId;

const getSeatById = async (seatId) => {
  const result = await pool.query(
    `SELECT id, seat_number AS "seatNumber", is_booked AS "isBooked", version
     FROM seats WHERE id = $1`,
    [seatId]
  );
  return result.rows[0] || null;
};

/**
 * Optimistic locking update within an existing transaction.
 * Returns { success: true } if updated, { success: false } if version mismatch or already booked.
 */
const bookSeatOptimistically = async (seatId, version, client) => {
  const updateResult = await client.query(
    `UPDATE seats
     SET is_booked = true, version = version + 1
     WHERE id = $1 AND is_booked = false AND version = $2
     RETURNING id`,
    [seatId, version]
  );
  return { success: updateResult.rowCount > 0 };
};

module.exports = { getAllSeatsByShowId, getSeatsByShowId, getSeatById, bookSeatOptimistically };
