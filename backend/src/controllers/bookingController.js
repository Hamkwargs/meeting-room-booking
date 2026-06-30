const pool = require('../db/pool');

async function listBookings(req, res) {
    try {
        const result = await pool.query(
            `SELECT b.*, r.name AS room_name, u.name AS user_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       WHERE b.user_id = $1
       ORDER BY b.start_time DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('listBookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createBooking(req, res) {
    const { room_id, title, start_time, end_time } = req.body;

    if (!room_id || !title || !start_time || !end_time) {
        return res.status(400).json({ error: 'room_id, title, start_time, end_time are required' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start) || isNaN(end) || end <= start) {
        return res.status(400).json({ error: 'Invalid time range: end_time must be after start_time' });
    }
    if (start < new Date()) {
        return res.status(400).json({ error: 'Cannot book a time slot in the past' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock แถวของห้องนี้ไว้ก่อน กันคนอื่นมาจองห้องเดียวกันพร้อมกัน (race condition)
        const roomCheck = await client.query('SELECT id FROM rooms WHERE id = $1 FOR UPDATE', [room_id]);
        if (roomCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Room not found' });
        }

        const conflictResult = await client.query(
            `SELECT id FROM bookings
       WHERE room_id = $1 AND status = 'confirmed' AND start_time < $3 AND end_time > $2`,
            [room_id, start, end]
        );
        if (conflictResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'This room is already booked during the requested time slot' });
        }

        const result = await client.query(
            `INSERT INTO bookings (room_id, user_id, title, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [room_id, req.user.id, title, start, end]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('createBooking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function cancelBooking(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
       RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found or already cancelled' });
        }

        res.json({ message: 'Booking cancelled', booking: result.rows[0] });
    } catch (err) {
        console.error('cancelBooking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { listBookings, createBooking, cancelBooking };