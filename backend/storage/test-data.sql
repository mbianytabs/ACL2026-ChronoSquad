-- Données de démonstration utilisées par GET /api/test/user-agenda.
-- Les CREATE TABLE sont dans schema.sql, exécuté avant ce fichier.
-- Mot de passe de démonstration : sqlite-demo-123 (stocké sous forme Argon2).
-- Relancer le serveur ne crée pas de doublons et ne remplace pas les données.
INSERT INTO user (id, username, password_hash, created_at)
VALUES (
    'test-user',
    'sqlite_demo',
    '$argon2id$v=19$m=65536,t=3,p=4$EllNetScpN7JgqeC2iEHYA$G0/QIOm3AVM/7Wvnnyw9j9b9xC8cJ1ELspB2YktkqqU',
    '2026-10-11T10:00:00.000Z'
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO agenda (id, name, color, owner_id, created_at)
VALUES (
    'test-agenda',
    'Agenda de démonstration SQLite',
    '#3b82f6',
    'test-user',
    '2026-10-11T10:00:00.000Z'
)
ON CONFLICT(id) DO NOTHING;
