CREATE TEMP TABLE user_id_map (old_id TEXT PRIMARY KEY, new_id INTEGER NOT NULL UNIQUE);
INSERT INTO user_id_map (old_id, new_id)
SELECT id, row_number() OVER (ORDER BY rowid) FROM user;

CREATE TABLE user_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE CHECK (length(trim(username)) > 0),
    password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
    created_at TEXT NOT NULL
) STRICT;
INSERT INTO user_new (id, username, password_hash, created_at)
SELECT m.new_id, u.username, u.password_hash, u.created_at
FROM user u JOIN user_id_map m ON m.old_id = u.id;

CREATE TABLE agenda_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    color TEXT NOT NULL DEFAULT '#3b82f6'
        CHECK (length(color) = 7 AND substr(color, 1, 1) = '#'
            AND substr(color, 2) NOT GLOB '*[^0-9a-fA-F]*'),
    owner_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
) STRICT;
INSERT INTO agenda_new (id, name, color, owner_id, created_at)
SELECT a.id, a.name, a.color, m.new_id, a.created_at
FROM agenda a JOIN user_id_map m ON m.old_id = a.owner_id;

DROP TABLE agenda;
DROP TABLE user;
ALTER TABLE user_new RENAME TO user;
ALTER TABLE agenda_new RENAME TO agenda;
DROP TABLE user_id_map;
