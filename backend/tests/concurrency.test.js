/**
 * Concurrency Test: Optimistic Locking
 *
 * This test verifies that when two concurrent requests attempt to book
 * the same seat with the same version number, exactly one succeeds and
 * the other receives a 409 Conflict response.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://user:password@localhost:5432/booking_db';

const BASE_URL = process.env.API_URL || 'http://localhost:8080';

let pool;

beforeAll(async () => {
  pool = new Pool({ connectionString: DATABASE_URL });
  // Wait briefly for services
  await new Promise((r) => setTimeout(r, 500));
});

afterAll(async () => {
  await pool.end();
});

describe('Optimistic Locking - Concurrent Seat Booking', () => {
  test('exactly one of two concurrent requests succeeds and one gets 409', async () => {
    // Get a valid show and an available seat
    const showResult = await pool.query('SELECT id FROM shows LIMIT 1');
    expect(showResult.rows.length).toBeGreaterThan(0);
    const showId = showResult.rows[0].id;

    const seatResult = await pool.query(
      'SELECT id, version FROM seats WHERE show_id = $1 AND is_booked = false LIMIT 1',
      [showId]
    );
    expect(seatResult.rows.length).toBeGreaterThan(0);
    const { id: seatId, version } = seatResult.rows[0];

    const userId1 = uuidv4();
    const userId2 = uuidv4();

    // Fire two concurrent booking requests for the same seat and same version
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: userId1, version }),
      }),
      fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userId: userId2, version }),
      }),
    ]);

    const statuses = [res1.status, res2.status];
    const bodies = await Promise.all([res1.json(), res2.json()]);

    // Exactly one should succeed (200) and one should conflict (409)
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const successBody = bodies[statuses.indexOf(200)];
    const failBody = bodies[statuses.indexOf(409)];

    expect(successBody.status).toBe('SUCCESS');
    expect(successBody.bookingId).toBeDefined();

    expect(failBody.status).toBe('FAILED');
    expect(failBody.reason).toBe('SEAT_ALREADY_BOOKED');

    // Verify database state: seat is booked, version incremented to 2
    const dbSeat = await pool.query(
      'SELECT is_booked, version FROM seats WHERE id = $1',
      [seatId]
    );
    expect(dbSeat.rows[0].is_booked).toBe(true);
    expect(dbSeat.rows[0].version).toBe(version + 1);

    // Verify exactly one booking record exists
    const bookingCount = await pool.query(
      'SELECT COUNT(*) FROM bookings WHERE seat_id = $1',
      [seatId]
    );
    expect(parseInt(bookingCount.rows[0].count)).toBe(1);
  }, 30000);

  test('booking with stale version returns 409', async () => {
    const seatResult = await pool.query(
      'SELECT id, version FROM seats WHERE is_booked = false LIMIT 1 OFFSET 5'
    );
    expect(seatResult.rows.length).toBeGreaterThan(0);
    const { id: seatId, version } = seatResult.rows[0];

    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, userId: uuidv4(), version: version - 1 }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.status).toBe('FAILED');
    expect(body.reason).toBe('SEAT_ALREADY_BOOKED');
  });

  test('booking already booked seat returns 409', async () => {
    const seatResult = await pool.query(
      'SELECT id, version FROM seats WHERE is_booked = false LIMIT 1 OFFSET 10'
    );
    const { id: seatId, version } = seatResult.rows[0];

    // First booking succeeds
    const res1 = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, userId: uuidv4(), version }),
    });
    expect(res1.status).toBe(200);

    // Second booking fails
    const res2 = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, userId: uuidv4(), version: version + 1 }),
    });
    expect(res2.status).toBe(409);
    const body = await res2.json();
    expect(body.status).toBe('FAILED');
    expect(body.reason).toBe('SEAT_ALREADY_BOOKED');
  });
});
