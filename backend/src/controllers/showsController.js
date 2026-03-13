const { getSeatsByShowId } = require('../repositories/seatRepository');

async function getSeatsForShow(req, res) {
  const { showId } = req.params;
  try {
    const seats = await getSeatsByShowId(showId);
    res.json(seats);
  } catch (err) {
    console.error('Error fetching seats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getSeatsForShow };
