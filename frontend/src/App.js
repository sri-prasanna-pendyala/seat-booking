import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';
const SHOW_ID = process.env.REACT_APP_SHOW_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function Seat({ seat, onBook, disabled }) {
  const handleClick = () => {
    if (!seat.isBooked && !disabled) {
      onBook(seat);
    }
  };

  return (
    <button
      data-testid={`seat-${seat.seatNumber}`}
      data-status={seat.isBooked ? 'booked' : 'available'}
      className={`seat ${seat.isBooked ? 'seat--booked' : 'seat--available'}`}
      onClick={handleClick}
      disabled={seat.isBooked || disabled}
      title={seat.isBooked ? `Seat ${seat.seatNumber} — Booked` : `Seat ${seat.seatNumber} — Click to book`}
      aria-label={`Seat ${seat.seatNumber}, ${seat.isBooked ? 'booked' : 'available'}`}
    >
      {seat.seatNumber}
    </button>
  );
}

export default function App() {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSeats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shows/${SHOW_ID}/seats`);
      if (!res.ok) throw new Error('Failed to load seats');
      const data = await res.json();
      setSeats(data);
      setError(null);
    } catch (err) {
      setError('Unable to load seats. Please check the server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const handleBook = async (seat) => {
    setBooking(true);
    try {
      // Fetch latest seat details (including current version) before booking
      const detailRes = await fetch(`${API_BASE}/api/seats/${seat.id}`);
      if (!detailRes.ok) throw new Error('Failed to fetch seat details');
      const latestSeat = await detailRes.json();

      if (latestSeat.isBooked) {
        showNotification(`Seat ${seat.seatNumber} was just booked by someone else!`, 'error');
        await fetchSeats();
        return;
      }

      const userId = uuidv4();
      const bookRes = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId: latestSeat.id,
          userId,
          version: latestSeat.version,
        }),
      });

      const result = await bookRes.json();

      if (bookRes.ok && result.status === 'SUCCESS') {
        showNotification(`✓ Seat ${seat.seatNumber} booked successfully! (Booking ID: ${result.bookingId.slice(0, 8)}...)`, 'success');
        // Optimistically update UI
        setSeats((prev) =>
          prev.map((s) => (s.id === seat.id ? { ...s, isBooked: true, version: s.version + 1 } : s))
        );
      } else if (bookRes.status === 409) {
        showNotification(`✗ Conflict: Seat ${seat.seatNumber} was already booked by another user. Please refresh.`, 'error');
        await fetchSeats();
      } else {
        showNotification('An unexpected error occurred. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Network error. Please check your connection.', 'error');
    } finally {
      setBooking(false);
    }
  };

  // Group seats by row label
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatsByRow = rows.reduce((acc, row) => {
    acc[row] = seats.filter((s) => s.seatNumber.startsWith(row));
    return acc;
  }, {});

  const bookedCount = seats.filter((s) => s.isBooked).length;
  const availableCount = seats.length - bookedCount;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 The Grand Spectacle</h1>
        <p className="show-time">Friday, April 1, 2026 · 7:00 PM</p>
        <div className="stats">
          <span className="stat available">{availableCount} Available</span>
          <span className="stat booked">{bookedCount} Booked</span>
        </div>
      </header>

      {notification && (
        <div className={`notification notification--${notification.type}`} role="alert">
          {notification.message}
        </div>
      )}

      <div className="screen-label">SCREEN</div>
      <div className="screen" />

      <main>
        {loading ? (
          <div className="loading">Loading seats…</div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchSeats} className="btn-retry">Retry</button>
          </div>
        ) : (
          <div data-testid="seat-grid" className="seat-grid">
            {rows.map((row) => (
              <div key={row} className="seat-row">
                <span className="row-label">{row}</span>
                <div className="row-seats">
                  {seatsByRow[row].map((seat) => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onBook={handleBook}
                      disabled={booking}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="legend">
        <div className="legend-item">
          <span className="legend-dot available" /> Available
        </div>
        <div className="legend-item">
          <span className="legend-dot booked" /> Booked
        </div>
        <button onClick={fetchSeats} className="btn-refresh" disabled={loading}>
          ↻ Refresh Seats
        </button>
      </footer>
    </div>
  );
}
