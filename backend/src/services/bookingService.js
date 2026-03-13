const pool = require('../db');
const { bookSeatOptimistically } = require('../repositories/seatRepository');
const { createBooking } = require('../repositories/bookingRepository');

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Book a seat using optimistic locking within a transaction.
 * Throws ConflictError if the seat is already booked or version mismatch.
 */
async function bookSeat(seatId, userId, version) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { success } = await bookSeatOptimistically(seatId, version, client);

    if (!success) {
      await client.query('ROLLBACK');
      throw new ConflictError('SEAT_ALREADY_BOOKED');
    }

    const bookingId = await createBooking(seatId, userId, client);

    await client.query('COMMIT');
    return bookingId;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { bookSeat, ConflictError };
