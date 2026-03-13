-- Create tables
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS shows (
    id UUID PRIMARY KEY,
    movie_name VARCHAR(255) NOT NULL,
    show_time TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY,
    show_id UUID NOT NULL REFERENCES shows(id),
    seat_number VARCHAR(10) NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(show_id, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    seat_id UUID NOT NULL REFERENCES seats(id),
    user_id UUID NOT NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(seat_id)
);

-- Seed data
DO $$
DECLARE
    show_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    rows TEXT[] := ARRAY['A','B','C','D','E','F','G','H','I','J'];
    cols TEXT[] := ARRAY['1','2','3','4','5','6','7','8','9','10'];
    row_letter TEXT;
    col_num TEXT;
BEGIN
    -- Insert show
    INSERT INTO shows (id, movie_name, show_time)
    VALUES (show_id, 'Concurrent Cinema: The Race Condition', '2026-06-15 19:00:00')
    ON CONFLICT DO NOTHING;

    -- Insert 100 seats (A1-J10)
    FOREACH row_letter IN ARRAY rows LOOP
        FOREACH col_num IN ARRAY cols LOOP
            INSERT INTO seats (id, show_id, seat_number, is_booked, version)
            VALUES (
                gen_random_uuid(),
                show_id,
                row_letter || col_num,
                false,
                1
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
