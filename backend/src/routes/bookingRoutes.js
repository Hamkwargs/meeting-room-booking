const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listRooms, createRoom, deleteRoom, listRoomsWithBookings, searchRooms } = require('../controllers/roomController');

router.get('/', authenticate, listRooms);
router.get('/overview', authenticate, listRoomsWithBookings);
router.get('/search', authenticate, searchRooms);
router.post('/', authenticate, requireAdmin, createRoom);
router.delete('/:id', authenticate, requireAdmin, deleteRoom);

module.exports = router;