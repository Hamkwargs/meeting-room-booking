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

async function updateBooking(req, res) {
    const { id } = req.params;
    const { room_id, title, start_time, end_time } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingResult = await client.query(
            'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [id, req.user.id]
        );
        const existing = existingResult.rows[0];
        if (!existing) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (existing.status !== 'confirmed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot update a cancelled booking' });
        }

        const newRoomId = room_id || existing.room_id;
        const newTitle = title || existing.title;
        const newStart = start_time ? new Date(start_time) : existing.start_time;
        const newEnd = end_time ? new Date(end_time) : existing.end_time;

        if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid time range: end_time must be after start_time' });
        }
        if (newStart < new Date()) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot book a time slot in the past' });
        }

        const roomCheck = await client.query('SELECT id FROM rooms WHERE id = $1 FOR UPDATE', [newRoomId]);
        if (roomCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Room not found' });
        }

        const conflictResult = await client.query(
            `SELECT id FROM bookings
       WHERE room_id = $1 AND status = 'confirmed' AND id != $2
       AND start_time < $4 AND end_time > $3`,
            [newRoomId, id, newStart, newEnd]
        );
        if (conflictResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'This room is already booked during the requested time slot' });
        }

        const result = await client.query(
            `UPDATE bookings SET room_id = $1, title = $2, start_time = $3, end_time = $4
       WHERE id = $5 RETURNING *`,
            [newRoomId, newTitle, newStart, newEnd, id]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('updateBooking error:', err);
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

async function searchRooms(req, res) {
    const { start_time, end_time, min_capacity, equipment } = req.query;

    // เวลา: ต้องมาคู่กันทั้ง start และ end หรือไม่ต้องใส่เลย
    if ((start_time && !end_time) || (!start_time && end_time)) {
        return res.status(400).json({ error: 'Both start_time and end_time are required together' });
    }

    const start = start_time ? new Date(start_time) : null;
    const end = end_time ? new Date(end_time) : null;

    if (start && end && (isNaN(start) || isNaN(end) || end <= start)) {
        return res.status(400).json({ error: 'Invalid time range: end_time must be after start_time' });
    }

    const capacity = min_capacity ? parseInt(min_capacity, 10) : 0;
    if (isNaN(capacity) || capacity < 0) {
        return res.status(400).json({ error: 'min_capacity must be a non-negative number' });
    }

    const equipmentList = equipment
        ? equipment.split(',').map((e) => e.trim()).filter(Boolean)
        : [];

    try {
        const params = [capacity];
        let query = `
      SELECT r.*, COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), '{}') AS equipment
      FROM rooms r
      LEFT JOIN room_equipment re ON re.room_id = r.id
      LEFT JOIN equipment e ON e.id = re.equipment_id
      WHERE r.capacity >= $1
    `;

        if (start && end) {
            params.push(start, end);
            query += `
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = r.id AND b.status = 'confirmed'
        AND b.start_time < $${params.length} AND b.end_time > $${params.length - 1}
      )
      `;
        }

        query += ` GROUP BY r.id `;

        if (equipmentList.length > 0) {
            params.push(equipmentList);
            query += ` HAVING array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL) @> $${params.length}::text[] `;
        }

        query += ` ORDER BY r.id `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('searchRooms error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { listRooms, createRoom, deleteRoom, listRoomsWithBookings, searchRooms };