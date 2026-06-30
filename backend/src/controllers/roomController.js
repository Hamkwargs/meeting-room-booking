const pool = require('../db/pool');

async function listRooms(req, res) {
    try {
        const result = await pool.query(`
      SELECT r.*, COALESCE(array_agg(e.name) FILTER (WHERE e.name IS NOT NULL), '{}') AS equipment
      FROM rooms r
      LEFT JOIN room_equipment re ON re.room_id = r.id
      LEFT JOIN equipment e ON e.id = re.equipment_id
      GROUP BY r.id
      ORDER BY r.id
    `);
        res.json(result.rows);
    } catch (err) {
        console.error('listRooms error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createRoom(req, res) {
    const { name, location, capacity, equipment_ids } = req.body;
    if (!name || !capacity) {
        return res.status(400).json({ error: 'name and capacity are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const roomResult = await client.query(
            `INSERT INTO rooms (name, location, capacity) VALUES ($1, $2, $3) RETURNING *`,
            [name, location || null, capacity]
        );
        const room = roomResult.rows[0];

        if (Array.isArray(equipment_ids) && equipment_ids.length > 0) {
            const values = equipment_ids.map((eqId) => `(${room.id}, ${eqId})`).join(',');
            await client.query(`INSERT INTO room_equipment (room_id, equipment_id) VALUES ${values}`);
        }

        await client.query('COMMIT');
        res.status(201).json(room);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('createRoom error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function deleteRoom(req, res) {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json({ message: 'Room deleted', id: result.rows[0].id });
    } catch (err) {
        console.error('deleteRoom error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { listRooms, createRoom, deleteRoom };