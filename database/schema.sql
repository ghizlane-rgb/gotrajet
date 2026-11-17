-- GOTRAJET test database schema (SQLite).
-- Test data only: mirrors the browser demo (dist/js/app.js). Not a production schema.
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS cash_topups;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS payment_cards;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS parcels;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS cities;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'individual' CHECK (role IN ('individual', 'carrier')),
  rating        REAL DEFAULT 0,
  review_count  INTEGER DEFAULT 0,
  vehicle       TEXT,
  balance_mad   REAL NOT NULL DEFAULT 0,
  verified_id   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cities (
  name TEXT PRIMARY KEY,
  lat  REAL NOT NULL,
  lng  REAL NOT NULL
);

CREATE TABLE trips (
  id            TEXT PRIMARY KEY,
  traveler_id   TEXT NOT NULL REFERENCES users(id),
  from_city     TEXT NOT NULL REFERENCES cities(name),
  to_city       TEXT NOT NULL REFERENCES cities(name),
  depart_date   TEXT NOT NULL,
  depart_time   TEXT NOT NULL,
  duration      TEXT,
  price_mad     REAL NOT NULL CHECK (price_mad >= 0),
  seats         INTEGER NOT NULL CHECK (seats > 0),
  max_weight_kg REAL NOT NULL,
  vehicle       TEXT,
  pickup        TEXT,
  dropoff       TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'progress', 'completed', 'cancelled'))
);

-- Bookings (sender side) and incoming requests (traveler side) are the same record.
CREATE TABLE parcels (
  id              TEXT PRIMARY KEY,
  trip_id         TEXT NOT NULL REFERENCES trips(id),
  sender_id       TEXT NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL CHECK (type IN ('documents', 'small', 'medium', 'large')),
  content         TEXT,
  declared_value  REAL DEFAULT 0,
  weight_kg       REAL NOT NULL,
  length_cm       REAL, width_cm REAL, height_cm REAL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  recipient       TEXT NOT NULL,
  recipient_phone TEXT,
  pickup          TEXT,
  dropoff         TEXT,
  notes           TEXT,
  insurance       INTEGER NOT NULL DEFAULT 0,
  payment         TEXT CHECK (payment IN ('card', 'wallet', 'mobileWallet', 'cash')),
  price_mad       REAL NOT NULL,
  handoff_code    TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('awaiting', 'accepted', 'declined', 'transit', 'delivered', 'cancelled')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at    TEXT
);

CREATE TABLE addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  address    TEXT NOT NULL,
  city       TEXT REFERENCES cities(name),
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE reviews (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id),
  target_id   TEXT NOT NULL REFERENCES users(id),
  parcel_id   TEXT REFERENCES parcels(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  is_read     INTEGER NOT NULL DEFAULT 0,
  sent_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only last four digits are kept, like the app (no full numbers, no CVC).
CREATE TABLE payment_cards (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand      TEXT NOT NULL,
  last4      TEXT NOT NULL CHECK (length(last4) = 4),
  expiry     TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  parcel_id  TEXT REFERENCES parcels(id),
  kind       TEXT NOT NULL CHECK (kind IN ('topup', 'payment', 'refund', 'payout')),
  amount_mad REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  key        TEXT NOT NULL,
  body       TEXT,
  target     TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE support_tickets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  topic      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cash top-up at a payment agency: the app issues a reference, the user pays cash at the agency,
-- the agency confirms, then a 'topup' transaction credits the wallet.
CREATE TABLE cash_topups (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  network        TEXT NOT NULL CHECK (network IN ('Cash Plus', 'Wafacash', 'Barid Cash', 'Damane Cash')),
  reference      TEXT NOT NULL UNIQUE CHECK (length(reference) = 10),
  amount_mad     REAL NOT NULL CHECK (amount_mad BETWEEN 20 AND 5000),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at     TEXT NOT NULL,
  paid_at        TEXT,
  transaction_id TEXT REFERENCES transactions(id)
);

CREATE INDEX idx_trips_route    ON trips(from_city, to_city, depart_date);
CREATE INDEX idx_parcels_trip   ON parcels(trip_id);
CREATE INDEX idx_parcels_sender ON parcels(sender_id);
CREATE INDEX idx_messages_pair  ON messages(sender_id, receiver_id);

-- Convenience view: remaining seats per trip (same rule as freeSeats() in app.js).
CREATE VIEW trip_availability AS
SELECT t.id, t.from_city, t.to_city, t.depart_date, t.seats,
       t.seats - COALESCE(SUM(CASE WHEN p.status NOT IN ('cancelled', 'declined') THEN p.quantity END), 0) AS free_seats
FROM trips t LEFT JOIN parcels p ON p.trip_id = t.id
GROUP BY t.id;
