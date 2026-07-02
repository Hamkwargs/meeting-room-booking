const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listBookings, createBooking, updateBooking, cancelBooking } = require('../controllers/bookingController');

router.get('/', authenticate, listBookings);
router.post('/', authenticate, createBooking);
router.patch('/:id', authenticate, updateBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);

module.exports = router;