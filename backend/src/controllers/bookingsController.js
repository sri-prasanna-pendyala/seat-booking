const { bookSeat, ConflictError } = require('../services/bookingService');

async function createBooking(req, res) {
  const { seatId, userId, version } = req.body;

  if (!seatId || !userId || version === undefined || version === null) {
    return res.status(400).json({ error: 'seatId, userId, and version are required' });
  }

  try {
    const bookingId = await bookSeat(seatId, userId, version);
    res.status(200).json({ status: 'SUCCESS', bookingId });
  } catch (err) {
    if (err instanceof ConflictError) {
      return res.status(409).json({ status: 'FAILED', reason: 'SEAT_ALREADY_BOOKED' });
    }
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createBooking };
