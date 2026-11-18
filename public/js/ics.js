/* =========================================================
   LECTURE D'UN FICHIER .ICS (iCalendar, RFC 5545)
   ---------------------------------------------------------
   Transforme le texte d'un fichier .ics (Apple Calendar,
   Google Agenda, Outlook…) en données au format de
   ChronoSquad :

   {
       name:  'Nom du calendrier' | null,
       color: '#rrggbb' | null,
       evenements: [
           {
               title, start, end,          // ISO 8601
               location, description,
               recurrenceFrequency,        // daily|weekly|monthly|yearly|null
               recurrenceEndDate           // YYYY-MM-DD|null
           }
       ],
       warnings: [ 'message', ... ]
   }

   Tout se fait dans le navigateur : aucun appel serveur.
   ========================================================= */

const IcsParser = (() => {

    const FREQUENCIES = {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        YEARLY: 'yearly'
    };

    const DEFAULT_DURATION_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;

    class IcsError extends Error {}


    /* ---------- Lignes et propriétés ---------- */

    // RFC 5545 §3.1 : une ligne longue est « pliée » en
    // plusieurs lignes commençant par un espace ou une tabulation.
    function unfold(text) {
        return text
            .replace(/^﻿/, '')
            .replace(/\r\n|\r/g, '\n')
            .replace(/\n[ \t]/g, '')
            .split('\n')
            .filter((line) => line.trim() !== '');
    }

    // « DTSTART;TZID=Europe/Paris:20261118T090000 »
    //   → { name: 'DTSTART', params: { TZID: 'Europe/Paris' }, value: '20261118T090000' }
    function parseLine(line) {
        let i = 0;
        let inQuotes = false;

        for (; i < line.length; i++) {
            const c = line[i];

            if (c === '"') inQuotes = !inQuotes;
            else if (c === ':' && !inQuotes) break;
        }

        const head = line.slice(0, i);
        const value = line.slice(i + 1);
        const [name, ...rawParams] = head.split(';');
        const params = {};

        for (const p of rawParams) {
            const eq = p.indexOf('=');

            if (eq > 0) {
                params[p.slice(0, eq).toUpperCase()] =
                    p.slice(eq + 1).replace(/^"|"$/g, '');
            }
        }

        return { name: name.toUpperCase(), params, value };
    }

    function unescapeText(value) {
        return value.replace(/\\([nN,;\\])/g, (_, c) =>
            c === 'n' || c === 'N' ? '\n' : c
        );
    }


    /* ---------- Dates ---------- */

    // Décalage (ms) d'un fuseau IANA à un instant donné.
    function zoneOffset(utcMs, timeZone) {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).formatToParts(new Date(utcMs));

        const get = (type) =>
            Number(parts.find((p) => p.type === type).value);

        const asUtc = Date.UTC(
            get('year'), get('month') - 1, get('day'),
            get('hour'), get('minute'), get('second')
        );

        return asUtc - utcMs;
    }

    // Heure « murale » dans un fuseau → instant UTC.
    function zonedToDate(y, mo, d, h, mi, s, timeZone) {
        const wall = Date.UTC(y, mo, d, h, mi, s);

        try {
            let utc = wall - zoneOffset(wall, timeZone);
            utc = wall - zoneOffset(utc, timeZone);

            return new Date(utc);
        } catch (e) {
            // Fuseau inconnu (ex. nom Windows) : heure locale.
            return null;
        }
    }

    // Renvoie { date: Date, allDay: boolean } ou null.
    function parseDate(prop) {
        if (!prop) return null;

        const value = prop.value.trim();
        const m = value.match(
            /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/
        );

        if (!m) return null;

        const [, y, mo, d, h, mi, s, z] = m;
        const Y = +y, M = +mo - 1, D = +d;

        if (h === undefined || prop.params.VALUE === 'DATE') {
            return { date: new Date(Y, M, D), allDay: true };
        }

        const H = +h, MI = +mi, S = +(s || 0);

        if (z) {
            return { date: new Date(Date.UTC(Y, M, D, H, MI, S)), allDay: false };
        }

        if (prop.params.TZID) {
            const zoned = zonedToDate(Y, M, D, H, MI, S, prop.params.TZID);

            if (zoned) return { date: zoned, allDay: false };
        }

        // Heure « flottante » : heure locale du navigateur.
        return { date: new Date(Y, M, D, H, MI, S), allDay: false };
    }

    // « P1DT2H30M », « PT45M », « P1W » → millisecondes.
    function parseDuration(value) {
        const m = (value || '').match(
            /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
        );

        if (!m) return null;

        const [, sign, w, d, h, mi, s] = m;
        const ms =
            (+(w || 0) * 7 * DAY_MS) +
            (+(d || 0) * DAY_MS) +
            (+(h || 0) * 3600000) +
            (+(mi || 0) * 60000) +
            (+(s || 0) * 1000);

        return sign === '-' ? -ms : ms;
    }

    function toDateOnly(date) {
        const pad = (n) => String(n).padStart(2, '0');

        return date.getFullYear()
            + '-' + pad(date.getMonth() + 1)
            + '-' + pad(date.getDate());
    }

    // Date de la n-ième occurrence (COUNT) d'une récurrence simple.
    function nthOccurrence(start, frequency, interval, n) {
        const d = new Date(start);
        const steps = (n - 1) * interval;

        if (frequency === 'daily') d.setDate(d.getDate() + steps);
        else if (frequency === 'weekly') d.setDate(d.getDate() + 7 * steps);
        else if (frequency === 'monthly') d.setMonth(d.getMonth() + steps);
        else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + steps);

        return d;
    }


    /* ---------- Récurrence ---------- */

    function parseRrule(value, start, warn) {
        const rule = {};

        for (const part of value.split(';')) {
            const [k, v] = part.split('=');

            if (k && v !== undefined) rule[k.toUpperCase()] = v;
        }

        const frequency = FREQUENCIES[(rule.FREQ || '').toUpperCase()];

        if (!frequency) {
            warn('une récurrence non prise en charge (' + (rule.FREQ || '?') + ') a été ignorée');

            return { recurrenceFrequency: null, recurrenceEndDate: null };
        }

        const interval = Math.max(1, parseInt(rule.INTERVAL, 10) || 1);

        if (interval > 1) {
            warn('certaines récurrences « toutes les N périodes » ont été simplifiées');
        }

        if (Object.keys(rule).some((k) => k.startsWith('BY'))) {
            warn('certaines règles de récurrence avancées (jours précis, etc.) ont été simplifiées');
        }

        let recurrenceEndDate = null;

        if (rule.UNTIL) {
            const until = parseDate({ value: rule.UNTIL, params: {} });

            if (until) recurrenceEndDate = toDateOnly(until.date);

        } else if (rule.COUNT) {
            const count = parseInt(rule.COUNT, 10);

            if (count > 0) {
                recurrenceEndDate = toDateOnly(
                    nthOccurrence(start, frequency, interval, count)
                );
            }
        }

        if (recurrenceEndDate && recurrenceEndDate < toDateOnly(start)) {
            recurrenceEndDate = toDateOnly(start);
        }

        return { recurrenceFrequency: frequency, recurrenceEndDate };
    }


    /* ---------- Événement ---------- */

    function buildEvenement(props, warn) {
        const first = (name) => props.find((p) => p.name === name);

        if (first('RECURRENCE-ID')) {
            warn('des modifications ponctuelles d\'occurrences récurrentes ont été ignorées');

            return null;
        }

        if ((first('STATUS')?.value || '').toUpperCase() === 'CANCELLED') {
            return null;
        }

        const start = parseDate(first('DTSTART'));

        if (!start) {
            warn('un événement sans date de début a été ignoré');

            return null;
        }

        let end = parseDate(first('DTEND'))?.date || null;

        if (!end && first('DURATION')) {
            const ms = parseDuration(first('DURATION').value);

            if (ms !== null) end = new Date(start.date.getTime() + ms);
        }

        if (!end) {
            end = new Date(
                start.date.getTime() + (start.allDay ? DAY_MS : DEFAULT_DURATION_MS)
            );
        }

        // ChronoSquad exige fin > début.
        if (end <= start.date) {
            end = new Date(start.date.getTime() + DEFAULT_DURATION_MS);
        }

        const title =
            unescapeText(first('SUMMARY')?.value || '').trim() || 'Sans titre';

        const recurrence = first('RRULE')
            ? parseRrule(first('RRULE').value, start.date, warn)
            : { recurrenceFrequency: null, recurrenceEndDate: null };

        return {
            title,
            start: start.date.toISOString(),
            end: end.toISOString(),
            location: unescapeText(first('LOCATION')?.value || '').trim(),
            description: unescapeText(first('DESCRIPTION')?.value || '').trim(),
            recurrenceFrequency: recurrence.recurrenceFrequency,
            recurrenceEndDate: recurrence.recurrenceEndDate
        };
    }


    /* ---------- Couleur ---------- */

    function parseColor(value) {
        const m = (value || '').trim().match(/^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);

        return m ? '#' + m[1].toLowerCase() : null;
    }


    /* ---------- Point d'entrée ---------- */

    function parse(text) {
        if (typeof text !== 'string' || !/BEGIN:VCALENDAR/i.test(text)) {
            throw new IcsError('Ce fichier n\'est pas un calendrier .ics valide.');
        }

        const warnings = new Set();
        const warn = (message) => warnings.add(message);

        let name = null;
        let color = null;
        let current = null;
        let depth = 0;
        const evenements = [];

        for (const line of unfold(text)) {
            const prop = parseLine(line);
            const value = prop.value.trim().toUpperCase();

            if (prop.name === 'BEGIN') {
                if (value === 'VEVENT' && current === null) {
                    current = [];
                    depth = 0;
                } else if (current !== null) {
                    depth++; // VALARM… à l'intérieur d'un VEVENT
                }
                continue;
            }

            if (prop.name === 'END') {
                if (current !== null) {
                    if (depth > 0) {
                        depth--;
                    } else if (value === 'VEVENT') {
                        const ev = buildEvenement(current, warn);

                        if (ev) evenements.push(ev);

                        current = null;
                    }
                }
                continue;
            }

            if (current !== null) {
                if (depth === 0) current.push(prop);
                continue;
            }

            if (prop.name === 'X-WR-CALNAME' && !name) {
                name = unescapeText(prop.value).trim() || null;
            } else if (
                (prop.name === 'X-APPLE-CALENDAR-COLOR' || prop.name === 'X-WR-CALCOLOR')
                && !color
            ) {
                color = parseColor(prop.value);
            }
        }

        evenements.sort((a, b) => a.start.localeCompare(b.start));

        return { name, color, evenements, warnings: [...warnings] };
    }

    return { parse, IcsError };
})();
