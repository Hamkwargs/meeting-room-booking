const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    listBookings,
    listAllBookings,
    listRoomBookings,
    createBooking,
    updateBooking,
    cancelBooking,
} = require('../controllers/bookingController');

router.get('/', authenticate, listBookings);
router.get('/all', authenticate, listAllBookings);          // booking ทุกห้อง ทุก user (สำหรับหน้าปฏิทินรวม)
router.get('/room/:id', authenticate, listRoomBookings);    // booking ของห้องเดียว
router.post('/', authenticate, createBooking);
router.patch('/:id', authenticate, updateBooking);          // ย้ายเวลา/ห้อง
router.patch('/:id/cancel', authenticate, cancelBooking);

module.exports = router;