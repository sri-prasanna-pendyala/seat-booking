# 🎬 Seat Booking — Optimistic Locking Demo

A full-stack seat reservation application demonstrating **optimistic locking** to prevent race conditions in concurrent booking scenarios. Built with Node.js/Express, React, and PostgreSQL — fully containerized with Docker.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Optimistic Locking Explained](#optimistic-locking-explained)
- [Concurrency Test](#concurrency-test)
- [Project Structure](#project-structure)

---

## Overview

When two users attempt to book the same seat simultaneously, a naïve implementation may result in a **double booking**. This application prevents that using **optimistic locking**:

1. Every seat row in the database has an integer `version` column (starts at `1`).
2. When a client reads a seat, it receives the current `version`.
3. When a client submits a booking, it sends the `version` it last read.
4. The server performs an atomic `UPDATE … WHERE id = ? AND is_booked = false AND version = ?`.
5. If `0` rows are affected, a conflict occurred → HTTP `409 Conflict` is returned.
6. If `1` row is affected, the booking succeeds → `version` is incremented to `2`.

No row-level locks are held during the read phase, enabling high read concurrency.

---

## Architecture

```
┌─────────────┐       HTTP        ┌──────────────┐      SQL     ┌─────────────┐
│   React UI  │ ◄───────────────► │ Express API  │ ◄──────────► │ PostgreSQL  │
│  (Nginx:    │                   │  (Node.js:   │              │   (port     │
│  port 3000) │                   │  port 8080)  │              │   5432)     │
└─────────────┘                   └──────────────┘              └─────────────┘
```

**Services:**

| Service    | Technology          | Port |
|------------|---------------------|------|
| `frontend` | React + Nginx       | 3000 |
| `backend`  | Node.js + Express   | 8080 |
| `db`       | PostgreSQL 13       | 5432 |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 20.10
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 1.29

### 1. Clone the Repository

```bash
git clone <repo-url>
cd seat-booking
```

### 2. Configure Environment (Optional)

```bash
cp .env.example .env
# Edit .env if you need custom values (defaults work out of the box)
```

### 3. Start Everything

```bash
docker-compose up --build
```

All three services start automatically. The backend waits for PostgreSQL to be healthy before starting, and the database is seeded automatically on first run.

### 4. Open the Application

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Health Check:** http://localhost:8080/health

### Stopping

```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop and remove volumes (fresh start)
```

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example). Key variables:

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `8080` | Backend listen port |
| `DATABASE_URL` | `postgresql://user:password@db:5432/booking_db?sslmode=disable` | PostgreSQL connection string |
| `POSTGRES_USER` | `user` | DB username |
| `POSTGRES_PASSWORD` | `password` | DB password |
| `POSTGRES_DB` | `booking_db` | Database name |
| `REACT_APP_API_URL` | *(empty)* | API base URL for frontend |
| `REACT_APP_SHOW_ID` | `a0eebc99-...` | Default show UUID |

---

## API Reference

### `GET /health`

Returns service health status.

**Response 200:**
```json
{ "status": "healthy" }
```

---

### `GET /api/shows/:showId/seats`

Returns all seats for a show.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "seatNumber": "A1",
    "isBooked": false,
    "version": 1
  }
]
```

---

### `GET /api/seats/:seatId`

Returns a single seat by ID.

**Response 200:**
```json
{
  "id": "uuid",
  "seatNumber": "A1",
  "isBooked": false,
  "version": 1
}
```

**Response 404:** Seat not found.

---

### `POST /api/bookings`

Books a seat using optimistic locking.

**Request Body:**
```json
{
  "seatId": "uuid",
  "userId": "uuid",
  "version": 1
}
```

**Response 200 — Success:**
```json
{
  "status": "SUCCESS",
  "bookingId": "uuid"
}
```

**Response 409 — Conflict (version mismatch or seat already booked):**
```json
{
  "status": "FAILED",
  "reason": "SEAT_ALREADY_BOOKED"
}
```

---

## Optimistic Locking Explained

The core of the mechanism is a **single atomic SQL statement**:

```sql
UPDATE seats
SET is_booked = true, version = version + 1
WHERE id = $1
  AND is_booked = false
  AND version = $2;
```

- If `rowCount === 1`: the update succeeded — no one else modified this row since the client last read it.
- If `rowCount === 0`: either the seat was already booked, or another request updated it first (version mismatch) — return HTTP 409.

This avoids holding any database locks during the read phase, maximising throughput.

**Demonstrating the Race Condition:**

1. Open two browser tabs at http://localhost:3000.
2. Click the same available seat in both tabs as quickly as possible.
3. One tab will show **"Booked successfully"**, the other will show **"Conflict — already booked"**.

---

## Concurrency Test

The automated test in `backend/tests/concurrency.test.js` fires two simultaneous booking requests for the same seat and asserts:

- **Exactly 1** request returns HTTP `200` with `status: "SUCCESS"`.
- **Exactly 1** request returns HTTP `409` with `reason: "SEAT_ALREADY_BOOKED"`.
- The database has `is_booked = true`, `version = 2`, and exactly **1** booking record.

### Running Tests

With the full stack running (`docker-compose up`):

```bash
# From your host machine
cd backend
DATABASE_URL="postgresql://user:password@localhost:5432/booking_db" \
API_BASE_URL="http://localhost:8080" \
npm test
```

Or run inside the backend container:

```bash
docker-compose exec backend sh -c "DATABASE_URL=\$DATABASE_URL npm test"
```

---

## Project Structure

```
seat-booking/
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Environment variable documentation
├── README.md
│
├── seeds/
│   └── 01_init.sql             # DB schema + seed data (auto-run by Postgres)
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express app entry point
│       ├── db.js               # PostgreSQL connection pool
│       ├── routes/
│       │   └── index.js        # Route definitions
│       ├── controllers/
│       │   ├── showsController.js
│       │   ├── seatsController.js
│       │   └── bookingsController.js
│       ├── services/
│       │   └── bookingService.js   # Optimistic locking logic
│       └── repositories/
│           ├── seatRepository.js
│           └── bookingRepository.js
│   └── tests/
│       └── concurrency.test.js # Race condition integration test
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js              # Seat grid + booking logic
        └── App.css
```

---

## Database Schema

```sql
CREATE TABLE shows (
    id UUID PRIMARY KEY,
    movie_name VARCHAR(255) NOT NULL,
    show_time TIMESTAMP NOT NULL
);

CREATE TABLE seats (
    id UUID PRIMARY KEY,
    show_id UUID NOT NULL REFERENCES shows(id),
    seat_number VARCHAR(10) NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,     -- Key for optimistic locking
    UNIQUE(show_id, seat_number)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    seat_id UUID NOT NULL REFERENCES seats(id),
    user_id UUID NOT NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(seat_id)
);
```

Seeded with **1 show** and **100 seats** (rows A–J, columns 1–10), all available at `version = 1`.
