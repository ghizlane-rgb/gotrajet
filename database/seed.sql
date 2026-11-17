-- GOTRAJET test seed data. Fictional people; phone numbers use the +212 600 000 xxx demo range.
-- Dates are relative to the day the database is built, like the browser demo.

INSERT INTO users (id, name, email, phone, role, rating, review_count, vehicle, balance_mad, verified_id) VALUES
  ('U0', 'Ikram Slimani', 'ikram@example.com',  '+212 600 000 000', 'individual', 4.8,   12, 'Dacia Logan · gris', 250, 1),
  ('U1', 'Youssef B.',    'youssef@example.com', '+212 600 000 107', 'individual', 4.9, 128, 'Toyota Auris',       0,   1),
  ('U2', 'Salma E.',      'salma@example.com',   '+212 600 000 105', 'individual', 4.8,  94, 'Renault Clio',       0,   1),
  ('U3', 'Amine K.',      'amine@example.com',   '+212 600 000 101', 'carrier',    4.7,  72, 'Peugeot Partner',    0,   1),
  ('U4', 'Nadia R.',      'nadia@example.com',   '+212 600 000 103', 'individual', 4.9,  61, 'Dacia Duster',       0,   1),
  ('U5', 'Karim T.',      'karim@example.com',   '+212 600 000 110', 'individual', 4.6,  18, NULL,                 0,   0);

INSERT INTO cities (name, lat, lng) VALUES
  ('Casablanca', 33.5731, -7.5898),
  ('Rabat',      34.0209, -6.8416),
  ('Marrakech',  31.6295, -7.9811),
  ('Agadir',     30.4278, -9.5981),
  ('Fès',        34.0181, -5.0078),
  ('Tanger',     35.7595, -5.8340),
  ('Oujda',      34.6814, -1.9086),
  ('Meknès',     33.8935, -5.5473);

-- Public trips (BASE_TRIPS) + Ikram's own traveler trips (SAMPLE_MY_TRIPS).
INSERT INTO trips (id, traveler_id, from_city, to_city, depart_date, depart_time, duration, price_mad, seats, max_weight_kg, vehicle, pickup, dropoff, notes, status) VALUES
  ('T1',  'U1', 'Casablanca', 'Rabat',     date('now', '+1 day'),  '10:30', '1h 30', 50,  3, 10, 'Toyota Auris',    NULL, NULL, NULL, 'upcoming'),
  ('T2',  'U2', 'Marrakech',  'Agadir',    date('now', '+1 day'),  '08:00', '3h 45', 80,  2,  5, 'Renault Clio',    NULL, NULL, NULL, 'upcoming'),
  ('T3',  'U3', 'Fès',        'Tanger',    date('now', '+1 day'),  '14:00', '4h 20', 100, 4, 20, 'Peugeot Partner', NULL, NULL, NULL, 'upcoming'),
  ('T4',  'U1', 'Casablanca', 'Marrakech', date('now', '+1 day'),  '08:00', '3h 30', 120, 3, 10, 'Toyota Auris',    NULL, NULL, NULL, 'upcoming'),
  ('T5',  'U2', 'Casablanca', 'Marrakech', date('now', '+1 day'),  '09:30', '3h 30', 135, 2, 10, 'Renault Clio',    NULL, NULL, NULL, 'upcoming'),
  ('T6',  'U3', 'Casablanca', 'Marrakech', date('now', '+1 day'),  '11:15', '3h 45', 110, 4,  5, 'Peugeot Partner', NULL, NULL, NULL, 'upcoming'),
  ('T7',  'U4', 'Casablanca', 'Marrakech', date('now', '+1 day'),  '13:00', '3h 30', 145, 2, 20, 'Dacia Duster',    NULL, NULL, NULL, 'upcoming'),
  ('T8',  'U2', 'Rabat',      'Agadir',    date('now', '+2 day'),  '10:30', '6h',    150, 3, 10, 'Renault Clio',    NULL, NULL, NULL, 'upcoming'),
  ('T9',  'U1', 'Rabat',      'Casablanca',date('now', '+1 day'),  '09:30', '1h 30', 50,  3, 10, 'Toyota Auris',    NULL, NULL, NULL, 'upcoming'),
  ('MT1', 'U0', 'Casablanca', 'Marrakech', date('now', '+2 day'),  '08:30', '3h 30', 60,  4, 20, 'Dacia Logan · gris', 'Casablanca · Gare Casa-Voyageurs', 'Marrakech · Gare routière Bab Doukkala', 'Départ ponctuel, colis bien emballés svp.', 'upcoming'),
  ('MT2', 'U0', 'Rabat',      'Fès',       date('now', '-6 day'),  '17:00', '2h 45', 70,  3, 15, 'Dacia Logan · gris', 'Rabat · Agdal, avenue de France', 'Fès · Place Florence', NULL, 'completed');

-- Ikram's shipments (sampleParcels) + incoming requests on Ikram's trips (SAMPLE_INCOMING).
INSERT INTO parcels (id, trip_id, sender_id, type, content, declared_value, weight_kg, length_cm, width_cm, height_cm, quantity, recipient, recipient_phone, pickup, dropoff, notes, insurance, payment, price_mad, handoff_code, status, created_at, delivered_at) VALUES
  ('GJ2048', 'T1',  'U0', 'documents', 'Documents',               0,   3,   32, 23, 3,  1, 'Hind A.',    '+212 600 000 201', '18 boulevard d’Anfa, Casablanca',       '7 rue Patrice Lumumba, Rabat',          'Enveloppe A4, ne pas plier.',        0, 'card',         50,  '2048', 'transit',   datetime('now', '-1 day'),  NULL),
  ('GJ1984', 'T2',  'U0', 'small',     'Livres',                  150, 2,   30, 20, 15, 1, 'Rachid L.',  '+212 600 000 202', 'Guéliz, avenue Mohammed V, Marrakech',  'Talborjt, Agadir',                      NULL,                                 1, 'wallet',       80,  '1984', 'delivered', datetime('now', '-3 day'),  datetime('now', '-2 day')),
  ('GJ1920', 'T3',  'U0', 'medium',    'Vêtements',               250, 4,   45, 35, 25, 1, 'Imane T.',   '+212 600 000 203', 'Fès el-Jadid, Fès',                     'Boulevard Pasteur, Tanger',             NULL,                                 0, 'mobileWallet', 100, '1920', 'delivered', datetime('now', '-6 day'),  datetime('now', '-5 day')),
  ('RQ-A1',  'MT1', 'U3', 'small',     'Livres et documents',     300, 4,   35, 25, 20, 1, 'Khadija M.', '+212 600 000 102', '12 rue Ibn Batouta, Casablanca',        '45 avenue Mohammed V, Marrakech',       'Fragile, garder à plat.',            1, 'card',         60,  '3417', 'awaiting',  datetime('now', '-2 hour'), NULL),
  ('RQ-A2',  'MT1', 'U4', 'medium',    'Vêtements',               450, 8,   50, 40, 30, 1, 'Omar B.',    '+212 600 000 104', 'Maârif, rue Abou Bakr Seddik, Casablanca', 'Guéliz, rue de la Liberté, Marrakech', NULL,                                 0, 'wallet',       60,  '5821', 'accepted',  datetime('now', '-20 hour'), NULL),
  ('RQ-A3',  'MT1', 'U2', 'documents', 'Contrat signé (original)', 0,  0.5, 32, 23, 2,  1, 'Yassine H.', '+212 600 000 106', 'Casablanca · Gare Casa-Voyageurs',      'Marrakech · Gare routière Bab Doukkala', 'Remettre en main propre uniquement.', 0, 'cash',         60,  '9024', 'awaiting',  datetime('now', '-1 hour'), NULL),
  ('RQ-B1',  'MT2', 'U1', 'small',     'Produits artisanaux',     200, 3,   30, 20, 15, 1, 'Fatima Z.',  '+212 600 000 108', 'Hay Riad, Rabat',                       'Fès el-Bali, Fès',                      NULL,                                 0, 'card',         70,  '1102', 'delivered', datetime('now', '-150 hour'), datetime('now', '-6 day')),
  ('RQ-B2',  'MT2', 'U5', 'medium',    'Pièces automobiles',      600, 6,   45, 35, 25, 1, 'Saïd O.',    '+212 600 000 111', 'Agdal, Rabat',                          'Route d’Imouzzer, Fès',                 'Lourd d’un côté.',                   1, 'mobileWallet', 70,  '7730', 'delivered', datetime('now', '-152 hour'), datetime('now', '-6 day'));

INSERT INTO addresses (id, user_id, label, address, city, is_default) VALUES
  ('A1', 'U0', 'Maison',  '18 boulevard d’Anfa',       'Casablanca', 1),
  ('A2', 'U0', 'Bureau',  'Twin Center, Maârif',       'Casablanca', 0),
  ('A3', 'U0', 'Parents', '7 rue Patrice Lumumba',     'Rabat',      0);

INSERT INTO reviews (id, author_id, target_id, parcel_id, rating, comment, created_at) VALUES
  ('R1', 'U0', 'U2', 'GJ1984', 4, 'Colis bien préparé. Merci pour votre confiance !',               datetime('now', '-2 day')),
  ('R2', 'U0', 'U3', 'GJ1920', 5, 'Remise ponctuelle et communication très agréable.',             datetime('now', '-5 day')),
  ('R3', 'U1', 'U0', 'RQ-B1',  5, 'Mon colis est arrivé le soir même. Simple, rapide et rassurant.', datetime('now', '-6 day')),
  ('R4', 'U5', 'U0', 'RQ-B2',  4, 'Bon contact, livraison soignée.',                                datetime('now', '-6 day'));

INSERT INTO messages (sender_id, receiver_id, body, is_read, sent_at) VALUES
  ('U0', 'U1', 'Bonjour Youssef, je peux déposer l’enveloppe à 10h ?', 1, datetime('now', '-26 hour')),
  ('U1', 'U0', 'Oui parfait, rendez-vous boulevard d’Anfa.',          1, datetime('now', '-25 hour')),
  ('U1', 'U0', 'Je suis en route vers Rabat, arrivée vers 12h.',      0, datetime('now', '-30 minute')),
  ('U3', 'U0', 'Bonjour, mon colis est fragile, merci d’en prendre soin.', 0, datetime('now', '-2 hour')),
  ('U4', 'U0', 'Merci d’avoir accepté ma demande !',                  1, datetime('now', '-19 hour'));

INSERT INTO payment_cards (id, user_id, brand, last4, expiry, is_default) VALUES
  ('C1', 'U0', 'Visa',       '4242', '12/28', 1),
  ('C2', 'U0', 'Mastercard', '4444', '06/27', 0);

INSERT INTO transactions (id, user_id, parcel_id, kind, amount_mad, created_at) VALUES
  ('TX1', 'U0', NULL,     'topup',   300,  datetime('now', '-10 day')),
  ('TX2', 'U0', 'GJ1984', 'payment', -80,  datetime('now', '-3 day')),
  ('TX3', 'U0', 'GJ2048', 'payment', -50,  datetime('now', '-1 day')),
  ('TX4', 'U0', NULL,     'topup',   80,   datetime('now', '-1 day')),
  ('TX5', 'U0', 'RQ-B1',  'payout',  65.1, datetime('now', '-5 day')),
  ('TX6', 'U0', 'RQ-B2',  'payout',  65.1, datetime('now', '-5 day'));

INSERT INTO notifications (id, user_id, key, body, target, is_read, created_at) VALUES
  ('N1', 'U0', 'onRoad',           'Casablanca → Rabat · #GJ2048', 'tracking/GJ2048', 0, datetime('now', '-30 minute')),
  ('N2', 'U0', 'newMessage',       'Youssef B.',                   'messages',        0, datetime('now', '-30 minute')),
  ('N3', 'U0', 'tripAvailable',    'Casablanca → Marrakech',       'results',         1, datetime('now', '-1 day')),
  ('N4', 'U0', 'paymentConfirmed', '120 MAD',                      'wallet',          1, datetime('now', '-3 day'));

INSERT INTO support_tickets (id, user_id, topic, message, status, created_at) VALUES
  ('S1', 'U0', 'payment',  'Le remboursement de test n’apparaît pas encore.', 'open',   datetime('now', '-1 day')),
  ('S2', 'U0', 'delivery', 'Question sur le code de remise du colis GJ1984.', 'closed', datetime('now', '-4 day'));

-- Ikram's 80 MAD top-up (TX4) was paid in cash at a Cash Plus agency.
INSERT INTO cash_topups (id, user_id, network, reference, amount_mad, status, created_at, expires_at, paid_at, transaction_id) VALUES
  ('CT1', 'U0', 'Cash Plus', '4513017563', 80, 'paid', datetime('now', '-2 day'), datetime('now', '+0 day'), datetime('now', '-1 day'), 'TX4');
