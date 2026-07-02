-- ==============================================================
-- Users
-- ==============================================================

CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
    CHECK (role IN ('user', 'admin'))
    );


-- ==============================================================
-- Rooms and Equipment
-- ==============================================================

CREATE TABLE IF NOT EXISTS rooms (
                                     id SERIAL PRIMARY KEY,
                                     name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(150),
    capacity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT rooms_capacity_check
    CHECK (capacity > 0)
    );

CREATE TABLE IF NOT EXISTS equipment (
                                         id SERIAL PRIMARY KEY,
                                         name VARCHAR(100) NOT NULL UNIQUE
    );

CREATE TABLE IF NOT EXISTS room_equipment (
                                              room_id INT NOT NULL
                                              REFERENCES rooms(id)
    ON DELETE CASCADE,

    equipment_id INT NOT NULL
    REFERENCES equipment(id)
    ON DELETE CASCADE,

    PRIMARY KEY (room_id, equipment_id)
    );


-- ==============================================================
-- Bookings
-- ==============================================================

CREATE TABLE IF NOT EXISTS bookings (
                                        id SERIAL PRIMARY KEY,

                                        room_id INT NOT NULL
                                        REFERENCES rooms(id)
    ON DELETE CASCADE,

    user_id INT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_time_range
    CHECK (end_time > start_time),

    CONSTRAINT bookings_status_check
    CHECK (status IN ('confirmed', 'cancelled'))
    );

CREATE INDEX IF NOT EXISTS idx_bookings_room_time
    ON bookings (room_id, start_time, end_time)
    WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_bookings_user
    ON bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_start_time
    ON bookings (start_time);


-- ==============================================================
-- Seed Rooms
-- ==============================================================

INSERT INTO rooms (
    name,
    location,
    capacity
)
VALUES
    ('Phoenix', 'Floor 3', 8),
    ('Falcon', 'Floor 5', 4),
    ('Griffin', 'Floor 5', 12)
    ON CONFLICT (name) DO UPDATE
                              SET
                                  location = EXCLUDED.location,
                              capacity = EXCLUDED.capacity;


-- ==============================================================
-- Seed Equipment
-- ==============================================================

INSERT INTO equipment (name)
VALUES
    ('Projector'),
    ('Whiteboard'),
    ('TV'),
    ('Video Conference')
    ON CONFLICT (name) DO NOTHING;


-- ==============================================================
-- Seed Room Equipment
-- ==============================================================

INSERT INTO room_equipment (
    room_id,
    equipment_id
)
SELECT
    r.id,
    e.id
FROM (
         VALUES
             ('Phoenix', 'Projector'),
             ('Phoenix', 'Whiteboard'),
             ('Falcon', 'TV'),
             ('Falcon', 'Video Conference'),
             ('Griffin', 'Projector'),
             ('Griffin', 'TV'),
             ('Griffin', 'Video Conference')
     ) AS seed(room_name, equipment_name)
         JOIN rooms r
              ON r.name = seed.room_name
         JOIN equipment e
              ON e.name = seed.equipment_name
    ON CONFLICT (room_id, equipment_id) DO NOTHING;