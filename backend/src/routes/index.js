const express = require('express');
const router = express.Router();

const { getSeatsForShow } = require('../controllers/showsController');
const { getSeat } = require('../controllers/seatsController');
const { createBooking } = require('../controllers/bookingsController');

// Shows routes
router.get('/shows/:showId/seats', getSeatsForShow);

// Seats routes
router.get('/seats/:seatId', getSeat);

// Bookings routes
router.post('/bookings', createBooking);

module.exports = router;
