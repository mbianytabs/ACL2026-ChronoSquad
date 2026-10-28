
-- Migration 004 : ajout des informations de récurrence des événements.
-- Cette migration ajoute la fréquence et la date de fin de récurrence.

ALTER TABLE evenement
ADD COLUMN recurrence_frequency TEXT
CHECK (
    recurrence_frequency IS NULL
    OR recurrence_frequency IN ('daily', 'weekly', 'monthly')
);

ALTER TABLE evenement
ADD COLUMN recurrence_end_date TEXT
CHECK (
    recurrence_end_date IS NULL
    OR (
        date(recurrence_end_date) IS NOT NULL
        AND date(recurrence_end_date) = recurrence_end_date
    )
);
