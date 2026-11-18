
-- Migration 005 : ajout de la récurrence annuelle.
-- Recréation de la table pour mettre à jour la contrainte CHECK.


CREATE TABLE evenement_nouveau (
    id TEXT PRIMARY KEY NOT NULL,
    agenda_id TEXT NOT NULL REFERENCES agenda(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    start TEXT NOT NULL CHECK (julianday(start) IS NOT NULL),
    end TEXT NOT NULL CHECK (
        julianday(end) IS NOT NULL
        AND julianday(end) > julianday(start)
    ),
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    recurrence_frequency TEXT
        CHECK (
            recurrence_frequency IS NULL
            OR recurrence_frequency IN (
                'daily',
                'weekly',
                'monthly',
                'yearly'
            )
        ),
    recurrence_end_date TEXT
        CHECK (
            recurrence_end_date IS NULL
            OR (
                date(recurrence_end_date) IS NOT NULL
                AND date(recurrence_end_date) = recurrence_end_date
            )
        )
) STRICT;

-- Copier toutes les données existantes.
INSERT INTO evenement_nouveau (
    id,
    agenda_id,
    title,
    start,
    end,
    location,
    description,
    recurrence_frequency,
    recurrence_end_date
)
SELECT
    id,
    agenda_id,
    title,
    start,
    end,
    location,
    description,
    recurrence_frequency,
    recurrence_end_date
FROM evenement;

-- Remplacer l'ancienne table par la nouvelle.
DROP TABLE evenement;

ALTER TABLE evenement_nouveau RENAME TO evenement;

-- Recréer l'index de recherche des événements d'un agenda.
CREATE INDEX evenement_agenda_start_idx
    ON evenement(agenda_id, start);

