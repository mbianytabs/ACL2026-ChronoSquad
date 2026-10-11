CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE CHECK (length(trim(username)) > 0),
    password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS agenda (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    color TEXT NOT NULL DEFAULT '#3b82f6'
        CHECK (length(color) = 7 AND substr(color, 1, 1) = '#'
            AND substr(color, 2) NOT GLOB '*[^0-9a-fA-F]*'),
    owner_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS rendezvous (
    id TEXT PRIMARY KEY NOT NULL,
    agenda_id TEXT NOT NULL REFERENCES agenda(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    start TEXT NOT NULL CHECK (julianday(start) IS NOT NULL),
    end TEXT NOT NULL CHECK (julianday(end) IS NOT NULL AND julianday(end) > julianday(start)),
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX IF NOT EXISTS agenda_owner_idx ON agenda(owner_id);
CREATE INDEX IF NOT EXISTS rendezvous_agenda_start_idx ON rendezvous(agenda_id, start);
