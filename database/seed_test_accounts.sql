-- Two dedicated test accounts that interact with each other:
--   U10  Test Sender   (sender.test@example.com)   sends parcels
--   U11  Test Traveler (traveler.test@example.com) publishes trips and carries them
-- Together they cover every trip status and every parcel status.

INSERT INTO users (id, name, email, phone, role, rating, review_count, vehicle, balance_mad, verified_id) VALUES
  ('U10', 'Test Sender',   'sender.test@example.com',   '+212 600 000 910', 'individual', 5.0, 1, NULL,                0,     1),
  ('U11', 'Test Traveler', 'traveler.test@example.com', '+212 600 000 911', 'individual', 5.0, 1, 'Dacia Sandero · blanc', 0, 1);

INSERT INTO addresses (id, user_id, label, address, city, is_default) VALUES
  ('A10', 'U10', 'Maison', '5 rue de Test, Maârif',  'Casablanca', 1),
  ('A11', 'U10', 'Bureau', 'Avenue de France, Agdal', 'Rabat',      0),
  ('A12', 'U11', 'Maison', '10 avenue Hassan II',     'Rabat',      1);

INSERT INTO payment_cards (id, user_id, brand, last4, expiry, is_default) VALUES
  ('C10', 'U10', 'Visa', '1111', '12/29', 1);

-- Traveler trips: one per status.
INSERT INTO trips (id, traveler_id, from_city, to_city, depart_date, depart_time, duration, price_mad, seats, max_weight_kg, vehicle, pickup, dropoff, notes, status) VALUES
  ('TT1', 'U11', 'Casablanca', 'Rabat',      date('now', '+1 day'), '09:00', '1h 30', 50,  3, 15, 'Dacia Sandero · blanc', 'Casablanca · Gare Casa-Port', 'Rabat · Gare Rabat-Ville', 'Test: trajet à venir.',   'upcoming'),
  ('TT2', 'U11', 'Rabat',      'Tanger',     date('now'),           '07:30', '3h',    90,  2, 10, 'Dacia Sandero · blanc', 'Rabat · Agdal',                'Tanger · Place de France', 'Test: trajet en cours.',  'progress'),
  ('TT3', 'U11', 'Marrakech',  'Casablanca', date('now', '-3 day'), '16:00', '3h 30', 110, 2, 10, 'Dacia Sandero · blanc', 'Marrakech · Guéliz',           'Casablanca · Maârif',      'Test: trajet terminé.',   'completed'),
  ('TT4', 'U11', 'Fès',        'Meknès',     date('now', '+4 day'), '18:00', '1h',    40,  2,  5, 'Dacia Sandero · blanc', 'Fès · Place Florence',         'Meknès · Bab Mansour',     'Test: trajet annulé.',    'cancelled');

-- Sender parcels on the traveler's trips: one per parcel status.
INSERT INTO parcels (id, trip_id, sender_id, type, content, declared_value, weight_kg, length_cm, width_cm, height_cm, quantity, recipient, recipient_phone, pickup, dropoff, notes, insurance, payment, price_mad, handoff_code, status, created_at, delivered_at) VALUES
  ('TS-AWAIT',   'TT1', 'U10', 'small',     'Test: en attente d’acceptation', 100, 2,   30, 20, 10, 1, 'Destinataire Test 1', '+212 600 000 921', '5 rue de Test, Maârif, Casablanca', 'Avenue de France, Agdal, Rabat', NULL,            0, 'card',         50,  '1001', 'awaiting',  datetime('now', '-1 hour'),  NULL),
  ('TS-ACCEPT',  'TT1', 'U10', 'documents', 'Test: accepté',                  0,   0.5, 32, 23, 2,  1, 'Destinataire Test 2', '+212 600 000 922', '5 rue de Test, Maârif, Casablanca', 'Avenue de France, Agdal, Rabat', NULL,            0, 'wallet',       50,  '1002', 'accepted',  datetime('now', '-5 hour'),  NULL),
  ('TS-DECLINE', 'TT1', 'U10', 'large',     'Test: refusé (trop lourd)',      300, 25,  80, 60, 50, 1, 'Destinataire Test 3', '+212 600 000 923', '5 rue de Test, Maârif, Casablanca', 'Avenue de France, Agdal, Rabat', 'Trop lourd.',   0, 'card',         50,  '1003', 'declined',  datetime('now', '-8 hour'),  NULL),
  ('TS-TRANSIT', 'TT2', 'U10', 'medium',    'Test: en route',                 200, 5,   45, 35, 25, 1, 'Destinataire Test 4', '+212 600 000 924', 'Avenue de France, Agdal, Rabat',    'Place de France, Tanger',        NULL,            1, 'card',         90,  '1004', 'transit',   datetime('now', '-1 day'),   NULL),
  ('TS-DONE',    'TT3', 'U10', 'small',     'Test: livré',                    150, 3,   30, 20, 15, 1, 'Destinataire Test 5', '+212 600 000 925', 'Guéliz, Marrakech',                 '5 rue de Test, Maârif, Casablanca', NULL,          0, 'mobileWallet', 110, '1005', 'delivered', datetime('now', '-4 day'),   datetime('now', '-3 day')),
  ('TS-CANCEL',  'TT4', 'U10', 'small',     'Test: annulé et remboursé',      80,  1,   25, 20, 10, 1, 'Destinataire Test 6', '+212 600 000 926', 'Place Florence, Fès',               'Bab Mansour, Meknès',            NULL,            0, 'wallet',       40,  '1006', 'cancelled', datetime('now', '-2 day'),   NULL);

-- Both directions of review on the delivered parcel.
INSERT INTO reviews (id, author_id, target_id, parcel_id, rating, comment, created_at) VALUES
  ('R10', 'U10', 'U11', 'TS-DONE', 5, 'Test: voyageur ponctuel.',     datetime('now', '-3 day')),
  ('R11', 'U11', 'U10', 'TS-DONE', 5, 'Test: colis bien emballé.',    datetime('now', '-3 day'));

INSERT INTO messages (sender_id, receiver_id, body, is_read, sent_at) VALUES
  ('U10', 'U11', 'Test: bonjour, pouvez-vous prendre mon colis demain ?', 1, datetime('now', '-6 hour')),
  ('U11', 'U10', 'Test: oui, demande acceptée pour TS-ACCEPT.',           1, datetime('now', '-5 hour')),
  ('U11', 'U10', 'Test: je suis en route vers Tanger avec TS-TRANSIT.',   0, datetime('now', '-20 minute'));

-- Wallet history. Sender: top-up 500, paid 50 + 90 + 110 + 40 by wallet/card, got 40 back. Traveler: payouts after 7% fee.
INSERT INTO transactions (id, user_id, parcel_id, kind, amount_mad, created_at) VALUES
  ('TX10', 'U10', NULL,         'topup',   500,   datetime('now', '-7 day')),
  ('TX11', 'U10', 'TS-DONE',    'payment', -110,  datetime('now', '-4 day')),
  ('TX12', 'U10', 'TS-CANCEL',  'payment', -40,   datetime('now', '-2 day')),
  ('TX13', 'U10', 'TS-CANCEL',  'refund',  40,    datetime('now', '-2 day')),
  ('TX14', 'U10', 'TS-TRANSIT', 'payment', -90,   datetime('now', '-1 day')),
  ('TX15', 'U10', 'TS-ACCEPT',  'payment', -50,   datetime('now', '-5 hour')),
  ('TX16', 'U11', 'TS-DONE',    'payout',  102.3, datetime('now', '-3 day'));

-- Balances = sum of transactions.
UPDATE users SET balance_mad = (SELECT SUM(amount_mad) FROM transactions WHERE user_id = users.id) WHERE id IN ('U10', 'U11');

INSERT INTO notifications (id, user_id, key, body, target, is_read, created_at) VALUES
  ('N10', 'U10', 'onRoad',           'Rabat → Tanger · #TS-TRANSIT', 'tracking/TS-TRANSIT', 0, datetime('now', '-20 minute')),
  ('N11', 'U10', 'newMessage',       'Test Traveler',                'messages',            0, datetime('now', '-20 minute')),
  ('N12', 'U10', 'paymentConfirmed', '50 MAD',                       'wallet',              1, datetime('now', '-5 hour')),
  ('N13', 'U11', 'newRequest',       'Casablanca → Rabat · #TS-AWAIT', 'request/TS-AWAIT',  0, datetime('now', '-1 hour')),
  ('N14', 'U11', 'paymentConfirmed', '102.3 MAD',                    'earnings',            1, datetime('now', '-3 day'));

INSERT INTO support_tickets (id, user_id, topic, message, status, created_at) VALUES
  ('S10', 'U10', 'payment',  'Test: vérifier le remboursement de TS-CANCEL.', 'closed', datetime('now', '-2 day')),
  ('S11', 'U11', 'delivery', 'Test: question sur la remise de TS-TRANSIT.',  'open',   datetime('now', '-1 hour'));

-- Test Sender cash top-ups, one per status. The 500 MAD top-up (TX10) was paid at Wafacash.
INSERT INTO cash_topups (id, user_id, network, reference, amount_mad, status, created_at, expires_at, paid_at, transaction_id) VALUES
  ('CT10', 'U10', 'Wafacash',    '1000000010', 500, 'paid',      datetime('now', '-8 day'),  datetime('now', '-6 day'),  datetime('now', '-7 day'), 'TX10'),
  ('CT11', 'U10', 'Cash Plus',   '1000000011', 200, 'pending',   datetime('now', '-1 hour'), datetime('now', '+47 hour'), NULL, NULL),
  ('CT12', 'U10', 'Barid Cash',  '1000000012', 100, 'expired',   datetime('now', '-5 day'),  datetime('now', '-3 day'),  NULL, NULL),
  ('CT13', 'U10', 'Damane Cash', '1000000013', 50,  'cancelled', datetime('now', '-4 day'),  datetime('now', '-2 day'),  NULL, NULL);
