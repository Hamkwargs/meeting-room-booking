-- User ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- Room, Equipment ===============================================
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150),
    capacity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS room_equipment (
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    equipment_id INT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, equipment_id)
);


-- Booking ======================================================= 
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings (room_id, start_time, end_time)
    WHERE status = 'confirmed';


-- Seed ==========================================================
INSERT INTO rooms (name, location, capacity) VALUES
    ('Phoenix', 'Floor 3', 8),
    ('Falcon', 'Floor 5', 4),
    ('Griffin', 'Floor 5', 12)
ON CONFLICT DO NOTHING;

INSERT INTO equipment (name) VALUES
    ('Projector'), ('Whiteboard'), ('TV'), ('Video Conference')
ON CONFLICT DO NOTHING;

INSERT INTO room_equipment (room_id, equipment_id) VALUES
    (1, 1), (1, 2),
    (2, 3), (2, 4),
    (3, 1), (3, 3), (3, 4)
ON CONFLICT DO NOTHING;
