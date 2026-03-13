const { getSeatById } = require('../repositories/seatRepository');

async function getSeat(req, res) {
  const { seatId } = req.params;
  try {
    const seat = await getSeatById(seatId);
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    res.json(seat);
  } catch (err) {
    console.error('Error fetching seat:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getSeat };
